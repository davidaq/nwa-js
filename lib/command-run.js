#!/usr/bin/env node
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
    if(config.devmode) {
        devmode();
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
    }
}

function devmode() {
    var mtimes = {};
    console.log(BASE);
    setInterval(function() {
        var prefix = '/node_modules/';
        for (var modname in require.cache) {
            if (modname.substr(0, BASE.length) !== BASE) {
                continue;
            }
            if (modname.substr(BASE.length, prefix.length) === prefix) {
                continue;
            }
            var stat = fs.statSync(modname);
            var mtime = Math.max(stat.mtime.getTime(), stat.ctime.getTime());
            if (mtimes[modname]) {
                if (mtimes[modname] < mtime) {
                    console.log('Changed:', modname);
                    delete require.cache[modname];
                    mtimes[modname] = mtime;
                    if (Lmap[modname]) {
                        Lrequire(true, modname);
                    }
                }
            } else {
                mtimes[modname] = mtime;
            }
        }
    }, 1000);
    var Lmap = {};
    GLOBAL.Lrequire = function(A, B) {
        var fpath;
        if (A === true) {
            fpath = B;
        } else {
            fpath = path.join.apply(path, arguments);
            fpath = path.resolve(BASE, fpath); 
            fpath = require.resolve(fpath);
        }
        if (fpath in require.cache && fpath in Lmap) {
            return Lmap[fpath].exports;
        } else {
            var mod = require(fpath);
            var Lmod = Lmap[fpath] || {};
            Lmap[fpath] = Lmod;
            if (Lmod.exports && typeof Lmod.exports.onLrequireUnload === 'function') {
                Lmod.exports.onLrequireUnload();
            }
            if (mod && typeof mod in {function:1,object:1}) {
                setupLmod();
                setImmediate(setupLmod);
                return Lmod.exports;
            } else {
                console.warn(fpath, 'not exporting a function or object, will not be reloadable.');
                return mod;
            }
            function setupLmod() {
                if (Lmod.exports) {
                    for (var k in Lmod.exports) {
                        delete Lmod.exports[k];
                    }
                    if (typeof mod == 'function') {
                        Lmod.func = mod;
                    }
                } else {
                    if (typeof mod == 'function') {
                        Lmod.func = mod;
                        Lmod.exports = function() {
                            return Lmod.func.apply(this, arguments);
                        };
                    } else {
                        Lmod.exports = {};
                    }
                }
                Lmod.exports.prototype = mod.prototype;
                Lmod.exports.__proto__ = mod.__proto__;
                for (var k in mod) {
                    Lmod.exports[k] = mod[k];
                }
            }
        }
    };
}
