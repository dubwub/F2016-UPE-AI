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
  Player = mongoose.model('Player');

var Handler = function Handler(people, Class, callback) { // TODO: CALLBACK NOT USED
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

Handler.prototype =
{
  id: "", // represents the gameID of the game this Handler handles
  game: null, // the actual game object this Handler handles
  people: [], // list of people IDs
  players: [], // assoc. array (hashmap) of playerID vs. player object
  // moves: {}, // assoc. array (hashmap) of all submitted moves
  submitMove: function(new_move, playerID, callback) {
    for (var i = 0; i < this.players.length; i++) {
      if (this.players[i].getID().toString() === playerID) {
        this.game.submit(i, new_move);
      }
    }
    // this.players[playerID].save();
    callback("success");
  }
};

if (typeof module !== 'undefined') { // allows frontend to access this class
  module.exports = Handler;
}
