'use strict';

// seek
var saved_person_id = -1; // MUTEX MAY BE NEEDED HERE
var saved_res;
var game_id = -1;
/**
 * Module dependencies
 */
var path = require('path'),
  mongoose = require('mongoose'),
  Game = mongoose.model('Game'),
  Player = mongoose.model('Player'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller'));

/**
 * search for a game
 */
exports.search = function (req, res) {
  if (saved_person_id === -1) { // first searcher
    console.log('searching');
    saved_person_id = req.body.personID;
    saved_res = res;
  } else {
    console.log('found one');
    var game = new Game();
    game.people = [saved_person_id, req.body.personID]; // temporary
    game.players = [];
    game.people.forEach(function(person) {
      var player = new Player();
      player.game = game._id;
      player.person = person;
      player.save(function (err) {
        if (err) {
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        } // else {
          // res.json(game);
        // }
      });
      game.players.push(player._id);
    });

    game.save(function (err) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      } else {
        game_id = game._id;
        saved_person_id = -1;
        saved_res.json('starting game ' + game._id);
        res.json('starting game ' + game._id);
      }
    });
  }
};


/**
 * Create new game (soon to be depreciated)
 */
exports.create = function (req, res) {
  var game = new Game();
  // console.log(game);
  //  game.players = [];
  //  req.body.players.forEach(player) {
  //  game.players.push(new Player(player));
  // }
  game.people = [0, 1]; // temporary
  game.players = [];
  game.people.forEach(function(person) {
    var player = new Player();
    player.game = game._id;
    player.person = person;
    player.save(function (err) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      } // else {
        // res.json(game);
      // }
    });
    game.players.push(player._id);
  });
  //  var players = new Game(req.body.player);

  //  article.user = req.user;

  game.save(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(game);
    }
  });
};

/**
 * Show the current game
 */
exports.read = function (req, res) {
  // convert mongoose document to JSON
  var game = req.game ? req.game.toJSON() : {};

  // Add a custom field to the Article, for determining if the current User is the "owner".
  // NOTE: This field is NOT persisted to the database, since it doesn't exist in the Article model.
  //  article.isCurrentUserOwner = !!(req.user && article.user && article.user._id.toString() === req.user._id.toString());

  res.json(game);
};

/**
 * Update game status
 */
exports.update = function (req, res) {
  var game = req.game;
  game.status = req.body.status;

  // article.title = req.body.title;
  // article.content = req.body.content;

  game.save(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(game);
    }
  });
};

/**
 * Delete an article
 */
exports.delete = function (req, res) {
  var game = req.game;

  game.remove(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(game);
    }
  });
};

/**
 * Delete an article
 */
exports.submit = function (req, res) {
  // count++;
  // console.log(count);
  // return res.json("count = " + count);
  /* var game = req.game;
  var player = req.player;
  var move = req.move;
  player.save(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(player);
    }
  });*/
};

/**
 * List of Articles
 */
exports.list = function (req, res) {
  // Game.find().sort('-created').populate('people').exec(function (err, games) { // need to populate eventually
  Game.find().sort('-created').exec(function (err, games) {
    if (err) {
      // console.log(err);
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(games);
    }
  });
};

/**
 * Article middleware
 */
exports.gameByID = function (req, res, next, id) {

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({
      message: 'Game is invalid'
    });
  }

  // Game.findById(id).populate('players', 'people').exec(function (err, game) { // MERGE EVENTUALLY
  Game.findById(id).populate('players').exec(function (err, game) {
    if (err) {
      return next(err);
    } else if (!game) {
      return res.status(404).send({
        message: 'No article with that identifier has been found'
      });
    }
    req.game = game;
    // console.log(game.players[0]); <-- TEST TO SEE IF POPULATE WORKED
    next();
  });
};

exports.playerByID = function (req, res, next, id) {

  /* if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({
      message: 'Game is invalid'
    });
  }*/


  req.player = id;
  next();

  /* Game.findById(id).populate('players', 'people').exec(function (err, game) {
    if (err) {
      return next(err);
    } else if (!article) {
      return res.status(404).send({
        message: 'No article with that identifier has been found'
      });
    }
    req.game = game;
    next();
  });*/
};
