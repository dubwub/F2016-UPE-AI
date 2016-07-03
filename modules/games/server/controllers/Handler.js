var mongoose = require('mongoose'),
  Game = mongoose.model('Game'),
  Player = mongoose.model('Player');
// move to separate class/file eventually
var Handler = function Handler(people, callback) { // people arg is list of "person ids", temporarily integers for testing
  // initialize board state

  var game = new Game(); // initialize move object
  game.people = [];
  game.players = [];
  var tmp_people = []; // to get around weird this pointers?
  var tmp_players = [];
  people.forEach(function(person) {
    tmp_people.push(person);
    game.people.push(person);
    var player = new Player();
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
      // console.log(this)
      tmp_handler.id = game._id;
      // console.log(tmp_handler.id);
    }
  };
  game.save(inner_callback);
  // console.log(this);
  // return this;
};

Handler.prototype =
{
  id: "",
  people: [],
  players: [],
  moves: [],
  submitMove: function(new_move, person, callback) {
    // var player = new Player();
    console.log("submitting move for gameID " + this.id);
    var query = { game: this.id, _id: person };
    Player.update(query, { move: new_move }, callback);
  }
};

if (typeof module !== 'undefined') { // allows frontend to access this class
  module.exports = Handler;
}
