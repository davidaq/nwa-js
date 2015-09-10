var fs = require('fs');
var cp = require('child_process');
var path = require('path');
var _ = require('underscore');

module.exports = watch;

function watch(args) {
    console.log('Watching ...');
    fs.watch(BASE, {recursive:true}, function() {
        watch.build();
    });
};

watch.build = (function() {
    var child = false;
    var timeout = false;
    return _.debounce(function() {
        if(timeout)
            clearTimeout(timeout);
        if(child) {
            timeout = setTimeout(function() {
                timeout = false;
                watch.build();
            }, 500);
            return;
        }
        child = cp.fork(path.join(__dirname, '..', 'bin', 'nwa.js'), [
                    'build', '-d', BASE
                ], {silent:true,stdio:['ignore','pipe','pipe']});
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

