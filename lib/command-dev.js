var cp = require('child_process');
var net = require('net');
var chokidar = require('chokidar');
var _ = require('underscore');

var curPort = null;
var curChild = null;

var candidatePort = [];

module.exports = function(args) {
    var server = net.createServer(serve);
    var port = parseInt(config.port || 3000);
    candidatePort = [port - 1, port + 1];
    server.listen(port, function() {
        console.log('Dev server on ' + port);
    });
    
    chokidar.watch('.', {
        ignored: function(path) {
            if (path.match(/(^|[\/\\])\../))
                return true;
            if (path.match(/^public[\/\\]/))
                return true;
            if (path.match(/(^|[\/\\])node_modules[\/\\]/))
                return true;
            return false;
        },
        persistent: true,
        depth: 9,
        ignorePermissionErrors: true,
        atomic: true
    })
    .on('add', onChange)
    .on('change', onChange)
    .on('unlink', onChange);
    
    var doSwitch = _.debounce(switchCandidate, 200);
    doSwitch();
    
    function onChange(fpath) {
        if (fpath.match(/^protocol[\/\\]/)) {
            build();
        } else if (fpath.match(/\.(js|yaml)/)) {
            doSwitch();
        }
    }
};

var build = (function() {
    var child = false;
    var timeout = false;
    return _.debounce(function() {
        if(timeout)
            clearTimeout(timeout);
        if(child) {
            timeout = setTimeout(function() {
                timeout = false;
                build();
            }, 500);
            return;
        }
        child = cp.fork(require.resolve('../bin/nwa'), [
                    'build', '-d', BASE
                ], {silent:true,stdio:['ignore','pipe','pipe'],env:{noFront:true}});
        var hadOutput = false;
        child.on('close', function() {
            child = false;
            if(hadOutput) {
                console.log("\\\\================");
            }
        });
        child.stdout.on('data', function(data) {
            if(!hadOutput) {
                hadOutput = true;
                console.log("\n//================");
                console.log('Build', new Date().toString());
            }
            console.log(data.toString());
        });
        child.stderr.on('data', function(data) {
            if(!hadOutput) {
                hadOutput = true;
                console.log("\n//================");
                console.log('Build', new Date().toString());
            }
            console.warn(data.toString());
        });
    }, 250);
})();

function serve(socket) {
    if (!curPort) {
        return connErr();
    }
    var agent = net.connect(curPort);
    agent.on('error', connErr);
    agent.on('connect', function() {
        agent.removeListener('error', connErr);
        socket.on('data', function(data) {
            agent.write(data);
        });
        agent.on('data', function(data) {
            socket.write(data);
        });
        socket.on('end', function() {
            agent.end();
        });
        agent.on('end', function() {
            socket.end();
        });
        socket.on('error', function(err) {
            agent.end();
        });
        agent.on('error', function(err) {
            socket.end();
        });
    });
    function connErr() {
        setTimeout(serve.bind(this, socket), 1000);
    }
}

var curCandidate = 0;
function switchCandidate() {
    curCandidate = 1 - curCandidate;
    run(candidatePort[curCandidate]);
}

function run(port) {
    var child = cp.fork(require.resolve('../bin/nwa'), 
        ['run', '--devmode', '-d', BASE], {
            env: {port:port}
        });
    child.once('message', function(msg) {
        curPort = port;
        if (curChild)
            curChild.kill();
        curChild = child;
    });
    child.once('exit', function() {
        if (curChild == child) {
            curChild = null;
            if (curPort == port) {
                setTimeout(run.bind(this, port), 2000);
            }
        }
    });
}
