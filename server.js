'use strict';

/**
 * Module dependencies.
 */
var app = require('./config/lib/app');
var server = app.start();

// var io = require('socket.io')(80);
// // console.log(io);

// io.on('this', function (socket) {
//   console.log(socket);
// });

// io.on('connection', function (socket) {

//   socket.on('private message', function (from, msg) {
//     console.log('I received a private message by ', from, ' saying ', msg);
//   });

//   socket.on('disconnect', function () {
//     io.emit('user disconnected');
//   });
// });

// io.emit('this', { will: 'be received by everyone' });
