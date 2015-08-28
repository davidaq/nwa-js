#!/usr/bin/env node
var path = require('path');
var fs = require('fs')

console.warn(new Date().toString());

module.exports = function(args) {
    GLOBAL.__root = BASE;
    if(config.autoUpdateInterval) {
        var update = require('./app/update-site');
        update(startServer);
        setInterval(update, config.autoUpdateInterval);
    } else {
        startServer();
    }
};

function startServer() {
    /**
     * Module dependencies.
     */

    console.log('Server started at', new Date().toString());
    var app = require('../lib/app/app');
    var http = require('http');

    /**
     * Get port from environment and store in Express.
     */

    var port = normalizePort(config.port || 3000);
    app.set('port', port);

    /**
     * Create HTTP server.
     */

    var server = http.createServer(app);

    /**
     * Listen on provided port, on all network interfaces.
     */

    server.listen(port);
    server.on('error', onError);
    server.on('listening', onListening);

    /**
     * Normalize a port into a number, string, or false.
     */

    function normalizePort(val) {
      var port = parseInt(val, 10);

      if (isNaN(port)) {
        // named pipe
        return val;
      }

      if (port >= 0) {
        // port number
        return port;
      }

      return false;
    }

    /**
     * Event listener for HTTP server "error" event.
     */

    function onError(error) {
      if (error.syscall !== 'listen') {
        throw error;
      }

      var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

      // handle specific listen errors with friendly messages
      switch (error.code) {
        case 'EACCES':
          console.error(bind + ' requires elevated privileges');
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(bind + ' is already in use');
          process.exit(1);
          break;
        default:
          throw error;
      }
    }

    /**
     * Event listener for HTTP server "listening" event.
     */

    function onListening() {
      var addr = server.address();
      var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
      console.log('Listening on ' + bind);
    }
}
