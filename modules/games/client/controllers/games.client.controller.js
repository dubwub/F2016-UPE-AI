(function () {
  'use strict';

  angular
    .module('games')
    .controller('GamesController', GamesController);

  angular
    .module('games')
    .controller('TrainingController', TrainingController);

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

    function createPlayer(x, y) {
      return {
        x: x,
        y: y,
        orientation: 0,
        bombRange: 3,
        bombPierce: 1,
        bombCount: 1,
        alive: true,
        coins: 0
      };
    }

    // this function initializes the game state, should be quite fine for most game boards.
    // the hard block generator works best in odd numbered boardSizes, and the softblockBoard doesn't really care.
    // right now this only initializes two players, and only spaces for two players.
    $scope.init = function() {
      vm.game.players = [createPlayer(1, 1), createPlayer(vm.game.boardSize - 2, vm.game.boardSize - 2)];
      vm.game.moveOrder = [0, 1];
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
    function getNextSquare(direction, x, y) {
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

    // handles trails resolving on players and soft blocks
    function trailResolveSquare(x, y) { // better name for this?
      if (typeof vm.game.trailMap[[x, y]] === 'undefined') return;
      var space = $scope.checkSpaceBlocked(x, y);
      if (space === 'sb') { // soft block here
        vm.game.softBlockBoard[x][y] = 0;
        for (var trail in vm.game.trailMap[[x, y]]) {
          if (vm.game.trailMap[[x, y]].hasOwnProperty(trail)) {
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
        for (var step = 0; step < vm.game.players[bomb.owner].bombRange; step++) {
          var output = getNextSquare(direction, x, y);
          x = output[0]; y = output[1];
          var type;
          if (direction === 0 || direction === 2) type = 'h';
          else type = 'v';
          var space = $scope.checkSpaceBlocked(x, y);
          if (space !== '') type = direction + '_end'; // TODO: this orientation stuff
          if (space !== 'out') placeTrail(bomb.owner, x, y, type);
          if (space === 'b') detonate(x, y); // chain reactions
          if (space !== '') {
            // once the detonation hits a solid object, pierce comes into effect
            // however note that pierce cannot go further than regular bomb range
            for (var pierce = 0; pierce < vm.game.players[bomb.owner].bombRange - step && pierce < vm.game.players[bomb.owner].bombPierce; pierce++) {
              var pierceOutput = getNextSquare(direction, x, y);
              x = pierceOutput[0]; y = pierceOutput[1];
              if ($scope.checkInBounds(x, y)) placeTrail(bomb.owner, x, y, type);
              else break;
            }
            break;
          }
        }
      }
    }

    // submits a move
    $scope.submit = function(playerIndex, move) {
      if (playerIndex !== vm.game.moveOrder[vm.game.moveIterator]) return; // ignore moves out of order
      var player = vm.game.players[playerIndex];
      switch (move) {
        case 'ml': // move left
          player.orientation = 0;
          if ($scope.checkSpaceBlocked(player.x - 1, player.y) !== '') break;
          player.x--;
          if (player.x < 0) player.x = 0;
          break;
        case 'mu': // move up
          player.orientation = 1;
          if ($scope.checkSpaceBlocked(player.x, player.y - 1) !== '') break;
          player.y--;
          if (player.y < 0) player.y = 0;
          break;
        case 'mr': // move right
          player.orientation = 2;
          if ($scope.checkSpaceBlocked(player.x + 1, player.y) !== '') break;
          player.x++;
          if (player.x >= vm.game.boardSize) player.x = vm.game.boardSize - 1;
          break;
        case 'md': // move down
          player.orientation = 3;
          if ($scope.checkSpaceBlocked(player.x, player.y + 1) !== '') break;
          player.y++;
          if (player.y >= vm.game.boardSize) player.y = vm.game.boardSize - 1;
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
          vm.game.bombMap[[player.x, player.y]] = { owner: playerIndex, tick: 4 }; // TODO: change this to 4
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
          var newBlockPos = getNextSquare(player.orientation, player.x, player.y);
          if ($scope.checkSpaceBlocked(newBlockPos[0], newBlockPos[1]) !== '') break; // can't put a block on something else
          var blockCost = getBlockValue(newBlockPos[0], newBlockPos[1]);
          if (player.coins < blockCost) {
            console.log('insufficient coinage to buy block, block cost at ' + newBlockPos[0] + ',' + newBlockPos[1] + '=' + blockCost);
            break;
          }
          vm.game.softBlockBoard[newBlockPos[0]][newBlockPos[1]] = 1;
          player.coins -= blockCost;
          // console.log('bought block that costs ' + blockCost);
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


  /*
    ALL OF BELOW IS COMMENTED OUT BECAUSE WE'RE SWITCHING TO ALTERNATING MOVES
  */

  // TrainingController.$inject = ['$scope', '$window', 'TrainingService'];
  // function TrainingController($scope, $window, TrainingService) {
  //   // console.log(Game);
  //   var vm = this;
  //   vm.game = {
  //     boardSize: 5 // stick to odd boardSizes, makes for most even distribution of indestr. blocks
  //   };
  //   vm.game.players = [{ x: 0, y: 0 }, { x: vm.game.boardSize - 1, y: vm.game.boardSize - 1 }];
  //   vm.game.submittedMoves = {};

  //   function createArray(length) { // literally creates a new array with params e.g. createArray(5,3)
  //     var arr = new Array(length || 0);
  //     var i = length;

  //     if (arguments.length > 1) {
  //       var args = Array.prototype.slice.call(arguments, 1);
  //       while (i--) arr[length - 1 - i] = createArray.apply(this, args);
  //     }

  //     return arr;
  //   }

  //   /*
  //     The game is represented using bitboards, similar to how chess engines typically work in code.
  //     The blockBoard (to be renamed) says whether there is a block or not in that square. The bombBoard
  //     does the same thing but with bombs.

  //     TODO: figure out how to tie the bombBoard with the fact that each one individually needs to tick
  //     and have a range and such component.
  //   */

  //   // if performance becomes an issue, convert this to an actual bitboard
  //   // consider https://www.npmjs.com/package/bitset
  //   vm.game.blockBoard = createArray(vm.game.boardSize, vm.game.boardSize);
  //   var i = 0; // "global" iterators because grunt hates everything that is fun
  //   var j = 0;
  //   for (i = 0; i < vm.game.boardSize; i++) { // make sure everything is defined
  //     for (j = 0; j < vm.game.boardSize; j++) {
  //       if ((i + 1) % 2 === 0 && (j + 1) % 2 === 0) vm.game.blockBoard[i][j] = 1; // even indices = add block
  //       else vm.game.blockBoard[i][j] = 0;
  //     }
  //   }
  //   // TODO:
  //   // constant time access to location of a bomb
  //   // as efficient as possible update to all bombs (turn ticking), also triggering explosion on bomb hits 0
  //   //
  //   vm.game.bombBoard = createArray(vm.game.boardSize, vm.game.boardSize);
  //   for (i = 0; i < vm.game.boardSize; i++) { // make sure everything is defined
  //     for (j = 0; j < vm.game.boardSize; j++) {
  //       vm.game.bombBoard[i][j] = 0;
  //     }
  //   }

  //   function getTargetSquares() {
  //     var targetSquares = {};
  //     vm.game.players.forEach(function(player, index) {
  //       var targetSquare = { player: index };
  //       switch (vm.game.submittedMoves[index]) {
  //         case 'l': // move left
  //           targetSquare.y = vm.game.players[index].y;
  //           targetSquare.x = vm.game.players[index].x;
  //           if (vm.game.blockBoard[targetSquare.x - 1][targetSquare.y] === 1) break;
  //           targetSquare.x--;
  //           if (targetSquare.x < 0) targetSquare.x = 0;
  //           break;
  //         case 'r': // move right
  //           targetSquare.y = vm.game.players[index].y;
  //           targetSquare.x = vm.game.players[index].x;
  //           if (vm.game.blockBoard[targetSquare.x + 1][targetSquare.y] === 1) break;
  //           targetSquare.x++;
  //           if (targetSquare.x >= vm.game.boardSize) targetSquare.x = vm.game.boardSize - 1;
  //           break;
  //         case 'u': // move up
  //           targetSquare.x = vm.game.players[index].x;
  //           targetSquare.y = vm.game.players[index].y;
  //           if (vm.game.blockBoard[targetSquare.x][targetSquare.y - 1] === 1) break;
  //           targetSquare.y--;
  //           if (targetSquare.y < 0) targetSquare.y = 0;
  //           break;
  //         case 'd': // move down
  //           targetSquare.x = vm.game.players[index].x;
  //           targetSquare.y = vm.game.players[index].y;
  //           if (vm.game.blockBoard[targetSquare.x][targetSquare.y + 1] === 1) break;
  //           targetSquare.y++;
  //           if (targetSquare.y >= vm.game.boardSize) targetSquare.y = vm.game.boardSize - 1;
  //           break;
  //         case '':
  //           targetSquare.x = vm.game.players[index].x;
  //           targetSquare.y = vm.game.players[index].y;
  //       }
  //       // console.log(targetSquare);
  //       targetSquares[index] = targetSquare; // hash everything by index, not player (object keys???)
  //     });
  //     return targetSquares; // all targetSquares should theoretically be legal targets
  //   }

  //   $scope.submit = function(playerIndex, move) {
  //     vm.game.submittedMoves[playerIndex] = move;
  //     if (Object.keys(vm.game.submittedMoves).length === vm.game.players.length) { // all moves submitted
  //       // first, determine target squares then determine if it is a legal move
  //       // things that are non-legal:
  //       // 1. moving outside the box (target sq. is then set to current pos.)
  //       // 2. moving into a solid object (block, bomb) (target sq. is then set to current pos.)
  //       // 2a. moving into a portal that leads to a solid object (bomb/block)
  //       // 3. if two players share the same legal target square, neither moves (they move into and bounce)
  //       // 4. if two players try to move through each other (their target squares are the others' current pos.)
  //       var targetSquares = getTargetSquares();
  //       var resolveBoard = createArray(vm.game.boardSize, vm.game.boardSize); // there may be a better way of doing this
  //       vm.game.players.forEach(function (player, index) { // first pass, fill in all target squares
  //         var playerObj = { player: index, state: 'origin' };
  //         var targetObj = { player: index, state: 'target' };
  //         if (typeof resolveBoard[player.x][player.y] === 'undefined') resolveBoard[player.x][player.y] = [playerObj];
  //         else resolveBoard[player.x][player.y].push(playerObj);
  //         if (typeof resolveBoard[targetSquares[index].x][targetSquares[index].y] === 'undefined')
  //           resolveBoard[targetSquares[index].x][targetSquares[index].y] = [targetObj];
  //         else resolveBoard[targetSquares[index].x][targetSquares[index].y].push(targetObj);
  //       });
  //       /*
  //         the following code is optimized for 1v1, to expand to multiplayer it's doable but a litle complicated
  //         e.g. what happens if someone wants to walk into someone else's origin square and they're moving away
  //         but that person and one other person is walking into a target square, so they bump and you need to make
  //         sure no one moves?

  //         we can make a bunch of assumptions that work if it's 1v1 however:
  //         if a person is in a square, it will always be a legal square the next turn
  //         if we realize the person's legal target square doesn't work, we can keep them in the same place as they were the
  //         last turn with no repercussions as long as we keep the targetsquare in the resolveboard, this will allow the other
  //         player to come to the same conclusion.
  //       */
  //       vm.game.players.forEach(function (player, index) { // second pass, find joint cross throughs and target square sharing and resolve
  //         if (resolveBoard[targetSquares[index].x][targetSquares[index].y].length > 1) {
  //           // there are 4 cases here in a 1v1
  //           // 1: this player's target square overlaps with another target square
  //           // 2: this player's target square overlaps with an origin square
  //           // 3: this player's target square overlaps with a target and origin square
  //           // 4: this player's target square overlaps with its own origin square
  //           var otherIndex = -1; // first, find first object that isn't owned by this object
  //           for (var i = 0; i < resolveBoard[targetSquares[index].x][targetSquares[index].y].length; i++) {
  //             if (resolveBoard[targetSquares[index].x][targetSquares[index].y][i].player !== index) { // probably change this term to not be confusing
  //               otherIndex = i;
  //             }
  //           }
  //           // console.log(otherIndex);
  //           if (otherIndex === -1) return; // case 4, don't move
  //           var otherObj = resolveBoard[targetSquares[index].x][targetSquares[index].y][otherIndex];
  //           // covers cases 1 and 3, stays still
  //           if (otherObj.state === 'target' || resolveBoard[targetSquares[index].x][targetSquares[index].y].length === 3) {
  //             return;
  //           } else if (resolveBoard[player.x][player.y].length > 1) { // case 2
  //             return;
  //           } else { // legal, move (find a way to remove boilerplate from below?)
  //             player.x = targetSquares[index].x;
  //             player.y = targetSquares[index].y;
  //           }
  //         } else { // legal, move
  //           player.x = targetSquares[index].x;
  //           player.y = targetSquares[index].y;
  //         }
  //       });
  //       vm.game.submittedMoves = {};
  //     }
  //   };
  // }

  GamesController.$inject = ['$scope', '$state', 'gameResolve', '$window', 'Socket'];

  function GamesController($scope, $state, game, $window, Socket) {
    var vm = this;

    vm.game = game;
    // vm.authentication = Authentication;
    vm.error = null;
    vm.form = {};

    // if (!Socket.socket) {
    //   Socket.connect();
    // }

    // Socket.on('testEmit', function(data) {
    //   console.log('FINALLY TESTEMIT');
    //   console.log(data);
    // });

    // Socket.emit('testEmit', { message: 'OMFG PLS' });

    // Socket.on('gameUpdate', function (newGame) {
    //   console.log("saw gameUpdate");
    //   if (vm.game._id === newGame._id) vm.game = newGame;
    // });
    // $scope.$on('$destroy', function () {
    //   Socket.removeListener('gameUpdate');
    //   Socket.removeListener('testEmit');
    // });

    // vm.remove = remove;
    // vm.save = save;

    // Remove existing Game
    /* function remove() {
      if ($window.confirm('Are you sure you want to delete?')) {
        vm.game.$remove($state.go('games.list'));
      }
    }

    // Save Game
    function save(isValid) {
      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'vm.form.gameForm');
        return false;
      }

      // TODO: move create/update logic to service
      if (vm.game._id) {
        vm.game.$update(successCallback, errorCallback);
      } else {
        vm.game.$save(successCallback, errorCallback);
      }

      function successCallback(res) {
        $state.go('games.view', {
          gameId: res._id
        });
      }

      function errorCallback(res) {
        vm.error = res.data.message;
      }
    } */
  }
}());
