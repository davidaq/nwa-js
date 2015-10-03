#!/usr/bin/env node
var path = require('path');
var fs = require('fs')

console.warn(new Date().toString());

module.exports = function(args) {
    GLOBAL.__root = BASE;
    if(args.devmode) {
        config.devmode = true;
    }
    if(config.autoUpdateInterval) {
        var update = require('./app/update-site');
        update(startServer);
        setInterval(update, config.autoUpdateInterval);
    } else {
        startServer();
    }
};

function startServer() {
    console.log('Server started at', new Date().toString());
    var app = require('./app/app');
    var http = require('http');

    var port = parseInt(config.port || 3000);
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
        if (config.devmode) {
            devmode();
        }
    }

    function devmode() {
        var mtimes = {};
        setInterval(function() {
            for (var modname in require.cache) {
                if (modname.substr(0, BASE.length) == BASE) {
                    var stat = fs.statSync(modname);
                    var mtime = Math.max(stat.mtime.getTime(), stat.ctime.getTime());
                    if (mtimes[modname]) {
                        if (mtimes[modname] < mtime) {
                            console.log('Changed:', modname);
                            delete require.cache[modname];
                            mtimes[modname] = mtime;
                        }
                    } else {
                        mtimes[modname] = mtime;
                    }
                }
            }
        }, 1000);
    }
}

