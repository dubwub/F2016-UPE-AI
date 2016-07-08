/*
  Handler objects handle the middle ground between AIs and MongoDB
  These may need to be split up into multiple objects if it turns out each one is doing too much work
  but right now they handle moves being submitted from AIs to NodeJS (including validation of all moves and determining
  the game state to be pushed to MongoDB), and then will actually do the submission.

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

var Handler = function Handler(people, callback) { // people arg is list of "person ids", temporarily integers for testing
  // initialize board state
  var game = new Game();
  game.people = [];
  game.players = [];
  var tmp_people = []; // to get around weird this pointers? these are tmp arrays that will take the place of this.tmp_people
  var tmp_players = []; // will take place of this.players
  people.forEach(function(person) {
    tmp_people.push(person);
    game.people.push(person);
    var player = new Player(); // create new players using input data, then save them (add validation)
    player.game = game._id;
    player.person = person;
    player.save(function (err) {
      if (err) {
        callback(err);
      } // else {
        // res.json(game);
      // }
    });
    tmp_players.push(player._id);
    game.players.push(player._id);
  });
  this.people = tmp_people;
  this.players = tmp_players;
  var tmp_handler = this;
  this.id = game._id;
  var inner_callback = function (err) {
    if (err) {
      callback(err);
    } else {
      tmp_handler.id = game._id;
    }
  };
  game.save(inner_callback);
};

Handler.prototype =
{
  id: "", // represents the gameID of the game this Handler handles
  people: [], // list of people IDs
  players: [], // list of player IDs
  moves: {}, // assoc. array (hashmap) of all submitted moves
  size: 0, // size of moves object, see if this is necessary?
  submitMove: function(new_move, person, callback) {
    console.log("submitting move for gameID " + this.id);
    if (this.moves[person] === undefined) {
      this.moves[person] = new_move;
      this.size++;
      if (this.size === this.people.length) { // submit all moves at once
        console.log("submitting all");
        for (var key in this.moves) {
          if (this.moves.hasOwnProperty(key)) {
            var query = { game: this.id, _id: key };
            Player.update(query, { $set: { move: this.moves[key] } }, function(err, data) { // somehow update breaks with no callback? weird
              console.log(err);
              console.log(data);
            });
          }
        }
        this.moves = {}; // reset
        this.size = 0;
      }
      callback("success");
    } else callback("failure");
  }
};

if (typeof module !== 'undefined') { // allows frontend to access this class
  module.exports = Handler;
}
