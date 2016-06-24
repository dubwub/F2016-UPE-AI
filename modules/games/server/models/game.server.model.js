'use strict';

/**
 * Module dependencies
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

// BEGIN GAME RELATED SCHEMAS

/* var Block = new Schema({
  x: Number,
  y: Number,
  value: Number,
  destructible: Boolean,
  game: { type: Schema.Types.ObjectId, ref: 'Game' }
});

// var Portal = new Schema({
//   block: { type: Schema.Types.ObjectId, ref: 'Game' },
//   owner: { type: Schema.Types.ObjectId, ref: 'Person' },
//   orientation: Number,
//   isBlue: Boolean
// })

var Bomb = new Schema({
  x: Number,
  y: Number,
  tick: Number,
  owner: { type: Schema.Types.ObjectId, ref: 'Player' },
  game: { type: Schema.Types.ObjectId, ref: 'Game' }
});

var Explosion = new Schema({
  x: Number,
  y: Number,
  tick: Number,
  owner: { type: Schema.Types.ObjectId, ref: 'Player' },
  game: { type: Schema.Types.ObjectId, ref: 'Game' },
  isEnding: Boolean
})*/

var Player = new Schema({
  // x: Number,
  // y: Number,
  alive: {
    type: Boolean,
    default: true
  },
  move: {
    type: Number,
    default: -1
  }, // -1 = no move, 0 = rock, 1 = paper, 2 = scissors
  // orientation: Number,
  // bombcount: Number,
  // bombpierce: Number,
  // bombrange: Number,
  // coins: Number,
  // person: { type: Schema.ObjectId, ref: 'Person' },
  person: {
    type: Number,
    default: -1
  },
  game: { type: Schema.ObjectId, ref: 'Game' }
});

var Game = new Schema({
  // players: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
  // people: [{ type: Schema.Types.ObjectId, ref: 'Person' }],
  date: {
    type: Date,
    default: Date.now
  },
  people: [Number], // temporary
  players: [{ type: Schema.ObjectId, ref: 'Player' }],
  state: {
    type: String, // "in progress", "complete"
    default: "in progress"
  }
  // replay: String //file name
});

// END GAME RELATED SCHEMAS

// mongoose.model('Block', Block);
mongoose.model('Player', Player);
// mongoose.model('Bomb', Bomb);
// mongoose.model('Explosion', Explosion);
mongoose.model('Game', Game);
