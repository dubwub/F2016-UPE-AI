(function () {
  'use strict';

  angular
    .module('games.routes')
    .config(routeConfig);

  routeConfig.$inject = ['$stateProvider'];

  function routeConfig($stateProvider) {
    $stateProvider
      .state('games', {
        abstract: true,
        url: '/games',
        template: '<ui-view/>'
      })
      .state('games.list', {
        url: '',
        templateUrl: 'modules/games/client/views/list-games.client.view.html',
        controller: 'GamesListController',
        controllerAs: 'vm',
        data: {
          pageTitle: 'Games List'
        }
      })
      .state('games.training', {
        url: '/training',
        templateUrl: 'modules/games/client/views/training-game.client.view.html',
        controller: 'TrainingController',
        controllerAs: 'vm',
        data: {
          pageTitle: 'Training Mode'
        }
      })
      // .state('games.create', {
      //   url: '/create',
      //   templateUrl: 'modules/games/client/views/form-game.client.view.html',
      //   controller: 'GamesController',
      //   controllerAs: 'vm',
      //   resolve: {
      //     gameResolve: newGame
      //   },
      //   data: {
      //     roles: ['user', 'admin'],
      //     pageTitle: 'Games Create'
      //   }
      // })
      // .state('games.edit', {
      //   url: '/:gameId/edit',
      //   templateUrl: 'modules/games/client/views/form-game.client.view.html',
      //   controller: 'GamesController',
      //   controllerAs: 'vm',
      //   resolve: {
      //     gameResolve: getGame
      //   },
      //   data: {
      //     roles: ['user', 'admin'],
      //     pageTitle: 'Edit Game {{ gameResolve.title }}'
      //   }
      // })
      .state('games.view', {
        url: '/:gameId',
        templateUrl: 'modules/games/client/views/view-game.client.view.html',
        controller: 'GamesController',
        controllerAs: 'vm',
        resolve: {
          gameResolve: getGame
        },
        data: {
          pageTitle: 'Game {{ gameResolve.title }}'
        }
      });
  }

  getGame.$inject = ['$stateParams', 'GamesService'];

  function getGame($stateParams, GamesService) {
    return GamesService.get({
      gameId: $stateParams.gameId
    }).$promise;
  }

  newGame.$inject = ['GamesService'];

  function newGame(GamesService) {
    return new GamesService();
  }
}());
