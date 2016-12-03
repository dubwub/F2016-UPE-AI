/*
  HIGHISH LEVEL OVERVIEW (Handler.js)

  Handler objects interface between AIs, MongoDB and the actual Game logic on the server
  After the server realizes a move is being submitted for an ongoing game, it will send the move to the corresponding handler
  which will then pass it off to the game logic and make sure Mongo is updated after.

  How these are referenced:
  When a match is created in /modules/games/controller/games.server.controller.js, they create a new Handler for the new
  Game that has just started. Handlers are then referenced on submission calls through the use of an associative array
  (JS's answer to a hashmap).

  How these work:
  These connect the server game logic (Games and Players), and serve as the functionality beyond the game for any particular game.
  For instance, this handles the first level of POST request, and calculates elos for post-match.
*/

var mongoose = require('mongoose'),
  Game = mongoose.model('Game'),
  Player = mongoose.model('Player'),
  Elo = require('elo-rank')(32);

// handlers = hashmap of all handlers by game_ids
// people = list of person ids
// CLass contains the js classes defined in /modules/game/class
// reses is the res objects sent from matchmaking
// callback, used currently exclusively for error messaging
// practice = true if the player is playing vs AI, false otherwise
// if practice == true, people[1] = null and reses[1] = null
var Handler = function Handler(handlers, people, Class, reses, callback, practice) {
  this.handlers = handlers;
  this.practice = practice;
  this.Class = Class;
  this.people = people;
  this.players = [];
  this.game = new Class.Game();
  this.requests = reses;

  for (var i = 0; i < 2; i++) {
    var player = new Class.Player(i, this.game.boardSize); // create new players using input data, then save them (add validation)
    player.person = people[i];
    player.save(function(err) {
      if (err) console.log(err);
    });
    this.players.push(player); // Handlers keep player objects in memory
  }
  this.game.attachPlayers(people, this.players);
  this.game.save(function(err) {
    if (err) console.log(err);
  });
  this.id = this.game.getID();
  this.moveNumber = 0;
  this.lastMoveTime = Date.now();
  var firstPlayerIndex = this.game.moveOrder[this.game.moveIterator]; // send message out to the first player to move
  this.requests[firstPlayerIndex].json(this.game.sanitizedForm(firstPlayerIndex));
  this.requests[firstPlayerIndex] = null;
  var that = this; // javascript freaking sucks
  setTimeout(function() { that.checkTimeout(); }, 15000);
  return this;
};

/*
  Below are helper functions called when the game ends that first finds the first player in Mongo, then finds the second
  player in Mongo, then calculates what their elos should be, and saves.
*/
function calculateElosAndUpdate(user0, user1, winnerIndex) {
  var expectedScore0 = Elo.getExpected(user0.elo, user1.elo);
  var expectedScore1 = Elo.getExpected(user1.elo, user0.elo);
  // update score, 1 if won 0 if lost
  if (winnerIndex === -1) {
    user0.elo = Elo.updateRating(expectedScore0, 0.5, user0.elo);
    user1.elo = Elo.updateRating(expectedScore1, 0.5, user1.elo);
  } else if (winnerIndex === 0) {
    user0.elo = Elo.updateRating(expectedScore0, 1, user0.elo);
    user1.elo = Elo.updateRating(expectedScore1, 0, user1.elo);
  } else if (winnerIndex === 1) {
    user0.elo = Elo.updateRating(expectedScore0, 0, user0.elo);
    user1.elo = Elo.updateRating(expectedScore1, 1, user1.elo);
  }
  // console.log('done calculating, new elos: ' + user0.elo + ', ' + user1.elo);
  user0.save();
  user1.save();
}

function findSecondUser(Class, user0, id1, winnerIndex) {
  Class.User.findById(id1).populate('users').exec(function (err, user1) {
    if (err) {
      console.log(err);
    } else if (!user1) {
      console.log('Tried to update rating, but personID ' + id1 + ' but couldn\'t find it');
    }
    calculateElosAndUpdate(user0, user1, winnerIndex);
  });
}

function findFirstUser(Class, id0, id1, winnerIndex) {
  Class.User.findById(id0).populate('users').exec(function (err, user0) {
    if (err) {
      console.log(err);
    } else if (!user0) {
      console.log('Tried to update rating, but personID ' + this.players[0].person + ' but couldn\'t find it');
    }
    findSecondUser(Class, user0, id1, winnerIndex);
  });
}

