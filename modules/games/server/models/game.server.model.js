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
  orientation: {
    type: Number,
    default: 0
  },
  bombCount: {
    type: Number,
    default: 1
  },
  bombPierce: {
    type: Number,
    default: 0
  },
  bombRange: {
    type: Number,
    default: 3
  },
  coins: {
    type: Number,
    default: 0
  },
  person: { type: Schema.ObjectId, ref: 'Person' },
  orangePortal: Object,
  bluePortal: Object
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
  moveOrder: [Number],
  moveIterator: Number,
  people: [{ type: Schema.ObjectId, ref: 'User' }],
  players: [{ type: Schema.ObjectId, ref: 'Player' }],
  state: {
    type: String, // "in progress", "complete"
    default: "in progress"
  },
  hardBlockBoard: [Number],
  softBlockBoard: [Number],
  // bombList: [Object],
  trailMap: Object,
  bombMap: Object,
  portalMap: Object
  // saveCount: Number
});

// END GAME RELATED SCHEMAS

mongoose.model('Player', Player);
mongoose.model('Game', Game);
