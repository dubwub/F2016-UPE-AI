(function () {
  'use strict';

  angular
    .module('games.services')
    .factory('GamesService', GamesService);

  GamesService.$inject = ['$resource'];

  function GamesService($resource) {
    return $resource('api/games/:gameId', {
      gameId: '@_id'
    }, {
      update: {
        method: 'PUT'
      }
    });
  }
}());
