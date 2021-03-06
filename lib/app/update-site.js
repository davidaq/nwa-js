var cp = require('child_process');
var path = require('path');
var concat = require('concat-stream');

module.exports = updateSite;

var checking = false;
var baseDir = BASE;

var verbose;

function updateSite(callback) {
    verbose = !!(callback && callback.verbose);
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
        return git('stash');
    }).then(function() {
        return git('merge', remote+'/'+branch);
    }).then(function() {
        return git('stash', 'pop');
    }).then(function() {
        return new Promise(function(resolve) {
            var r = cp.spawn('git', ['diff', '--name-only', '--diff-filter=U'], {
                cwd:baseDir, stdio:['ignore','pipe','ignore']
            });
            r.stdout.pipe(concat(function(result) {
                var conflicts = result.toString().split(/[\r\n]+/).filter(function(v) {
                    return !!v;
                });
                if (conflicts.length > 0) {
                    git.apply(this, ['checkout', remote+'/'+branch, '--'].concat(conflicts)).then(resolve);
                } else {
                    resolve();
                }
            }));
        });
    }).then(function() {
        return git('stash', 'drop');
    }).then(function() {
        return git('reset', 'HEAD');
    }).then(function() {
        if (verbose)
            console.log('npm install');
        return CPThen(cp.spawn('npm', ['install'], {
            cwd:baseDir,stdio:verbose?'inherit':'ignore'}))
    }).then(function() {
        if (verbose)
            console.log('Server updated!');
        callback(true);
    }).catch(function(e) {
        if (verbose)
            console.log(e.stack || e);
        checking = false;
        callback();
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
    if (verbose)
        console.log('git', args.join(' '));
    return CPThen(cp.spawn('git', args, {
        cwd:baseDir,stdio:verbose?'inherit':'ignore'}))
}
