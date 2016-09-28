(function () {
  'use strict';

  angular
    .module('users')
    .controller('LeaderboardController', LeaderboardController);

  LeaderboardController.$inject = ['LeaderboardService'];

  function LeaderboardController(LeaderboardService) {
    var vm = this;

    vm.users = LeaderboardService.query();
  }
}());
