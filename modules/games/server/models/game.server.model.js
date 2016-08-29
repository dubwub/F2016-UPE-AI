'use strict';

/**
 * Module dependencies
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

// BEGIN GAME RELATED SCHEMAS

var Player = new Schema({
  x: Number,
  y: Number,
  alive: {
    type: Boolean,
    default: true
  },
  // orientation: Number,
  // bombCount: Number,
  // bombPierce: Number,
  // bombRange: Number,
  // coins: Number,
  // person: { type: Schema.ObjectId, ref: 'Person' },
  person: {
    type: Number,
    default: -1
  }
  // game: { type: Schema.ObjectId, ref: 'Game' }
});

var Game = new Schema({
  // people: [{ type: Schema.Types.ObjectId, ref: 'Person' }],
  date: {
    type: Date,
    default: Date.now
  },
  boardSize: { // size of game board
    type: Number,
    default: 11
  },
  people: [Number], // temporary, it's important to note the distinction between players (actual in-game obj) and people (accounts)
  players: [{ type: Schema.ObjectId, ref: 'Player' }],
  state: {
    type: String, // "in progress", "complete"
    default: "in progress"
  },
  hardBlockBoard: [Number],
  softBlockBoard: [Number]
});

// END GAME RELATED SCHEMAS

mongoose.model('Player', Player);
mongoose.model('Game', Game);
