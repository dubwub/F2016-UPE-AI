(function () {
  'use strict';

  angular
    .module('games')
    .controller('GamesController', GamesController);

  angular
    .module('games')
    .controller('TrainingController', TrainingController);

  TrainingController.$inject = ['$scope', '$window', 'TrainingService'];
  function TrainingController($scope, $window, TrainingService) {
    // console.log(Game);
    var vm = this;
    vm.game = {
      boardSize: 5
    };
    vm.game.players = [{ x: 0, y: 0 }, { x: vm.game.boardSize - 1, y: vm.game.boardSize - 1 }];
    vm.game.submittedMoves = {};

    function createArray(length) { // literally creates a new array with params e.g. createArray(5,3)
      var arr = new Array(length || 0);
      var i = length;

      if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while (i--) arr[length - 1 - i] = createArray.apply(this, args);
      }

      return arr;
    }

    // if performance becomes an issue, convert this to an actual bitboard
    vm.game.blockBoard = createArray(vm.game.boardSize, vm.game.boardSize);
    for (var i = 0; i < vm.game.boardSize; i++) { // init everything to 0 (easier way?)
      for (var j = 0; j < vm.game.boardSize; j++) {
        vm.game.blockBoard[i][j] = 0;
      }
    }
    vm.game.blockBoard[1][1] = 1;
    vm.game.blockBoard[vm.game.boardSize - 2][vm.game.boardSize - 2] = 1;
    // console.log(vm.game.blockBoard);

    function getTargetSquares() {
      var targetSquares = {};
      vm.game.players.forEach(function(player, index) {
        var targetSquare = { player: index };
        switch (vm.game.submittedMoves[index]) {
          case 'l': // move left
            targetSquare.y = vm.game.players[index].y;
            targetSquare.x = vm.game.players[index].x;
            if (vm.game.blockBoard[targetSquare.x - 1][targetSquare.y] === 1) break;
            targetSquare.x--;
            if (targetSquare.x < 0) targetSquare.x = 0;
            break;
          case 'r': // move right
            targetSquare.y = vm.game.players[index].y;
            targetSquare.x = vm.game.players[index].x;
            if (vm.game.blockBoard[targetSquare.x + 1][targetSquare.y] === 1) break;
            targetSquare.x++;
            if (targetSquare.x >= vm.game.boardSize) targetSquare.x = vm.game.boardSize - 1;
            break;
          case 'u': // move up
            targetSquare.x = vm.game.players[index].x;
            targetSquare.y = vm.game.players[index].y;
            if (vm.game.blockBoard[targetSquare.x][targetSquare.y - 1] === 1) break;
            targetSquare.y--;
            if (targetSquare.y < 0) targetSquare.y = 0;
            break;
          case 'd': // move down
            targetSquare.x = vm.game.players[index].x;
            targetSquare.y = vm.game.players[index].y;
            if (vm.game.blockBoard[targetSquare.x][targetSquare.y + 1] === 1) break;
            targetSquare.y++;
            if (targetSquare.y >= vm.game.boardSize) targetSquare.y = vm.game.boardSize - 1;
            break;
          case '':
            targetSquare.x = vm.game.players[index].x;
            targetSquare.y = vm.game.players[index].y;
        }
        // console.log(targetSquare);
        targetSquares[index] = targetSquare; // hash everything by index, not player (object keys???)
      });
      return targetSquares; // all targetSquares should theoretically be legal targets
    }

    $scope.submit = function(playerIndex, move) {
      vm.game.submittedMoves[playerIndex] = move;
      if (Object.keys(vm.game.submittedMoves).length === vm.game.players.length) { // all moves submitted
        // first, determine target squares then determine if it is a legal move
        // things that are non-legal:
        // 1. moving outside the box (target sq. is then set to current pos.)
        // 2. moving into a solid object (block, bomb) (target sq. is then set to current pos.)
        // 2a. moving into a portal that leads to a solid object (bomb/block)
        // 3. if two players share the same legal target square, neither moves (they move into and bounce)
        // 4. if two players try to move through each other (their target squares are the others' current pos.)
        var targetSquares = getTargetSquares();
        var resolveBoard = createArray(vm.game.boardSize, vm.game.boardSize); // there may be a better way of doing this
        vm.game.players.forEach(function (player, index) { // first pass, fill in all target squares
          var playerObj = { player: index, state: 'origin' };
          var targetObj = { player: index, state: 'target' };
          if (typeof resolveBoard[player.x][player.y] === 'undefined') resolveBoard[player.x][player.y] = [playerObj];
          else resolveBoard[player.x][player.y].push(playerObj);
          if (typeof resolveBoard[targetSquares[index].x][targetSquares[index].y] === 'undefined')
            resolveBoard[targetSquares[index].x][targetSquares[index].y] = [targetObj];
          else resolveBoard[targetSquares[index].x][targetSquares[index].y].push(targetObj);
        });
        /*
          the following code is optimized for 1v1, to expand to multiplayer it's doable but a litle complicated
          e.g. what happens if someone wants to walk into someone else's origin square and they're moving away
          but that person and one other person is walking into a target square, so they bump and you need to make
          sure no one moves?

          we can make a bunch of assumptions that work if it's 1v1 however:
          if a person is in a square, it will always be a legal square the next turn
          if we realize the person's legal target square doesn't work, we can keep them in the same place as they were the
          last turn with no repercussions as long as we keep the targetsquare in the resolveboard, this will allow the other
          player to come to the same conclusion.
        */
        vm.game.players.forEach(function (player, index) { // second pass, find joint cross throughs and target square sharing and resolve
          if (resolveBoard[targetSquares[index].x][targetSquares[index].y].length > 1) {
            // there are 4 cases here in a 1v1
            // 1: this player's target square overlaps with another target square
            // 2: this player's target square overlaps with an origin square
            // 3: this player's target square overlaps with a target and origin square
            // 4: this player's target square overlaps with its own origin square
            var otherIndex = -1; // first, find first object that isn't owned by this object
            for (var i = 0; i < resolveBoard[targetSquares[index].x][targetSquares[index].y].length; i++) {
              if (resolveBoard[targetSquares[index].x][targetSquares[index].y][i].player !== index) { // probably change this term to not be confusing
                otherIndex = i;
              }
            }
            // console.log(otherIndex);
            if (otherIndex === -1) return; // case 4, don't move
            var otherObj = resolveBoard[targetSquares[index].x][targetSquares[index].y][otherIndex];
            // covers cases 1 and 3, stays still
            if (otherObj.state === 'target' || resolveBoard[targetSquares[index].x][targetSquares[index].y].length === 3) {
              return;
            } else if (resolveBoard[player.x][player.y].length > 1) { // case 2
              return;
            } else { // legal, move (find a way to remove boilerplate from below?)
              player.x = targetSquares[index].x;
              player.y = targetSquares[index].y;
            }
          } else { // legal, move
            player.x = targetSquares[index].x;
            player.y = targetSquares[index].y;
          }
        });
        vm.game.submittedMoves = {};
      }
    };
  }

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
    $scope.$on('$destroy', function () {
      Socket.removeListener('gameUpdate');
      Socket.removeListener('testEmit');
    });

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
