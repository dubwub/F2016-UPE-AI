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
  // var io = require('socket.io-client')('http://localhost:3000/');
  // io.on('connect', function() {
  //   io.send('testEmit', { message: 'holy shit tihtithi' });
  //   io.emit('testEmit', { message: 'holy shit it worked' });
  // });
  // io.emit('testEmit', { message: 'newGame' });
  // console.log("req");
  // console.log(req.socket);
  // req.socket.emit('testEmit', { message: 'no fucking way' });
  // console.log("res");
  // console.log(res);
  if (saved_res === -1) { // first person who searches reaches here
    saved_res = res; // save their request object and ID
    saved_person_id = req.body.personID;
  } else { // second person reaches here
    var people = [saved_person_id, req.body.personID];
    var new_handler = new Handler(people, function(err) { // create new Handler object for new Game, the new Game will be init in Handler constructor
      res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    });
    handlers[new_handler.id] = new_handler; // add to assoc. array (hashmap)

    var output = {}; // create output to be sent back to requestors
    output.gameID = new_handler.id;

    var playerIndex = 0;
    for (var pid in new_handler.players) { // iterate through players
      if (new_handler.players.hasOwnProperty(pid)) {
        output.playerID = new_handler.players[pid]._id;
        output.x = new_handler.players[pid].x;
        output.y = new_handler.players[pid].y;
        if (playerIndex === 0) {
          saved_res.json(output);
        } else if (playerIndex === 1) {
          res.json(output);
        }
        playerIndex++;
      }
    }

    saved_res = -1; // reset search request (PROBABLY STILL NEEDS MUTEX)
    saved_person_id = -1;
  }
};


/**
 * Create new game (DEPRECIATED, REMOVE)
 */
/* exports.create = function (req, res) {
  var game = new Game();
  game.people = [0, 1]; // temporary
  game.players = [];
  game.people.forEach(function(person) {
    var player = new Player();
    player.game = game._id;
    player.person = person;
    if (person === game.people[0]) { // initialize player position
      player.x = 0;
      player.y = 0;
    } else {
      player.x = 9;
      player.y = 9;
    }
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
}; */

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
 * Update game status, SHOULD BE DEPRECATED (updating should be entirely backend)
 */
/* exports.update = function (req, res) {
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
}; */

/**
 * Delete an article (SHOULD BE DEPRECATED)
 */
/* exports.delete = function (req, res) {
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
}; */

/**
 * Submit a move
 */
exports.submit = function (req, res) {
  var game = req.game;
  handlers[game._id].submitMove(req.body.move, req.body.playerID, function(err) {
    if (err === "success") res.json(err);
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
