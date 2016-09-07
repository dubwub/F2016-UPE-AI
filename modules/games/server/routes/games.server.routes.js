'use strict';

/**
 * Module dependencies
 */
var gamesPolicy = require('../policies/games.server.policy'),
  games = require('../controllers/games.server.controller');

module.exports = function (app) {
  // Articles collection routes
  app.route('/api/games') // .all(gamesPolicy.isAllowed)
    .get(games.list);

  // Training mode
  app.route('/api/games/training')
    .get(games.training);

  // Test update article with POST
  app.route('/api/games/search')
    .post(games.search);

  // Single game route
  // fun fact if this is before any other route that has /games/ it will register this
  // route before registering that one
  app.route('/api/games/:gameId') // .all(gamesPolicy.isAllowed)
    .get(games.read);

  // Submit move
  app.route('/api/games/submit/:gameId')
    .post(games.submit);

  // Finish by binding the article middleware
  app.param('gameId', games.gameByID);
  app.param('accountID', games.accountByID);
};
