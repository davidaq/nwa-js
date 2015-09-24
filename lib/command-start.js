var cp = require('child_process');
var path = require('path');
var fs = require('fs');

module.exports = function(args) {
    fs.mkdir(path.join(BASE, 'log'), function() {
        if(args.daemon) {
            var delayRatio = 0;
            var child;
            process.on('SIGHUP', function() {
                //=== nohup
            });
            function abort() {
                try {
                    child.kill();
                } catch(e) {}
                process.exit();
            }
            process.on('SIGINT', abort);
            process.on('SIGTERM', abort);

            // rotate log stream 
            // keep log of one day and a backup of previous day
            var log = {
                out: openLogAppendStream('output'),
                err: openLogAppendStream('error')
            };
            (function rotate() {
                setTimeout(rotate, 10000);
                var expire = new Date().getTime() - 24 * 3600 * 1000;
                function rotateStream(streamName, fname) {
                    var stream = log[streamName];
                    fs.stat(stream.fpath, function(err, stat) {
                        if (err || stat.ctime.getTime() < expire) {
                            fs.unlink(stream.fpath + '.old', function() {
                                fs.rename(stream.fpath, stream.fpath + '.old', function() {
                                    try {
                                        stream.end();
                                    } catch(e) {}
                                    log[streamName] = openLogAppendStream(fname);
                                });
                            });
                        }
                    });
                }
                rotateStream('out', 'output');
                rotateStream('err', 'error');
            })();

            //=== guard a worker process and redirect outputs to a rotating log
            function mkChild() {
                var startime = new Date().getTime();
                child = cp.fork(path.join(__dirname, '..', 'bin', 'nwa.js'), 
                        ['run', '-d', BASE], {
                            silent: true,
                            stdio: ['ignore', 'pipe', 'pipe', 'ignore']
                        });

                child.on('close', function() {
                    child = false;
                    var delay = 1000 - (new Date().getTime() - startime);
                    if (delay < 0) {
                        delay = 0;
                    }
                    if (delay > 0) {
                        delay *= delayRatio;
                        delayRatio++;
                    } else {
                        delayRatio = 0;
                    }
                    setTimeout(function() {
                        mkChild();
                    }, delay);
                });
                
                child.stdout.on('data', function(data) {
                    try {
                        log.out.write(data);
                    } catch(e) {};
                });
                child.stderr.on('data', function(data) {
                    try {
                        log.err.write(data);
                    } catch(e) {};
                });
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

function openLogAppendStream(name) {
    var fpath = path.join(BASE, 'log', name + '.log');
    var ret = fs.createWriteStream(fpath, {
        flags: 'a',
        defaultEncoding: 'utf8'
    }) || {};
    ret.fpath = fpath;
    return ret;
}
