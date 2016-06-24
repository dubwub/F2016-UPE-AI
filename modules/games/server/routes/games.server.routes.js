'use strict';

/**
 * Module dependencies
 */
var gamesPolicy = require('../policies/games.server.policy'),
  games = require('../controllers/games.server.controller');

module.exports = function (app) {
  // Articles collection routes
  app.route('/api/games').all(gamesPolicy.isAllowed)
    .get(games.list)
    .post(games.create);

  // Single article routes
  app.route('/api/games/:gameId').all(gamesPolicy.isAllowed)
    .get(games.read)
    .put(games.update)
    .delete(games.delete);

  // Test update article with POST
  app.route('/api/games/update/:gameId')
    .post(games.update);

  // Submit move
  app.route('/api/games/submit/:playerId/:gameId')
    .post(games.submit);

  // Finish by binding the article middleware
  app.param('gameId', games.gameByID);
  app.param('playerId', games.playerByID);
};
