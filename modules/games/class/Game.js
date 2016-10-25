var mongoose = require('mongoose'),
	mongooseGame = mongoose.model('Game'),
	mongooseSnapshot = mongoose.model('Snapshot');

function Game() {
	this.people = [];
	this.players = [];
	this.moveOrder = [];
	this.moveIterator = 0,
	this.hardBlockBoard = null; // 1-D boolean array, 0 = no hard block, 1 = hard block here.
	this.softBlockBoard = null;
	this.bombMap = {};
	this.trailMap = {};
	this.portalMap = {};
	this.replay = [];
	this.model = null;
	this.state = 'in progress';
	this.winnerIndex = -2;
	// hard blocks appear in a gridlike pattern with no other hard blocks in any of the adjacent squres.
	// for odd numbered boardSizes, this initializer can simply put hard blocks in the odd indices
	this.hardBlockBoard = createArray(this.boardSize * this.boardSize); // storing 2d array in 1d array (x*11 + y is index)
	var i = 0; // "global" iterators because grunt hates everything that is fun
	var j = 0;
	for (i = 0; i < this.boardSize; i++) {
		for (j = 0; j < this.boardSize; j++) {
			if (i === 0 || j === 0 || i === this.boardSize - 1 || j === this.boardSize - 1 ||
				(i % 2 === 0 && j % 2 === 0)) this.hardBlockBoard[i*this.boardSize + j] = 1; // odd indices = add block
			else this.hardBlockBoard[i*this.boardSize + j] = 0;
		}
	}

	this.softBlockBoard = createArray(this.boardSize * this.boardSize);
	for (i = 0; i < this.boardSize; i++) {
		for (j = 0; j < this.boardSize; j++) {
			if ((i === 1 || j === 1) && (i <= 2 && j <= 2)) {
				this.softBlockBoard[i * this.boardSize + j] = 0;
				continue;
			}
			if ((i === this.boardSize - 2 || j === this.boardSize - 2) && (i >= this.boardSize - 3 && j >= this.boardSize - 3)) {
				this.softBlockBoard[i * this.boardSize + j] = 0;
				continue;
			}
			if (this.hardBlockBoard[i * this.boardSize + j] === 1 || Math.random() > 0.7) this.softBlockBoard[i * this.boardSize + j] = 0; // might fiddle with %
			else this.softBlockBoard[i * this.boardSize + j] = 1;
		}
	}
	// guaranteed spots for soft blocks:
	// players have one horizontal and vertical move they can make at the beginning
	// this will allow for players to actually place a bomb at the beginning and not be doomed from the start
	this.softBlockBoard[3*this.boardSize + 1] = 1;
	this.softBlockBoard[1*this.boardSize + 3] = 1;
	this.softBlockBoard[(this.boardSize - 2) * this.boardSize + this.boardSize - 4] = 1;
	this.softBlockBoard[(this.boardSize - 4) * this.boardSize + this.boardSize - 2] = 1;
	return this;
}

// createArray() is a small helper function that helps with initialization of the boards
// TODO: SINCE 2-D ARRAYS CAN'T BE STORED IN MONGO, THIS IS PROBABLY DEPRECIATED AND SHOULD BE REMOVED
function createArray(length) { // literally creates a new array with params e.g. createArray(5,3)
	var arr = new Array(length || 0);
	var i = length;
	if (arguments.length > 1) {
		var args = Array.prototype.slice.call(arguments, 1);
		while (i--) arr[length - 1 - i] = createArray.apply(this, args);
	}
	return arr;
}

// Overall helper function that lets you input the direction you're facing and current position that outputs next position.
function getNextSquare(x, y, direction) {
	switch (direction) {
		case 0: // left
			return [x - 1, y];
		case 1: // up
			return [x, y - 1];
		case 2: // right
			return [x + 1, y];
		case 3: // down
			return [x, y + 1];
	}
}

// checks if a map is empty (helper function specifically used for trailMap, may be extended later)
function isEmpty(map) {
   for(var key in map) {
      if (map.hasOwnProperty(key)) {
         return false;
      }
   }
   return true;
}

// helper function to calculate value of a block at a specific position
function getBlockValue(x, y) {
	x = parseInt(x, 10);
	y = parseInt(y, 10);
	var rawScore = Math.abs((this.boardSize - 1 - x) * x * (this.boardSize - 1 - y) * y);
	var scaledScore = Math.floor(10 * rawScore / ((this.boardSize - 1) * (this.boardSize - 1) * (this.boardSize - 1) * (this.boardSize - 1) / 16));
	if (scaledScore === 0) return 1;
	else return scaledScore, 10; // guaranteed to be a number from 1 to 10 distributed more heavily towards center blocks
}

