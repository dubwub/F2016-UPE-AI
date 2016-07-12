(function () {
  'use strict';

  angular
    .module('games')
    .controller('GamesController', GamesController);

  GamesController.$inject = ['$scope', '$state', 'gameResolve', '$window', 'Authentication'];

  function GamesController($scope, $state, game, $window, Authentication) {
    var vm = this;

    vm.game = game;
    vm.authentication = Authentication;
    vm.error = null;
    vm.form = {};
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
