'use strict';

// USED FOR EXPORTS.SEARCH, PROBABLY NEED A MUTEX OR CLEANUP OF SOME SORT
var saved_res = -1;
var saved_person_id = -1;

/**
 * Module dependencies
 */
var path = require('path'),
  mongoose = require('mongoose'),
  Game = mongoose.model('Game'),
  Player = mongoose.model('Player'),
  User = mongoose.model('User'),
  Handler = require('./Handler'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller'));

var Class = {
  Game: require('../../Class/Game'),
  Player: require('../../Class/Player'),
  User: mongoose.model('User')
};

/*
    Handler "hash map", maybe in the future convert it to an actual hashmap
    Each handler is hashed to the gameID of the game it handles
*/
var handlers = {};

/**
 * search for a game [only kinda works for 2 people rn]

 really primitive search right now: stores first search request and then responds to both search requests
 at the same time
 */

function verifyAccount (req, res, id, username, next) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).send({
      message: 'Account ID is invalid'
    });
    return false;
  }

  var returnValue = true;
  User.findById(id).populate('users').exec(function (err, user) {
    if (err) {
      console.log(err);
    } else if (!user || user && user.username !== username) {
      res.status(404).send({
        message: 'No user with that identifier has been found'
      });
      returnValue = false;
      return returnValue;
    }
    req.user = user;
    returnValue = true;
    next(req, res);
  });
  return returnValue;
}

function performSearch(req, res) {
  if (saved_res === -1) { // first person who searches reaches here
    saved_res = res; // save their request object and ID
    saved_person_id = req.body.accountID;
  } else { // second person reaches here
    var people = [saved_person_id, req.body.accountID];
    var new_handler = new Handler(people, Class, function(err) { // create new Handler object for new Game, the new Game will be init in Handler constructor
      if (err) res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    });
    handlers[new_handler.id] = new_handler; // add to assoc. array (hashmap)

    // var output = {}; // create output to be sent back to requestors
    // output.gameID = new_handler.id;

    // for loop that will run exactly twice all the time (still a four loop in case this needs to be extended)
    for (var i = 0; i < new_handler.players.length; i++) {
      if (i === 0) {
        saved_res.json(new_handler.game.sanitizedForm(0));
      } else if (i === 1) {
        res.json(new_handler.game.sanitizedForm(1));
      }
    }
    saved_res = -1; // reset search request (PROBABLY STILL NEEDS MUTEX)
    saved_person_id = -1;
  }
}


exports.search = function (req, res) {
  verifyAccount(req, res, req.body.accountID, req.body.username, performSearch);
};

/**
 * Show the current game
 */
exports.read = function (req, res) {
  // convert mongoose document to JSON
  var game = req.game ? req.game.toJSON() : {};

  res.json(game);
};

/**
 * Submit a move
 */
exports.submit = function (req, res) {
  var game = req.game;
  // if (typeof handlers[game._id] === 'undefined') {
  //   res.json('That game does not exist, it may have been completed.');
  // }
  handlers[game._id].submitMove(req.body.move, req.body.playerID, function(err, data) {
    if (err) res.json(err);
    else res.json(data);
  });
};

/**
 * List of Games
 */
exports.list = function (req, res) {
  // Game.find().sort('-created').populate('people').exec(function (err, games) { // need to populate eventually
  Game.find().sort('-created').populate('people').exec(function (err, games) {
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

// training mode, doesn't really need anything here tbh
exports.training = function (req, res) {
  // console.log(Class);
  // console.log(res);
  res.json(Class);
  // return Class;
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
  Game.findById(id).populate('players people').exec(function (err, game) {
    if (err) {
      return next(err);
    } else if (!game) {
      return res.status(404).send({
        message: 'No article with that identifier has been found'
      });
    }
    req.game = game;
    next();
  });
};

exports.accountByID = function (req, res, next, id) {

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({
      message: 'Account ID is invalid'
    });
  }

  // req.player = id; // TEMOPRARY UNTIL CREDENTIALS ARE ADDED
  // next();

  User.findById(id).populate('users').exec(function (err, user) {
    if (err) {
      return next(err);
    } else if (!user) {
      return res.status(404).send({
        message: 'No user with that identifier has been found'
      });
    }
    console.log(user);
    req.user = user;
    next();
  });
};