Game.prototype = {
	boardSize: 11,
	people: [],
	players: [],
	moveOrder: [],
	moveIterator: 0,
	hardBlockBoard: null, // 1-D boolean array, 0 = no hard block, 1 = hard block here.
	softBlockBoard: null,
	bombMap: {},
	trailMap: {},
	portalMap: {},
	replay: [],
	model: null,
	state: 'in progress',
	winnerIndex: -2, // when state is 'done', this will be set to the index of the winner (or -1 for tie, -2 for in progress)
	// game obj constructor
	init: function() {
		// hard blocks appear in a gridlike pattern with no other hard blocks in any of the adjacent squres.
		// for odd numbered boardSizes, this initializer can simply put hard blocks in the odd indices
		this.hardBlockBoard = createArray(this.boardSize * this.boardSize); // storing 2d array in 1d array (x*11 + y is index)
		var i = 0; // "global" iterators because grunt hates everything that is fun
		var j = 0;
		for (i = 0; i < this.boardSize; i++) {
			for (j = 0; j < this.boardSize; j++) {
				if (i === 0 || j === 0 || i === this.boardSize - 1 || j === this.boardSize - 1 ||
					(i % 2 === 0 && j % 2 === 0)) this.hardBlockBoard[i*this.boardSize + j] = 1; // odd indices = add block
				else this.hardBlockBoard[i*this.boardSize + j] = 0;
			}
		}

		this.softBlockBoard = createArray(this.boardSize * this.boardSize);
		for (i = 0; i < this.boardSize; i++) {
			for (j = 0; j < this.boardSize; j++) {
				if ((i === 1 || j === 1) && (i <= 2 && j <= 2)) {
					this.softBlockBoard[i * this.boardSize + j] = 0;
					continue;
				}
				if ((i === this.boardSize - 2 || j === this.boardSize - 2) && (i >= this.boardSize - 3 && j >= this.boardSize - 3)) {
					this.softBlockBoard[i * this.boardSize + j] = 0;
					continue;
				}
				if (this.hardBlockBoard[i * this.boardSize + j] === 1 || Math.random() > 0.7) this.softBlockBoard[i * this.boardSize + j] = 0; // might fiddle with %
				else this.softBlockBoard[i * this.boardSize + j] = 1;
			}
		}
		// guaranteed spots for soft blocks:
		// players have one horizontal and vertical move they can make at the beginning
		// this will allow for players to actually place a bomb at the beginning and not be doomed from the start
		this.softBlockBoard[3*this.boardSize + 1] = 1;
		this.softBlockBoard[1*this.boardSize + 3] = 1;
		this.softBlockBoard[(this.boardSize - 2) * this.boardSize + this.boardSize - 4] = 1;
		this.softBlockBoard[(this.boardSize - 4) * this.boardSize + this.boardSize - 2] = 1;
	},
	/*
		note that the following function will, if a bomb and player share the same spot, return bomb.
		this is ideal for detonate functionality but might want to be fixed in the future.
 	*/
	querySpace: function(x, y) {
		if (x < 0 || x >= this.boardSize || y < 0 || y >= this.boardSize) return 'out';
		if (this.hardBlockBoard[x * this.boardSize + y] === 1) return 'hb';
		if (this.softBlockBoard[x * this.boardSize + y] === 1) return 'sb';
		if (typeof this.bombMap[[x, y]] !== 'undefined') return 'b'; // bomb
		for (var i = 0; i < this.players.length; i++) { // linear time check, negligible because #players is probably ~2
			if (this.players[i].x === x && this.players[i].y === y) { // check if any of the players exist in square
				return 'p:' + i; // use js split to get p_index
			}
		}
		return '';
	},	
	attachPlayers: function(people, players) { // helper function that is used during game initialization (see handler)
		this.people = people;
		this.players = players;
		this.moveOrder = [];
		this.moveIterator = 0;
		for (var i = 0; i < players.length; i++) {
			this.moveOrder.push(i);
			// this.moveOrder.push(0); <-- uncomment for testing purposes
		}
	},
	createSnapshot: function(lastMove) {
		var newSnap = new mongooseSnapshot();
		newSnap.hardBlockBoard = this.hardBlockBoard;
		newSnap.softBlockBoard = this.softBlockBoard;
		newSnap.moveOrder = this.moveOrder;
		newSnap.moveIterator = this.moveIterator;
		if (lastMove) newSnap.lastMove = lastMove;
		// newSnap.markModified('lastMove');
		newSnap.players = [];
		for (var index = 0; index < this.players.length; index++) {
			newSnap.players.push(this.players[index].sanitizedForm());
		}
		newSnap.trailMap = this.trailMap;
		newSnap.bombMap = this.bombMap;
		newSnap.portalMap = this.portalMap;
		this.replay.push(newSnap._id);
		newSnap.save();
	},
	// returns x, y and direction of a solid object move in a specific direction
	simulateMovement: function(x, y, direction) {
		var nextSquare = getNextSquare(x, y, direction);
		nextSquare.push(direction);
		var nextSquareContents = this.querySpace(nextSquare[0], nextSquare[1]);
		if (nextSquareContents === '') {
			return nextSquare;
		} else {
			if (typeof this.portalMap[[nextSquare[0], nextSquare[1]]] !== 'undefined') {
				if (typeof this.portalMap[[nextSquare[0], nextSquare[1]]][(direction + 2) % 4] !== 'undefined') {
					var player = this.players[this.portalMap[[nextSquare[0], nextSquare[1]]][(direction + 2) % 4].owner];
					if (player.orangePortal !== null && player.bluePortal !== null) {
						var otherPortalBlock;
						var throughPortalSquare;
						if (this.portalMap[[nextSquare[0], nextSquare[1]]][(direction + 2) % 4].portalColor === 'orange') {
							otherPortalBlock = [player.bluePortal.x, player.bluePortal.y];
							throughPortalSquare = this.simulateMovement(player.bluePortal.x, player.bluePortal.y, player.bluePortal.direction);
						} else {
							otherPortalBlock = [player.orangePortal.x, player.orangePortal.y];
							throughPortalSquare = this.simulateMovement(player.orangePortal.x, player.orangePortal.y, player.orangePortal.direction);
						}
						if (throughPortalSquare[0] !== otherPortalBlock[0] || throughPortalSquare[1] !== otherPortalBlock[1])
							return throughPortalSquare;
					}
				}
			}
			return [x, y, direction];
		}
	},
	// handles trails resolving on players and soft blocks
	trailResolveSquare: function(x, y) { // better name for this?
		if (typeof this.trailMap[[x, y]] === 'undefined') return;
		var space = this.querySpace(x, y);
		if (space === 'sb') { // soft block here
			this.softBlockBoard[x * this.boardSize + y] = 0;
			this.deletePortal(x, y, -1); // -1 means delete all portals
			// console.log(this.portalMap);
			for (var trail in this.trailMap[[x, y]]) {
				if (this.trailMap[[x, y]].hasOwnProperty(trail)) {
					// THERE WAS A WEIRD BUG (unreproducible): crashed because this.players[trail] was not defined
					this.players[trail].coins += getBlockValue(x, y);
				}
			}
		} else if (space[0] === 'p') { // kill player
			var index = Number.parseInt(space.split(':')[1], 10);
			console.log('player: ' + index + ' was killed by bomb');
			this.players[index].alive = false; // should be killing player, turned off for now
			this.players[index].x = -1;
			this.players[index].y = -1;
		}
	},
	placeTrail: function(pIndex, x, y, type) {
		if (typeof this.trailMap[[x, y]] === 'undefined') {
			this.trailMap[[x, y]] = {};
			this.trailMap[[x, y]][pIndex] = { tick: 2, type: type };
		} else this.trailMap[[x, y]][pIndex] = { tick: 2, type: type };
	},
	recursiveDetonate: function(x, y, direction, range, pierce, pierceMode, owner) {
		if (range === 0 || (pierceMode === true && pierce < 0)) return;
		var output = getNextSquare(x, y, direction);
		var outputContents = this.querySpace(output[0], output[1]);
		if (outputContents === 'hb' || outputContents === 'sb') {
			if (typeof this.portalMap[[output[0], output[1]]] !== 'undefined') {
				if (typeof this.portalMap[[output[0], output[1]]][(direction + 2) % 4] !== 'undefined') {
					var player = this.players[this.portalMap[[output[0], output[1]]][(direction + 2) % 4].owner];
					if (player.orangePortal !== null && player.bluePortal !== null) { // then we're traveling through poooortals
						if (this.portalMap[[output[0], output[1]]][(direction + 2) % 4].portalColor === 'orange') {
							this.recursiveDetonate(player.bluePortal.x, player.bluePortal.y, player.bluePortal.direction, range, pierce, pierceMode);
						} else {
							this.recursiveDetonate(player.orangePortal.x, player.orangePortal.y, player.orangePortal.direction, range, pierce, pierceMode);
						}
						return;
					}
				}
			}
		}
		var type;
		if (direction === 0 || direction === 2) type = 'h';
		else type = 'v';
		if (outputContents !== 'out') this.placeTrail(owner, output[0], output[1], type);
		else return;
		if (outputContents === 'b') this.detonate(output[0], output[1]);
		if (outputContents !== '') {
			pierceMode = true;
		}

		if (pierceMode === true) {
			this.recursiveDetonate(output[0], output[1], direction, range - 1, pierce - 1, true, owner);
		} else this.recursiveDetonate(output[0], output[1], direction, range - 1, pierce, false, owner);
	},

	// general bomb destroying function, handles chain reactions pretty well
	detonate: function(bombX, bombY) { // detonates bomb at x,y
		if (typeof this.bombMap[[bombX, bombY]] === 'undefined') return; // no bomb here?
		var bomb = this.bombMap[[bombX, bombY]];
		this.players[bomb.owner].bombCount++;
		delete this.bombMap[[bombX, bombY]];
		this.placeTrail(bomb.owner, bombX, bombY, 'origin');
		for (var direction = 0; direction < 4; direction++) {
			var x = bombX;
			var y = bombY;
			this.recursiveDetonate(x, y, direction, this.players[bomb.owner].bombRange, this.players[bomb.owner].bombPierce, false, bomb.owner);
		}
	},

	// deletes portal(s) from location, usage: direction is either 0-4 for one portal, -1 for all
	deletePortal: function(x, y, direction) {
		if (typeof this.portalMap[[x, y]] !== 'undefined') {
			for (var portalDirection in this.portalMap[[x, y]]) { // js iterate through hashmap
				if (this.portalMap[[x, y]].hasOwnProperty(portalDirection)) {
					if (direction === Number.parseInt(portalDirection, 10) || direction === -1) { // if this is true, finally delete the portal(s)
						if (this.portalMap[[x, y]][portalDirection].portalColor === 'orange') {
							this.players[this.portalMap[[x, y]][portalDirection].owner].orangePortal = null;
						} else {
							this.players[this.portalMap[[x, y]][portalDirection].owner].bluePortal = null;
						}
						delete this.portalMap[[x, y]][portalDirection];
					}
				}
			}
		}
	},
	shootPortal: function(playerIndex, direction, portalColor) {
		var playerX = this.players[playerIndex].x;
		var playerY = this.players[playerIndex].y;
		var nextSquare = getNextSquare(playerX, playerY, direction);
		var nextSquareContents = this.querySpace(nextSquare[0], nextSquare[1]);
		while (nextSquareContents !== 'hb' && nextSquareContents !== 'sb') {
			nextSquare = getNextSquare(nextSquare[0], nextSquare[1], direction);
			nextSquareContents = this.querySpace(nextSquare[0], nextSquare[1]);
		}
		// nextSquare guaranteed to be a block at this point
		// 0 = left, 1 = up, 2 = right, 3 = down, so (direction - 2) % 4 guaranteed to be opposite dir
		var newPortalDirection = (direction + 2) % 4;
		var newPortal = { x: nextSquare[0], y: nextSquare[1], direction: newPortalDirection };
		if (portalColor === 'orange') {
			if (this.players[playerIndex].orangePortal !== null)
				this.deletePortal(this.players[playerIndex].orangePortal.x, this.players[playerIndex].orangePortal.y, this.players[playerIndex].orangePortal.direction);
			this.players[playerIndex].orangePortal = newPortal;
			if (typeof this.portalMap[[nextSquare[0], nextSquare[1]]] === 'undefined')
				this.portalMap[[nextSquare[0], nextSquare[1]]] = {};
			else this.deletePortal(nextSquare[0], nextSquare[1], newPortalDirection);
			this.portalMap[[nextSquare[0], nextSquare[1]]][newPortalDirection] = { owner: playerIndex, portalColor: 'orange' };
		} else {
			if (this.players[playerIndex].bluePortal !== null)
				this.deletePortal(this.players[playerIndex].bluePortal.x, this.players[playerIndex].bluePortal.y, this.players[playerIndex].bluePortal.direction);
			this.players[playerIndex].bluePortal = newPortal;
			if (typeof this.portalMap[[nextSquare[0], nextSquare[1]]] === 'undefined')
				this.portalMap[[nextSquare[0], nextSquare[1]]] = {};
			else this.deletePortal(nextSquare[0], nextSquare[1], newPortalDirection);
			this.portalMap[[nextSquare[0], nextSquare[1]]][newPortalDirection] = { owner: playerIndex, portalColor: 'blue' };
		}
	},
	submit: function(playerIndex, move, callback) {
		var outputNote; // note to be sent back with the output
		// console.log(playerIndex + ', ' + this.moveOrder[this.moveIterator]);
		if (playerIndex !== this.moveOrder[this.moveIterator]) {
			return { err: 'Not your turn.' };
		}
		var player = this.players[playerIndex];
		var output; // used in the switch case
		// this.replay.push(move);
		switch (move) {
			case 'ml': // move left
				output = this.simulateMovement(player.x, player.y, 0);
				player.x = output[0]; player.y = output[1]; player.orientation = output[2];
				break;
			case 'mu': // move up
				output = this.simulateMovement(player.x, player.y, 1);
				player.x = output[0]; player.y = output[1]; player.orientation = output[2];
				break;
			case 'mr': // move right
				output = this.simulateMovement(player.x, player.y, 2);
				player.x = output[0]; player.y = output[1]; player.orientation = output[2];
				break;
			case 'md': // move down
				output = this.simulateMovement(player.x, player.y, 3);
				player.x = output[0]; player.y = output[1]; player.orientation = output[2];
				break;
			case 'tl': // turn left
				player.orientation = 0;
				break;
			case 'tu': // turn up
				player.orientation = 1;
				break;
			case 'tr': // turn right
				player.orientation = 2;
				break;
			case 'td': // turn down
				player.orientation = 3;
				break;
			case '': // do nothing
				break;
			case 'b': // drop bomb
				if (typeof this.bombMap[[player.x, player.y]] !== 'undefined' || player.bombCount === 0) break; // already standing on bomb or bombCount = 0
				player.bombCount--;
				this.bombMap[[player.x, player.y]] = { owner: playerIndex, tick: 5 };
				break;
			case 'buy_count': // buys an extra bomb
				if (player.coins < 1) {
					outputNote = 'Insufficient funds to buy bomb';
					break;
				}
				player.bombCount++;
				player.coins -= 1;
				break;
			case 'buy_pierce': // buys pierce
				if (player.coins < 1) {
					outputNote = 'Insufficient funds to buy pierce';
					break;
				}
				player.bombPierce++;
				player.coins -= 1;
				break;
			case 'buy_range': // buys pierce
				if (player.coins < 1) {
					outputNote = 'Insufficient funds to buy bomb range';
					break;
				}
				player.bombRange++;
				player.coins -= 1;
				break;
			// TODO: balance buying block? right now it costs just as much to create something then destroy it
			case 'buy_block': // buys new block
				// first figure out how much block would cost
				var newBlockPos = getNextSquare(player.x, player.y, player.orientation);
				if (this.querySpace(newBlockPos[0], newBlockPos[1]) !== '') break; // can't put a block on something else
				var blockCost = getBlockValue(newBlockPos[0], newBlockPos[1]);
				if (player.coins < blockCost) {
					outputNote = 'Insufficient funds to buy block, requires: ' + blockCost;
					// console.log('insufficient coinage to buy block, block cost at ' + newBlockPos[0] + ',' + newBlockPos[1] + '=' + blockCost);
					break;
				}
				this.softBlockBoard[newBlockPos[0] * this.boardSize + newBlockPos[1]] = 1;
				player.coins -= blockCost;
				break;
			case 'op': // orange portal
				this.shootPortal(playerIndex, player.orientation, 'orange');
				break;
			case 'bp': // blue portal
				this.shootPortal(playerIndex, player.orientation, 'blue');
				break;
			default: // none of the above?
				outputNote = 'invalid move, submitting no move this turn'
				break;
		}
		this.moveIterator++;
		// once moveIterator hits the end of the list, we're at the end of turn resolving
		// 1. switch move order (first player is put to the back of the list)
		// 2. bombs are ticked down, bombs with tick = 0 generate trails
		// 3. trails are ticked, killing players/blocks etc
		// 4. check if the game's ended
		if (this.moveIterator >= this.players.length) {
			this.moveIterator = 0;
			// first, move player who moved first time to end of the list
			this.moveOrder.push(this.moveOrder[0]); // add first player to end
			this.moveOrder.splice(0, 1); // remove first element
			// then, tick bombs and detonate those who are at 0
			for (var bomb in this.bombMap) {
				if (this.bombMap.hasOwnProperty(bomb)) {
					this.bombMap[bomb].tick -= 1;
					if (this.bombMap[bomb].tick === 0) { // when tick hits 0, detonate!
						var bombArray = bomb.split(',');
						var bombX = Number.parseInt(bombArray[0], 10);
						var bombY = Number.parseInt(bombArray[1], 10);
						this.detonate(bombX, bombY);
					}
				}
			}
			// console.log(this.trailMap);
			for (var trailSquare in this.trailMap) { // trail step
				if (this.trailMap.hasOwnProperty(trailSquare)) {
					for (var trail in this.trailMap[trailSquare]) {
						if (this.trailMap[trailSquare].hasOwnProperty(trail)) {
							var trailArray = trailSquare.split(',');
							var trailX = Number.parseInt(trailArray[0], 10);
							var trailY = Number.parseInt(trailArray[1], 10);
							this.trailMap[trailSquare][trail].tick -= 1;
							this.trailResolveSquare(trailX, trailY);
							if (this.trailMap[trailSquare][trail].tick === 0) {
								delete this.trailMap[trailSquare][trail];
								if (isEmpty(this.trailMap[trailSquare]))
									delete this.trailMap[trailSquare];
							}
						}
					}
				}
			}
			// check victory step, right now only does two players
			var alivePlayers = [];
			for (var i = 0; i < this.players.length; i++) {
				if (this.players[i].alive === true) alivePlayers.push(i); 
			}
			this.state = 'complete';
			if (alivePlayers.length === 0) this.winnerIndex = -1; // if no winners, tie game
			else if (alivePlayers.length === 1) this.winnerIndex = alivePlayers[0]; // otherwise return winnerIndex
			else this.state = 'in progress';
		}
		this.createSnapshot(move);
		this.save(function (err, data) { if (err) console.log(err); /* else console.log(data); */ });
		for (var i = 0; i < this.players.length; i++)
			this.players[i].save(function (err, data) { if (err) console.log(err); /* else console.log(data); */ });
		var returnJSON = this.sanitizedForm(playerIndex);
		returnJSON.note = outputNote;
		return returnJSON; // will return -2 until the game is complete
	},
	getID: function() { // returns the Mongo ID of the game
		if (this.model === null) this.model = new mongooseGame();
		return this.model._id;
	},
	sanitizedForm: function(playerIndex) {
		var output = {};
		output.gameID = this.getID();
		output.playerID = this.players[playerIndex].getID();
		output.state = this.state;
		output.boardSize = this.boardSize;
		output.player = this.players[playerIndex].sanitizedForm();
		output.moveOrder = this.moveOrder;
		output.moveIterator = this.moveIterator;
		output.playerIndex = playerIndex;
		if (playerIndex === 0) {
			output.opponent = this.players[1].sanitizedForm();
		}
		else output.opponent = this.players[0].sanitizedForm();
		output.hardBlockBoard = this.hardBlockBoard;
		output.softBlockBoard = this.softBlockBoard;
		output.trailMap = this.trailMap;
		output.bombMap = this.bombMap;
		output.portalMap = this.portalMap;
		return output;
	},
	save: function(callback) { // saves the game into the database (should be called after attachPlayers always)
		if (this.model === null) this.model = new mongooseGame();
		this.model.state = this.state;
		this.model.boardSize = this.boardSize;
		this.model.people = this.people;
		this.model.moveOrder = this.moveOrder;
		this.model.moveIterator = this.moveIterator;
		var playerIDs = []; // player IDs are what are saved in mongo, not the player objects themselves (those are separate)
		for (var i = 0; i < this.players.length; i++) {
			playerIDs.push(this.players[i].getID());
		}
		this.model.players = playerIDs;
		this.model.hardBlockBoard = this.hardBlockBoard;
		this.model.softBlockBoard = this.softBlockBoard;
		this.model.bombMap = this.bombMap;
		this.model.markModified('bombMap'); // have to mark as modified to let mongoose know to update (objects only?)
		this.model.trailMap = this.trailMap;
		this.model.markModified('trailMap');
		this.model.portalMap = this.portalMap;
		this.model.markModified('portalMap');
		if (this.replay.length === 0) this.createSnapshot(); // initial save
		this.model.replay = this.replay;
		this.model.markModified('replay');
		// console.log(this.replay);
		// console.log(this.model);
		this.model.save(callback);
	}
};

module.exports = Game;