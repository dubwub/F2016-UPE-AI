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
  Handler = require('./Handler'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller'));

var Class = {
  Game: require('../../Class/Game'),
  Player: require('../../Class/Player')
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

// willThisEvenWork.$inject = ['Socket'];
// function willThisEvenWork(Socket) {
//   console.log('Socket');
//   console.log(Socket);
// }
// console.log(socketio);
// var io = io();

exports.search = function (req, res) {
  if (saved_res === -1) { // first person who searches reaches here
    saved_res = res; // save their request object and ID
    saved_person_id = req.body.personID;
  } else { // second person reaches here
    var people = [saved_person_id, req.body.personID];
    var new_handler = new Handler(people, Class, function(err) { // create new Handler object for new Game, the new Game will be init in Handler constructor
      if (err) res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    });
    handlers[new_handler.id] = new_handler; // add to assoc. array (hashmap)

    var output = {}; // create output to be sent back to requestors
    output.gameID = new_handler.id;

    // for loop that will run exactly twice all the time (still a four loop in case this needs to be extended)
    for (var i = 0; i < new_handler.players.length; i++) {
      output.playerID = new_handler.players[i].getID();
      output.x = new_handler.players[i].x;
      output.y = new_handler.players[i].y;
      if (i === 0) {
        saved_res.json(output);
      } else if (i === 1) {
        res.json(output);
      }
    }
    saved_res = -1; // reset search request (PROBABLY STILL NEEDS MUTEX)
    saved_person_id = -1;
  }
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
  // console.log(game);
  handlers[game._id].submitMove(req.body.move, req.body.playerID, function(err, data) {
    if (err) res.json(err);
    else console.log(data);
  });
};

/**
 * List of Games
 */
exports.list = function (req, res) {
  // Game.find().sort('-created').populate('people').exec(function (err, games) { // need to populate eventually
  Game.find().sort('-created').populate('players').exec(function (err, games) {
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


  req.player = id; // TEMOPRARY UNTIL CREDENTIALS ARE ADDED
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
