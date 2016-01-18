var path = require('path');
var fs = require('fs')

console.warn(new Date().toString());

module.exports = function(args) {
    GLOBAL.__root = BASE;
    GLOBAL.Lrequire = function(A, B) {
        var fpath;
        if (A === true) {
            fpath = B;
        } else {
            fpath = path.join.apply(path, arguments);
            fpath = path.resolve(BASE, fpath); 
            fpath = require.resolve(fpath);
        }
        return require(fpath);
    };
    if(args.devmode) {
        config.devmode = true;
    }
    startServer();
};

function startServer() {
    console.log('Server started at', new Date().toString());
    var app = require('./app/app');
    var http = require('http');

    var port = parseInt(process.env.port || config.port || 3000);
    if (isNaN(port) || port < 0) {
        port = 3000;
    }
    app.set('port', port);

    var server = http.createServer(app);

    server.listen(port);
    server.on('error', onError);
    server.on('listening', onListening);

    function onError(error) {
        if (error.syscall !== 'listen') {
            throw error;
        }

        var bind = typeof port === 'string'
          ? 'Pipe ' + port
          : 'Port ' + port;

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

    function onListening() {
        var addr = server.address();
        var bind = typeof addr === 'string'
          ? 'pipe ' + addr
          : 'port ' + addr.port;
        console.log('Listening on ' + bind);
        if (process.send) {
            process.send('ready');
        }
    }
}

