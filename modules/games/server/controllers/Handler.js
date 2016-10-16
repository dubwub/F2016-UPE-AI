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

var Handler = function Handler(handlers, people, Class, reses, callback) { // TODO: CALLBACK NOT USED
  this.handlers = handlers;
  this.Class = Class;
  this.people = people;
  this.game = new Class.Game();
  this.requests = reses;

  for (var i = 0; i < people.length; i++) {
    var player = new Class.Player(i, this.game.boardSize); // create new players using input data, then save them (add validation)
    player.person = people[i];
    player.save(function(err) {
      if (err) console.log(err);
    });
    // players.push(player.getID());
    this.players.push(player); // handlers keep player objects in memory
  }
  this.game.attachPlayers(people, this.players);
  this.game.save(function(err) {
    if (err) console.log(err);
  });
  this.id = this.game.getID();
  var firstPlayerIndex = this.game.moveOrder[this.game.moveIterator]; // send message out to the first player to move
  this.requests[firstPlayerIndex].json(this.game.sanitizedForm(firstPlayerIndex));
  this.requests[firstPlayerIndex] = null;
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

Handler.prototype =
{
  Class: null,
  id: "", // represents the gameID of the game this Handler handles
  game: null, // the actual game object this Handler handles
  people: [], // list of people IDs
  players: [], // list of player objects
  handlers: null,
  requests: [null, null], // list of requests sent in
  submitMove: function(new_move, playerID, devkey, res) {
    for (var i = 0; i < this.players.length; i++) {
      if (this.players[i].getID().toString() === playerID && this.people[i].toString() === devkey) {
        this.requests[i] = res;
        var returnJSON = this.game.submit(i, new_move);
        var nextPlayer = this.game.moveOrder[this.game.moveIterator];
        // check winnerIndex, if === -2, game is ongoing otherwise finish
        if (this.game.winnerIndex === -1 || this.game.winnerIndex >= 0) { // finish the game
          if (this.players[0].person !== this.players[1].person) // if someone plays themselves, no elo update
            findFirstUser(this.Class, this.players[0].person, this.players[1].person, this.game.winnerIndex);
          delete this.handlers[this.id];
          console.log(this.handlers); // test to see if purging worked
          this.requests[0].json(this.game.sanitizedForm(0));
          this.requests[1].json(this.game.sanitizedForm(1));
          this.requests[0] = null;
          this.requests[1] = null;
        } else {
          console.log(this.game.moveIterator);
          console.log(nextPlayer);
          if (this.requests[nextPlayer] === null) console.log('null res when trying to respond? ' + this.game.moveIterator);
          this.requests[nextPlayer].json(this.game.sanitizedForm(nextPlayer));
          this.requests[nextPlayer] = null;
          // callback(returnJSON.err, returnJSON);
          // TODO: do we need a callback?
        }
      }
    }
  }
};

if (typeof module !== 'undefined') { // allows frontend to access this class
  module.exports = Handler;
}
