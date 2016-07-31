/*
  HIGHISH LEVEL OVERVIEW (Handler.js)

  Handler objects interface between AIs and MongoDB
  This may need to be split up into multiple objects if it turns out it's doing too much work
  but right now handlers handle moves being submitted from AIs to NodeJS (including validation of all moves and determining
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

// TODO: this constructor should probably be broken up into multiple functions
var Handler = function Handler(people, callback) { // people arg is list of "person ids", temporarily integers for testing
  // initialize board state
  var game = new Game();
  game.size = 10;
  this.boardSize = game.size;
  game.people = [];
  game.players = [];
  var tmp_people = []; // to get around weird this pointers? these are tmp arrays that will take the place of this.tmp_people
  var tmp_players = {};
  people.forEach(function(person, index) {
    tmp_people.push(person);
    game.people.push(person);
    var player = new Player(); // create new players using input data, then save them (add validation)
    player.game = game._id;
    player.person = person;
    switch (index) { // initialize player position depending on index
      case 0:
        player.x = 0; // top left corner
        player.y = 0;
        break;
      case 1:
        player.x = game.size - 1; // bottom right
        player.y = game.size - 1;
        break;
      case 2: // this is just for future expansion, right now stick to 1v1
        player.x = 0; // bottom left
        player.y = game.size - 1;
        break;
      case 3:
        player.x = game.size - 1; // top right
        player.y = 0;
        break;
      default: // really should not be reaching here actually
        break;
    }
    player.save(function (err) {
      if (err) {
        callback(err);
      }
    });
    tmp_players[player._id] = player; // handlers keep player objects in memory
    game.players.push(player._id);
  });
  this.people = tmp_people; // reassign to copies
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
  // this.game = game;
};

function interpretMove(move, player, boardSize) { // small helper function, outputs target square
  var output = {
    // id: player._id // probably not necessary
    x: player.x,
    y: player.y
  };
  switch (move) {
    case "l":
      output.x--;
      if (output.x < 0) output.x = 0;
      break;
    case "r":
      output.x++;
      if (output.x >= boardSize) output.x = boardSize - 1;
      break;
    case "d":
      output.y++;
      if (output.y >= boardSize) output.y = boardSize - 1;
      break;
    case "u":
      output.y--;
      if (output.y < 0) output.y = 0;
      break;
    default: // otherwise, no move
      break;
  }
  return output;
}

Handler.prototype =
{
  id: "", // represents the gameID of the game this Handler handles
  game: null, // the actual game object this Handler handles (might not be necessary)
  boardSize: -1, // size of the game board
  people: [], // list of people IDs
  players: {}, // assoc. array (hashmap) of playerID vs. player object
  moves: {}, // assoc. array (hashmap) of all submitted moves
  submittedMoveCount: 0, // size of moves object, see if this is necessary?
  submitMove: function(new_move, person, callback) {
    console.log(person + " submitting move: " + new_move + " to " + this.id);
    if (this.moves[person] === undefined) { // you only get a single shot at move submission
      this.moves[person] = new_move;
      this.submittedMoveCount++;
      if (this.submittedMoveCount === this.people.length) { // submit all moves at once
        console.log("all moves submitted for game, resolving now");
        // resolving is done in four steps
        // 1. figure out where everyone wants to go
        // 2. resolve everyone with the least amount of conflict
        // 3. submit everyone's new positions
        // 4. return all res responses <--- not currently DONE
        var targetSquares = {}; // step 1
        for (var pid in this.moves) {
          if (this.moves.hasOwnProperty(pid)) {
            console.log(this.players);
            console.log(pid);
            console.log(this.players[pid]);
            targetSquares[pid] = interpretMove(this.moves[pid], this.players[pid], this.boardSize);
          }
        }
        // step 2 is missing for now, gonna need a better way of doing this
        for (var p_id in targetSquares) { // step 3
          if (targetSquares.hasOwnProperty(p_id)) { // LINT was complaining about using two "pid"s in same function, ew
            var query = { game: this.id, _id: p_id };
            this.players[p_id].x = targetSquares[p_id].x;
            this.players[p_id].y = targetSquares[p_id].y;
            // this.players.forEach(function (player) { // TODO: update player, maybe change this.players to hashmap
            //   if (player._id === p_id) {
            //     player.x = targetSquares[p_id].x;
            //     player.y = targetSquares[p_id].y;
            //   }
            // });
            Player.update(query, { $set: { x: targetSquares[p_id].x, y: targetSquares[p_id].y } },
            function(err, data) { // somehow update breaks with no callback? weird
              // console.log(err);
              // console.log(data);
            });
          }
        }
        // io.on('gameUpdate', function(socket) {console.log("seen");});
        // io.emit('gameUpdate', this.game);
        this.moves = {}; // reset
        this.submittedMoveCount = 0;
      }
      callback('success');
    } else callback('failure');
  }
};

if (typeof module !== 'undefined') { // allows frontend to access this class
  module.exports = Handler;
}
