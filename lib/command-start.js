var cp = require('child_process');
var path = require('path');
var fs = require('fs');
var logStream = require('log-rotate-stream');

module.exports = function(args) {
    fs.mkdir(path.join(BASE, 'log'), function() {
        if(args.daemon) {
            //=== guard a worker process and redirect outputs to a rotating log
            function mkChild() {
                var child = cp.fork(path.join(__dirname, '..', 'bin', 'nwa.js'), 
                        ['run', '-d', BASE], {
                            silent: true,
                            stdio: ['ignore', 'pipe', 'pipe', 'ignore']
                        });
                process.on('SIGINT', function() {
                    child.kill();
                    process.exit();
                });
                process.on('SIGTERM', function() {
                    child.kill();
                    process.exit();
                });
                child.on('close', function() {
                    setTimeout(function() {
                        mkChild();
                    }, 1500);
                });
                child.stdout.pipe(logStream(path.join(BASE, 'log', 'output.log')));
                child.stderr.pipe(logStream(path.join(BASE, 'log', 'error.log')));
            }
            mkChild();
        } else {
            //=== daemonize a process
            if(fs.existsSync(path.join(BASE, 'log', 'pid'))) {
                console.warn('Found existing pid, please stop first');
                return;
            }
            var child = cp.fork(path.join(__dirname, '..', 'bin', 'nwa.js'), 
                    ['start', '-d', BASE, '--daemon'], {
                        silent:true,
                        detached: true,
                        stdio: ['ignore', 'ignore', 'ignore', 'ignore']
                    });
            child.unref();
            fs.writeFile(path.join(BASE, 'log', 'pid'), child.pid + '', function() {
                console.log('Daemon started: pid =', child.pid);
                process.exit();
            });
        }
    });
};
