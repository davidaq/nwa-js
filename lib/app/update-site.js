var cp = require('child_process');
var path = require('path');
var concat = require('concat-stream');

module.exports = updateSite;

var startHEAD;
var checking = true;
var baseDir = BASE;

getHEAD(function(head) {
    startHEAD = head;
    checking = false;
});

function dummy() {

};

function updateSite(callback) {
    if('function' != typeof callback)
        callback = dummy;
    if(checking)
        return callback();
    checking = true;
    var branch = config.gitBranch || 'master';
    var remote = config.gitRemote || 'origin';
    var r = cp.spawn('git', ['fetch'], {cwd:baseDir});
    r.on('close', function() {
        r = cp.spawn('git', ['reset', '--hard', remote + '/' + branch], {cwd:baseDir});
        r.on('close', function() {
            getHEAD(function(head) {
                checking = false;
                if(head != startHEAD) {
                    r = cp.spawn('npm', ['install'], {cwd:baseDir});
                    r.on('close', function() {
                        console.log('Updated, auto shutdown!');
                        process.exit();
                    });
                } else {
                    callback();
                }
            });
        });
    });
}

function getHEAD(callback) {
    var r = cp.spawn('git', ['rev-parse', 'HEAD'], {cwd:baseDir});
    r.stdout.pipe(concat(function(hash) {
        callback(hash.toString().trim());
    }));
}
