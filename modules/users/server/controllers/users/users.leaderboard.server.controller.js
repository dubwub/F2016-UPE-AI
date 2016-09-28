var path = require('path'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller')),
  mongoose = require('mongoose'),
  User = mongoose.model('User');

/**
 * List of Users
 */
exports.leaderboard = function (req, res) {
  User.find({}, '-salt -password -_id -email').limit(15).sort({ elo: -1 }).populate('user', 'username').exec(function (err, users) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }

    res.json(users);
  });
};
