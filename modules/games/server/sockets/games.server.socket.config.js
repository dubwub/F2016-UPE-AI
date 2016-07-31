'use strict';
var io = require('../controllers/games.server.controller');

// Create the chat configuration
module.exports = function (io, socket) {
  // console.log(io);
  // console.log(socket);

  // console.log('this is running');

  /* io.on('testEmit', function (data) {
    console.log('i guess something is happening');
  }); */

  // socket.on('testEmit', function (data) {
  //   console.log('testEMITTED');
  //   console.log(data);
  //   console.log(io.handlers);
  //   io.emit('testEmit', {
  //     message: 'testEMITTED'
  //   });
  // });

  // io.emit('testEmit', {
  //   message: 'testEmit 2'
  // });

  // socket.emit('testEmit', {
  //   message: 'testEmit 1'
  // });

  // Emit the status event when a new socket client is connected
  // io.emit('chatMessage', {
  //   type: 'status',
  //   text: 'Is now connected',
  //   created: Date.now(),
  //   profileImageURL: socket.request.user.profileImageURL,
  //   username: socket.request.user.username
  // });

  // // Send a chat messages to all connected sockets when a message is received
  // socket.on('chatMessage', function (message) {
  //   message.type = 'message';
  //   message.created = Date.now();
  //   message.profileImageURL = socket.request.user.profileImageURL;
  //   message.username = socket.request.user.username;

  //   // Emit the 'chatMessage' event
  //   io.emit('chatMessage', message);
  // });

  // // Emit the status event when a socket client is disconnected
  // socket.on('disconnect', function () {
  //   io.emit('chatMessage', {
  //     type: 'status',
  //     text: 'disconnected',
  //     created: Date.now(),
  //     username: socket.request.user.username
  //   });
  // });
};
