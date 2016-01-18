var cp = require('child_process');
var path = require('path');
var concat = require('concat-stream');

module.exports = updateSite;

var checking = false;
var baseDir = BASE;

function updateSite(callback) {
    if('function' != typeof callback)
        callback = dummy;
    if(checking)
        return callback();
    checking = true;
    var branch = config.gitBranch || 'master';
    var remote = config.gitRemote || 'origin';
    var haveUpdate = false;
    git('fetch').then(function() {
        r = cp.spawn('git', ['log', 'HEAD..'+remote+'/'+branch, '--oneline'], {
            cwd:baseDir, stdio:['ignore','pipe','pipe']
        });
        function gotData(data) {
            if (data && data.length > 2)
                haveUpdate = true;
        }
        r.stdout.on('data', gotData);
        r.stderr.on('data', gotData);
        return CPThen(r);
    }).then(function() {
        if (!haveUpdate) {
            throw 'NOUPDATE';
        }
        return git('add', '-A', './');
    }).then(function() {
        return git('commit', '-m', 'Auto server pre-merge commit')
    }).then(function() {
        return git('merge', '-s', 'recursive', '-X', 'theirs', remote+'/'+branch)
    }).then(function() {
        return CPThen(cp.spawn('npm', ['install'], {cwd:baseDir}))
    }).then(function() {
        console.log('Server updated!');
        callback(true);
    }).catch(function(e) {
        if (e != 'NOUPDATE')
            console.log(e.stack || e);
        callback();
        checking = false;
    });
}

function dummy() {};

function CPThen(r) {
    return new Promise(function(resolve) {
        r.on('close', resolve);
    });
}

function git() {
    var args = Array.prototype.slice.call(arguments, 0);
    console.log('git', args.join(' '));
    return CPThen(cp.spawn('git', args, {cwd:baseDir}));
}
