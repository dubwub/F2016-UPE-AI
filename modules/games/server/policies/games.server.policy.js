// TODO:
// ANYONE SHOULD BE ABLE TO VIEW GAMETV
// SPECIFIC ROUTE

'use strict';

/**
 * Module dependencies
 */
var acl = require('acl');

// Using the memory backend
acl = new acl(new acl.memoryBackend());

/**
 * Invoke Games Permissions
 */
exports.invokeRolesPolicies = function () {
  acl.allow([{
    roles: ['admin'],
    allows: [{
      resources: '/api/games',
      permissions: '*'
    }, {
      resources: '/api/games/:gameId',
      permissions: '*'
    }]
  }, {
    roles: ['user'],
    allows: [{
      resources: '/api/games',
      permissions: ['get', 'post']
    }, {
      resources: '/api/games/:gameId',
      permissions: ['get']
    }]
  }, {
    roles: ['guest'],
    allows: [{
      resources: '/api/games',
      permissions: ['get']
    }, {
      resources: '/api/games/:gameId',
      permissions: ['get']
    }]
  }]);
};

/**
 * Check If Games Policy Allows
 */
exports.isAllowed = function (req, res, next) {
  var roles = (req.user) ? req.user.roles : ['guest'];

  // If an game is being processed and the current user created it then allow any manipulation
  if (req.game && req.user && req.game.user && req.game.user.id === req.user.id) {
    return next();
  }

  // Check for user roles
  acl.areAnyRolesAllowed(roles, req.route.path, req.method.toLowerCase(), function (err, isAllowed) {
    if (err) {
      // An authorization error occurred
      return res.status(500).send('Unexpected authorization error');
    } else {
      if (isAllowed) {
        // Access granted! Invoke next middleware
        return next();
      } else {
        return res.status(403).json({
          message: 'User is not authorized'
        });
      }
    }
  });
};
