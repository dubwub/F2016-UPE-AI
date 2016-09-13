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
  These store all of the moves of each of the players in an assoc. array (again, hashmap esque structure), and then when
  all players' moves are submitted the Handler will submit everything and advance the game state.

*/

var mongoose = require('mongoose'),
  Game = mongoose.model('Game'),
  Player = mongoose.model('Player'),
  Elo = require('elo-rank')(32);

var Handler = function Handler(people, Class, callback) { // TODO: CALLBACK NOT USED
  this.Class = Class;
  this.people = people;
  this.game = new Class.Game();
  // var players = [];
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
};

// helper functions related to updating elo after the game has terminated (is there a better way of doing this lol)
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
  console.log('done calculating, new elos: ' + user0.elo + ', ' + user1.elo);
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
  players: [], // assoc. array (hashmap) of playerID vs. player object
  submitMove: function(new_move, playerID, callback) {
    // TODO: when submitting to a complete game, should quit out
    for (var i = 0; i < this.players.length; i++) {
      if (this.players[i].getID().toString() === playerID) {
        var winnerIndex = this.game.submit(i, new_move);
        // if output === -2, game is ongoing
        if (winnerIndex === -1 || winnerIndex >= 0) { // tie game
          console.log('game ended, going here');
          findFirstUser(this.Class, this.players[0].person, this.players[1].person, winnerIndex);
        }
      }
    }
    // this.players[playerID].save();
    callback("success");
  }
};

if (typeof module !== 'undefined') { // allows frontend to access this class
  module.exports = Handler;
}
