var fs = require('fs');
var path = require('path');

module.exports = function(args, callback) {
    fs.readFile(path.join(BASE, 'log', 'pid'), 'utf8', function(err, pid) {
        if(!err && pid) {
            try {
                process.kill(pid - 0);
                console.log('Daemon stoped: pid =', pid);
            } catch(e) {}
        }
        fs.unlink(path.join(BASE, 'log', 'pid'), function() {
            if(callback)
                callback();
        });
    });
};
