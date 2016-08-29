var mongoose = require('mongoose'),
  mongooseGame = mongoose.model('Game');

// createArray() is a small helper function that helps with initialization of the boards
function createArray(length) { // literally creates a new array with params e.g. createArray(5,3)
	var arr = new Array(length || 0);
	var i = length;
	if (arguments.length > 1) {
	  var args = Array.prototype.slice.call(arguments, 1);
	  while (i--) arr[length - 1 - i] = createArray.apply(this, args);
	}
	return arr;
}

function Game() {
	// hard blocks appear in a gridlike pattern with no other hard blocks in any of the adjacent squres.
    // for odd numbered boardSizes, this initializer can simply put hard blocks in the odd indices
	this.hardBlockBoard = createArray(121); // storing 2d array in 1d array (x*11 + y is index)
	var i = 0; // "global" iterators because grunt hates everything that is fun
	var j = 0;
	for (i = 0; i < this.boardSize; i++) {
		for (j = 0; j < this.boardSize; j++) {
		  if (i === 0 || j === 0 || i === this.boardSize - 1 || j === this.boardSize - 1 ||
		    (i % 2 === 0 && j % 2 === 0)) this.hardBlockBoard[i*11 + j] = 1; // odd indices = add block
		  else this.hardBlockBoard[i*11 + j] = 0;
		}
	}

	this.softBlockBoard = createArray(121);
	// guaranteed spots for soft blocks:
	// players have one horizontal and vertical move they can make at the beginning
	// this will allow for players to actually place a bomb at the beginning and not be doomed from the start
	this.softBlockBoard[3*11 + 1] = 1;
	this.softBlockBoard[1*11 + 3] = 1;
	this.softBlockBoard[(this.boardSize - 2) * 11 + this.boardSize - 4] = 1;
	this.softBlockBoard[(this.boardSize - 4) * 11 + this.boardSize - 2] = 1;

	for (i = 0; i < this.boardSize; i++) {
		for (j = 0; j < this.boardSize; j++) {
		  if ((i === 1 || j === 1) && (i <= 2 && j <= 2)) {
		  	this.softBlockBoard[i * 11 + j] = 0;
		  	continue;
		  }
		  if ((i === this.boardSize - 2 || j === this.boardSize - 2) && (i >= this.boardSize - 3 && j >= this.boardSize - 3)) {
		  	this.softBlockBoard[i * 11 + j] = 0;
		  	continue;
		  }
		  if (this.hardBlockBoard[i * 11 + j] === 1 || Math.random() > 0.7) this.softBlockBoard[i * 11 + j] = 0; // might fiddle with %
		  else this.softBlockBoard[i * 11 + j] = 1;
		}
	}
}

Game.prototype = {
	boardSize: 11,
	people: [],
	players: [],
	hardBlockBoard: null,
	softBlockBoard: null,
	bombMap: {},
	trailMap: {},
	portalMap: {},
	model: null,
	attachPlayers: function(people, players) {
		this.people = people; // TODO: is slicing (copying by value) necessary?
		this.players = players;
	},
	getID: function() {
		if (this.model === null) this.model = new mongooseGame();
		return this.model._id;
	},
	save: function(callback) {
		if (this.model === null) this.model = new mongooseGame();
		this.model.boardSize = this.boardSize;
		this.model.people = this.people;
		this.model.players = this.players;
		this.model.hardBlockBoard = this.hardBlockBoard;
		this.model.softBlockBoard = this.softBlockBoard;
		this.model.save(callback);
	}
};

module.exports = Game;