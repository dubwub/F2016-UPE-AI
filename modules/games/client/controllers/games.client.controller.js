(function () {
  'use strict';

  angular
    .module('games')
    .controller('GamesController', GamesController);

  angular
    .module('games')
    .controller('TrainingController', TrainingController);

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

  /*
    This controller holds all of the game logic needed to run the training mode for Bomberman.
    vm is the object that is exposed to the front end (see: training-game.client.view.html)
    vm.game is where all of the game related information resides.
  */

  TrainingController.$inject = ['$scope', '$window', 'TrainingService'];
  function TrainingController($scope, $window, TrainingService) {
    var vm = this; // again, this is the main object the front-end will interface with
    vm.game = {
      boardSize: 11 // can be customized, LEAVE TO ODD NUMBERS FOR OPTIMAL BLOCK PLACEMENT
    };
    // vm.game = new Game();
    // console.log(vm.game);

    function createPlayer(x, y) { // player factory
      return {
        x: x,
        y: y,
        orientation: 0,
        bombRange: 3,
        bombPierce: 0,
        bombCount: 1,
        alive: true,
        coins: 0,
        orangePortal: null,
        bluePortal: null
      };
    }

    // this function initializes the game state, should be quite fine for most game boards.
    // the hard block generator works best in odd numbered boardSizes, and the softblockBoard doesn't really care.
    // right now this only initializes two players, and only spaces for two players.
    $scope.init = function() {
      vm.game.players = [createPlayer(1, 1), createPlayer(vm.game.boardSize - 2, vm.game.boardSize - 2)];
      vm.game.moveOrder = [0, 1]; // if you want to just test single player logic, change this to [0, 0]
      vm.game.moveIterator = 0;

      // hard blocks appear in a gridlike pattern with no other hard blocks in any of the adjacent squres.
      // for odd numbered boardSizes, this initializer can simply put hard blocks in the odd indices
      vm.game.hardBlockBoard = createArray(vm.game.boardSize, vm.game.boardSize);
      var i = 0; // "global" iterators because grunt hates everything that is fun
      var j = 0;
      for (i = 0; i < vm.game.boardSize; i++) {
        for (j = 0; j < vm.game.boardSize; j++) {
          if (i === 0 || j === 0 || i === vm.game.boardSize - 1 || j === vm.game.boardSize - 1 ||
            (i % 2 === 0 && j % 2 === 0)) vm.game.hardBlockBoard[i][j] = 1; // odd indices = add block
          else vm.game.hardBlockBoard[i][j] = 0;
        }
      }

      vm.game.softBlockBoard = createArray(vm.game.boardSize, vm.game.boardSize);
      // guaranteed spots for soft blocks:
      // players have one horizontal and vertical move they can make at the beginning
      // this will allow for players to actually place a bomb at the beginning and not be doomed from the start
      vm.game.softBlockBoard[3][1] = 1;
      vm.game.softBlockBoard[1][3] = 1;
      vm.game.softBlockBoard[vm.game.boardSize - 2][vm.game.boardSize - 4] = 1;
      vm.game.softBlockBoard[vm.game.boardSize - 4][vm.game.boardSize - 2] = 1;

      for (i = 0; i < vm.game.boardSize; i++) {
        for (j = 0; j < vm.game.boardSize; j++) {
          if ((i === 1 || j === 1) && (i <= 3 && j <= 3)) continue;
          if ((i === vm.game.boardSize - 2 || j === vm.game.boardSize - 2) && (i >= vm.game.boardSize - 4 && j >= vm.game.boardSize - 4)) continue;
          if (vm.game.hardBlockBoard[i][j] === 1 || Math.random() > 0.7) vm.game.softBlockBoard[i][j] = 0; // might fiddle with %
          else vm.game.softBlockBoard[i][j] = 1;
        }
      }

      // bombs are represented server-side in a hashmap, client-side in a list
      vm.game.bombMap = {};
      vm.game.clientBombList = []; // currently unimplemented

      // explosion trails are too
      vm.game.trailMap = {};
      vm.game.clientTrailList = []; // currently unimplemented

      // portals are too hashmap
      // key: [x, y], value is a hashmap (object) whose key is direction, output is { owner: (playerIndex), portalColor: (orange/blue)}
      vm.game.portalMap = {};
    };
    $scope.init(); // initialize at the beginning, implemented for easy creation of reset button

    // pretty straightforward helper function to check whether a given block is in the board
    $scope.checkInBounds = function(x, y) {
      return x >= 0 && x < vm.game.boardSize && y >= 0 && y < vm.game.boardSize;
    };

    /*
      note there is some funky stuff happening below, if a player and bomb are on the same square
      the function will return bomb. this is ok for chain detonations of bombs, but may cause
      errors in the future
    */

    $scope.checkSpaceBlocked = function(x, y) {
      if (!$scope.checkInBounds(x, y)) return 'out'; // out of bounds
      if (vm.game.hardBlockBoard[x][y] === 1) return 'hb'; // hard block
      if (vm.game.softBlockBoard[x][y] === 1) return 'sb'; // soft block
      if (typeof vm.game.bombMap[[x, y]] !== 'undefined') return 'b'; // bomb
      for (var i = 0; i < vm.game.players.length; i++) { // linear time check, negligible because #players is probably ~2
        if (vm.game.players[i].x === x && vm.game.players[i].y === y) { // check if any of the players exist in square
          return 'p:' + i; // use js split to get p_index
        }
      }
      return '';
    };

    // helper function to calculate value of a block at a specific position
    function getBlockValue(x, y) {
      var rawScore = Math.abs((vm.game.boardSize - 1 - x) * x * (vm.game.boardSize - 1 - y) * y);
      var scaledScore = Math.floor(10 * rawScore / ((vm.game.boardSize - 1) * (vm.game.boardSize - 1) * (vm.game.boardSize - 1) * (vm.game.boardSize - 1) / 16));
      if (scaledScore === 0) return 1;
      else return scaledScore; // guaranteed to be a number from 1 to 10 distributed more heavily towards center blocks
    }

    // used for trail creation, helper function that helps determine where the trail goes next
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

    // returns x, y and direction of a solid object move in a specific direction
    function simulateMovement(x, y, direction) {
      var nextSquare = getNextSquare(x, y, direction);
      nextSquare.push(direction);
      var nextSquareContents = $scope.checkSpaceBlocked(nextSquare[0], nextSquare[1]);
      if (nextSquareContents === '') {
        return nextSquare;
      } else {
        if (typeof vm.game.portalMap[[nextSquare[0], nextSquare[1]]] !== 'undefined') {
          if (typeof vm.game.portalMap[[nextSquare[0], nextSquare[1]]][(direction + 2) % 4] !== 'undefined') {
            var player = vm.game.players[vm.game.portalMap[[nextSquare[0], nextSquare[1]]][(direction + 2) % 4].owner];
            if (player.orangePortal !== null && player.bluePortal !== null) {
              var otherPortalBlock;
              var throughPortalSquare;
              if (vm.game.portalMap[[nextSquare[0], nextSquare[1]]][(direction + 2) % 4].portalColor === 'orange') {
                otherPortalBlock = [player.bluePortal.x, player.bluePortal.y];
                throughPortalSquare = simulateMovement(player.bluePortal.x, player.bluePortal.y, player.bluePortal.direction);
              } else {
                otherPortalBlock = [player.orangePortal.x, player.orangePortal.y];
                throughPortalSquare = simulateMovement(player.orangePortal.x, player.orangePortal.y, player.orangePortal.direction);
              }
              if (throughPortalSquare[0] !== otherPortalBlock[0] || throughPortalSquare[1] !== otherPortalBlock[1])
                return throughPortalSquare;
            }
          }
        }
        return [x, y, direction];
      }
    }

    // handles trails resolving on players and soft blocks
    function trailResolveSquare(x, y) { // better name for this?
      if (typeof vm.game.trailMap[[x, y]] === 'undefined') return;
      var space = $scope.checkSpaceBlocked(x, y);
      if (space === 'sb') { // soft block here
        vm.game.softBlockBoard[x][y] = 0;
        deletePortal(x, y, -1); // -1 means delete all portals
        console.log(vm.game.portalMap);
        for (var trail in vm.game.trailMap[[x, y]]) {
          if (vm.game.trailMap[[x, y]].hasOwnProperty(trail)) {
            // THERE WAS A WEIRD BUG (unreproducible): crashed because vm.game.players[trail] was not defined
            vm.game.players[trail].coins += getBlockValue(x, y);
          }
        }
      } else if (space[0] === 'p') { // kill player
        var index = Number.parseInt(space.split(':')[1], 10);
        console.log('player: ' + index + ' was killed by bomb');
        // vm.game.players[index].alive = false; // should be killing player, turned off for now
        // vm.game.players[index].x = vm.game.players[index].y = -1;
      }
    }

    // creates a new trail object in the trailMap in the specified position. called by detonate
    /*
      sample trail types:
      h = generic horizontal trail
      v = generic vertical trail
      origin: generic cross trail
      0_end = ending trail in direction 0 (applies to 1, 2 and 3 too)
    */
    function placeTrail(pIndex, x, y, type) {
      if (typeof vm.game.trailMap[[x, y]] === 'undefined') {
        vm.game.trailMap[[x, y]] = {};
        vm.game.trailMap[[x, y]][pIndex] = { tick: 2, type: type };
      } else vm.game.trailMap[[x, y]][pIndex] = { tick: 2, type: type };
    }

    function recursiveDetonate(x, y, direction, range, pierce, pierceMode, owner) {
      if (range === 0 || (pierceMode === true && pierce < 0)) return;
      var output = getNextSquare(x, y, direction);
      var outputContents = $scope.checkSpaceBlocked(output[0], output[1]);
      if (outputContents === 'hb' || outputContents === 'sb') {
        if (typeof vm.game.portalMap[[output[0], output[1]]] !== 'undefined') {
          if (typeof vm.game.portalMap[[output[0], output[1]]][(direction + 2) % 4] !== 'undefined') {
            var player = vm.game.players[vm.game.portalMap[[output[0], output[1]]][(direction + 2) % 4].owner];
            if (player.orangePortal !== null && player.bluePortal !== null) { // then we're traveling through poooortals
              if (vm.game.portalMap[[output[0], output[1]]][(direction + 2) % 4].portalColor === 'orange') {
                recursiveDetonate(player.bluePortal.x, player.bluePortal.y, player.bluePortal.direction, range, pierce, pierceMode);
              } else {
                recursiveDetonate(player.orangePortal.x, player.orangePortal.y, player.orangePortal.direction, range, pierce, pierceMode);
              }
              return;
            }
          }
        }
      }
      var type;
      if (direction === 0 || direction === 2) type = 'h';
      else type = 'v';
      if (outputContents !== 'out') placeTrail(owner, output[0], output[1], type);
      else return;
      if (outputContents === 'b') detonate(output[0], output[1]);
      if (outputContents !== '') {
        pierceMode = true;
      }

      if (pierceMode === true) {
        recursiveDetonate(output[0], output[1], direction, range - 1, pierce - 1, true, owner);
      } else recursiveDetonate(output[0], output[1], direction, range - 1, pierce, false, owner);
    }

    // general bomb destroying function, handles chain reactions pretty well
    function detonate(bombX, bombY) { // detonates bomb at x,y
      if (typeof vm.game.bombMap[[bombX, bombY]] === 'undefined') return; // no bomb here?
      var bomb = vm.game.bombMap[[bombX, bombY]];
      vm.game.players[bomb.owner].bombCount++;
      delete vm.game.bombMap[[bombX, bombY]];
      placeTrail(bomb.owner, bombX, bombY, 'origin');
      for (var direction = 0; direction < 4; direction++) {
        var x = bombX;
        var y = bombY;
        recursiveDetonate(x, y, direction, vm.game.players[bomb.owner].bombRange, vm.game.players[bomb.owner].bombPierce, false, bomb.owner);
      }
    }

    // deletes portal(s) from location, usage: direction is either 0-4 for one portal, -1 for all
    function deletePortal(x, y, direction) {
      if (typeof vm.game.portalMap[[x, y]] !== 'undefined') {
        for (var portalDirection in vm.game.portalMap[[x, y]]) { // js iterate through hashmap
          if (vm.game.portalMap[[x, y]].hasOwnProperty(portalDirection)) {
            if (direction === Number.parseInt(portalDirection, 10) || direction === -1) { // if this is true, finally delete the portal(s)
              if (vm.game.portalMap[[x, y]][portalDirection].portalColor === 'orange') {
                vm.game.players[vm.game.portalMap[[x, y]][portalDirection].owner].orangePortal = null;
              } else {
                vm.game.players[vm.game.portalMap[[x, y]][portalDirection].owner].bluePortal = null;
              }
              delete vm.game.portalMap[[x, y]][portalDirection];
            }
          }
        }
      }
    }

    function shootPortal(playerIndex, direction, portalColor) {
      var playerX = vm.game.players[playerIndex].x;
      var playerY = vm.game.players[playerIndex].y;
      var nextSquare = getNextSquare(playerX, playerY, direction);
      var nextSquareContents = $scope.checkSpaceBlocked(nextSquare[0], nextSquare[1]);
      while (nextSquareContents !== 'hb' && nextSquareContents !== 'sb') {
        nextSquare = getNextSquare(nextSquare[0], nextSquare[1], direction);
        nextSquareContents = $scope.checkSpaceBlocked(nextSquare[0], nextSquare[1]);
      }
      // nextSquare guaranteed to be a block at this point
      // 0 = left, 1 = up, 2 = right, 3 = down, so (direction - 2) % 4 guaranteed to be opposite dir
      var newPortalDirection = (direction + 2) % 4;
      var newPortal = { x: nextSquare[0], y: nextSquare[1], direction: newPortalDirection };
      if (portalColor === 'orange') {
        if (vm.game.players[playerIndex].orangePortal !== null)
          deletePortal(vm.game.players[playerIndex].orangePortal.x, vm.game.players[playerIndex].orangePortal.y, vm.game.players[playerIndex].orangePortal.direction);
        vm.game.players[playerIndex].orangePortal = newPortal;
        if (typeof vm.game.portalMap[[nextSquare[0], nextSquare[1]]] === 'undefined')
          vm.game.portalMap[[nextSquare[0], nextSquare[1]]] = {};
        else deletePortal(nextSquare[0], nextSquare[1], newPortalDirection);
        vm.game.portalMap[[nextSquare[0], nextSquare[1]]][newPortalDirection] = { owner: playerIndex, portalColor: 'orange' };
      } else {
        if (vm.game.players[playerIndex].bluePortal !== null)
          deletePortal(vm.game.players[playerIndex].bluePortal.x, vm.game.players[playerIndex].bluePortal.y, vm.game.players[playerIndex].bluePortal.direction);
        vm.game.players[playerIndex].bluePortal = newPortal;
        if (typeof vm.game.portalMap[[nextSquare[0], nextSquare[1]]] === 'undefined')
          vm.game.portalMap[[nextSquare[0], nextSquare[1]]] = {};
        else deletePortal(nextSquare[0], nextSquare[1], newPortalDirection);
        vm.game.portalMap[[nextSquare[0], nextSquare[1]]][newPortalDirection] = { owner: playerIndex, portalColor: 'blue' };
      }
    }

    // submits a move
    $scope.submit = function(playerIndex, move) {
      if (playerIndex !== vm.game.moveOrder[vm.game.moveIterator]) return; // ignore moves out of order
      var player = vm.game.players[playerIndex];
      var output; // used in the switch case
      switch (move) {
        case 'ml': // move left
          output = simulateMovement(player.x, player.y, 0);
          player.x = output[0]; player.y = output[1]; player.orientation = output[2];
          break;
        case 'mu': // move up
          output = simulateMovement(player.x, player.y, 1);
          player.x = output[0]; player.y = output[1]; player.orientation = output[2];
          break;
        case 'mr': // move right
          output = simulateMovement(player.x, player.y, 2);
          player.x = output[0]; player.y = output[1]; player.orientation = output[2];
          break;
        case 'md': // move down
          output = simulateMovement(player.x, player.y, 3);
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
          if (typeof vm.game.bombMap[[player.x, player.y]] !== 'undefined' || player.bombCount === 0) break; // already standing on bomb or bombCount = 0
          player.bombCount--;
          vm.game.bombMap[[player.x, player.y]] = { owner: playerIndex, tick: 5 }; // TODO: change this to 4
          break;
        case 'buy_count': // buys an extra bomb
          if (player.coins < 1) break;
          player.bombCount++;
          player.coins -= 1;
          break;
        case 'buy_pierce': // buys pierce
          if (player.coins < 1) break;
          player.bombPierce++;
          player.coins -= 1;
          break;
        case 'buy_range': // buys pierce
          if (player.coins < 1) break;
          player.bombRange++;
          player.coins -= 1;
          break;
        // TODO: balance buying block? right now it costs just as much to create something then destroy it
        case 'buy_block': // buys new block
          // first figure out how much block would cost
          var newBlockPos = getNextSquare(player.x, player.y, player.orientation);
          if ($scope.checkSpaceBlocked(newBlockPos[0], newBlockPos[1]) !== '') break; // can't put a block on something else
          var blockCost = getBlockValue(newBlockPos[0], newBlockPos[1]);
          if (player.coins < blockCost) {
            console.log('insufficient coinage to buy block, block cost at ' + newBlockPos[0] + ',' + newBlockPos[1] + '=' + blockCost);
            break;
          }
          vm.game.softBlockBoard[newBlockPos[0]][newBlockPos[1]] = 1;
          player.coins -= blockCost;
          break;
        case 'op': // orange portal
          shootPortal(playerIndex, player.orientation, 'orange');
          console.log(vm.game.portalMap);
          console.log(vm.game.players[playerIndex].orangePortal);
          break;
        case 'bp': // blue portal
          shootPortal(playerIndex, player.orientation, 'blue');
          console.log(vm.game.players[playerIndex].bluePortal);
          break;
      }
      vm.game.moveIterator++;
      // once moveIterator hits the end of the list, we're at the end of turn resolving
      // 1. switch move order (first player is put to the back of the list)
      // 2. bombs are ticked down, bombs with tick = 0 generate trails
      // 3. trails are ticked, killing players/blocks etc
      // 4. MORE COMING THX
      if (vm.game.moveIterator === vm.game.players.length) { // currently doesn't switch move order, change?
        vm.game.moveIterator = 0;
        // first, move player who moved first time to end of the list
        vm.game.moveOrder.push(vm.game.moveOrder[0]); // add first player to end
        vm.game.moveOrder.splice(0, 1); // remove first element
        // then, tick bombs and detonate those who are at 0
        for (var bomb in vm.game.bombMap) {
          if (vm.game.bombMap.hasOwnProperty(bomb)) {
            vm.game.bombMap[bomb].tick -= 1;
            if (vm.game.bombMap[bomb].tick === 0) { // when tick hits 0, detonate!
              var bombArray = bomb.split(',');
              var bombX = Number.parseInt(bombArray[0], 10);
              var bombY = Number.parseInt(bombArray[1], 10);
              detonate(bombX, bombY);
            }
          }
        }
        // console.log(vm.game.trailMap);
        for (var trailSquare in vm.game.trailMap) { // trail step
          if (vm.game.trailMap.hasOwnProperty(trailSquare)) {
            for (var trail in vm.game.trailMap[trailSquare]) {
              if (vm.game.trailMap[trailSquare].hasOwnProperty(trail)) {
                var trailArray = trailSquare.split(',');
                var trailX = Number.parseInt(trailArray[0], 10);
                var trailY = Number.parseInt(trailArray[1], 10);
                vm.game.trailMap[trailSquare][trail].tick -= 1;
                trailResolveSquare(trailX, trailY);
                if (vm.game.trailMap[trailSquare][trail].tick === 0) delete vm.game.trailMap[trailSquare][trail];
              }
            }
          }
        }
      }
    };
  }

  GamesController.$inject = ['$scope', '$state', 'gameResolve', '$window', 'Socket'];

  function GamesController($scope, $state, game, $window, Socket) {
    var vm = this;
    vm.fullGame = game; // holds current game state, also game details
    vm.replay = game.replay;
    vm.game = vm.replay[vm.replay.length - 1]; // current snapshot to show on the screen
    vm.replayIterator = vm.replay.length - 1;
    console.log(vm.replayIterator);

    $scope.stepTo = function(i) {
      if (i < vm.replay.length) {
        vm.replayIterator = i;
        vm.game = vm.replay[i];
      }
    };

    $scope.stepForward = function() {
      if (vm.replayIterator < vm.replay.length - 1) {
        vm.replayIterator++;
        vm.game = vm.replay[vm.replayIterator];
      }
    };

    $scope.stepBack = function() {
      if (vm.replayIterator > 0) {
        vm.replayIterator--;
        vm.game = vm.replay[vm.replayIterator];
      }
    };
  }
}());
