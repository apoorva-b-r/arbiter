const mongoose = require('mongoose');

// Prevent Mongoose from buffering commands when database is offline
mongoose.set('bufferCommands', false);

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = {
  isDbConnected
};