function addQualified(Class, id) {
  Class.User.findById(id).populate('users').exec(function (err, user) {
    if (err) {
      console.log(err);
    } else if (!user) {
      console.log('Tried to update qualified, personID ' + this.players[0].person + ' but couldn\'t find it');
    }
    user.qualified = true;
    user.save();
  });
}

Handler.prototype =
{
  Class: null,
  id: "", // represents the gameID of the game this Handler handles
  game: null, // the actual game object this Handler handles
  people: [], // list of people IDs
  players: [], // list of player objects
  handlers: null,
  requests: [null, null], // list of requests sent in
  practice: false, // is this person playing against the AI?
  lastMoveTime: null, // only used for timeout purposes
  moveNumber: 0,
  checkTimeout: function() { // after 5seconds, if the player hasn't moved yet, abort the game if short enough game or otherwise award victory
    if (this.game.state !== 'in progress') return;
    if (Date.now() - this.lastMoveTime >= 14999) { // timed out!
      delete this.handlers[this.id];
      if (this.moveNumber < 3) { // if it's early enough, abort the game
        this.game.state = 'aborted';
        this.game.winnerIndex = -1;
        // don't update elos on abort
      } else if (this.game.moveOrder[this.game.moveIterator] === 0) {
        this.game.state = 'complete';
        this.game.winnerIndex = 1;
        if (!this.practice) findFirstUser(this.Class, this.players[0].person, this.players[1].person, this.game.winnerIndex);
      } else if (this.game.moveOrder[this.game.moveIterator] === 1) {
        this.game.state = 'complete';
        this.game.winnerIndex = 0;
        if (!this.practice) findFirstUser(this.Class, this.players[0].person, this.players[1].person, this.game.winnerIndex);
      }
      this.game.save();
      if (this.requests[0] !== null) this.requests[0].json(this.game.sanitizedForm(0));
      if (!this.practice && this.requests[1] !== null) this.requests[1].json(this.game.sanitizedForm(1));
      this.requests[0] = null;
      if (!this.practice) this.requests[1] = null;
    } else {
      // console.log(Date.now());
      // console.log(this.lastMoveTime);
    }
  },
  submitMove: function(new_move, playerID, devkey, res) {
    var that = this;
    var timeoutFunc = function() { that.checkTimeout(); }; // used after submission, put here because you can't define funcs in a loop
    for (var i = 0; i < this.players.length; i++) {
      if ((i === 1 && devkey === null && this.practice && this.game.moveOrder[this.game.moveIterator] === 1) ||
        (this.players[i].getID().toString() === playerID && this.people[i].toString() === devkey)) {
        this.moveNumber++;
        this.lastMoveTime = Date.now();
        this.requests[i] = res;
        var returnJSON = this.game.submit(i, new_move);
        var nextPlayer = this.game.moveOrder[this.game.moveIterator];
        // check winnerIndex, if === -2, game is ongoing otherwise finish
        if (this.game.winnerIndex === -1 || this.game.winnerIndex >= 0) { // finish the game
          // if (this.practice && this.game.winnerIndex === 0) { // enable this if statement to run quals
          //   addQualified(this.Class, this.players[0].person);
          // }
          if (this.players[0].person !== this.players[1].person && !this.practice) // if someone plays themselves, no elo update
            findFirstUser(this.Class, this.players[0].person, this.players[1].person, this.game.winnerIndex);
          delete this.handlers[this.id];
          this.requests[0].json(this.game.sanitizedForm(0));
          if (!this.practice) this.requests[1].json(this.game.sanitizedForm(1));
          this.requests[0] = null;
          if (!this.practice) this.requests[1] = null;
        } else {
          if (this.practice === true && this.game.moveOrder[this.game.moveIterator] === 1) { // AI always goes second
            this.submitMove(this.Class.AI.getMove(this.game), this.players[1]._id, null, null);
          } else {
            if (this.requests[nextPlayer] === null) console.log('null res when trying to respond? ' + this.game.moveIterator);
            this.requests[nextPlayer].json(this.game.sanitizedForm(nextPlayer));
            this.requests[nextPlayer] = null;
          }
          this.lastMoveTime = Date.now();
          setTimeout(timeoutFunc, 15000);
          // callback(returnJSON.err, returnJSON);
          // TODO: do we need a callback?
        }
        break;
      }
    }
  }
};

if (typeof module !== 'undefined') { // allows frontend to access this class
  module.exports = Handler;
}
