(function () {
  'use strict';

  angular
    .module('games')
    .run(menuConfig);

  menuConfig.$inject = ['menuService'];

  function menuConfig(menuService) {
    menuService.addMenuItem('topbar', {
      title: 'Games',
      state: 'games',
      type: 'dropdown',
      roles: ['*']
    });

    // Add the dropdown list item
    menuService.addSubMenuItem('topbar', 'games', {
      title: 'List Games',
      state: 'games.list'
    });

    // Add the dropdown create item
    menuService.addSubMenuItem('topbar', 'games', {
      title: 'Create Games',
      state: 'games.create',
      roles: ['user']
    });
  }
}());
