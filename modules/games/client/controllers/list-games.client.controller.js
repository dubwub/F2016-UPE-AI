(function () {
  'use strict';

  angular
    .module('games')
    .controller('GamesListController', GamesListController);

  GamesListController.$inject = ['GamesService'];

  function GamesListController(GamesService) {
    var vm = this;

    vm.games = GamesService.query();
  }
}());
