(function () {
  'use strict';

  angular
    .module('games.services')
    .factory('GamesService', GamesService);

  angular
    .module('games.services')
    .factory('TrainingService', TrainingService);

  GamesService.$inject = ['$resource'];
  TrainingService.$inject = ['$resource'];

  function GamesService($resource) {
    return $resource('api/games/:gameId', {
      gameId: '@_id'
    }, {
      update: {
        method: 'PUT'
      }
    });
  }

  function TrainingService($resource) { // USELESS, REMOVE
    var output = $resource('api/games/training1', {}, {});
    // console.log(output);
    return output;
  }
}());
