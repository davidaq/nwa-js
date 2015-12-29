var fs = require('fs');
var path = require('path');
var YAML = require('yamljs');

module.exports = function(args) {
    fs.mkdir('build', function() {});
    fs.mkdir('service', function() {});
    fs.mkdir('public', function() {});
    fs.mkdir('log', function() {});
    fs.mkdir('protocol', function() {
        fs.mkdir(path.join('protocol', 'bean'), function() {});
    });
    fs.exists(path.join('configure', 'default.yaml'), function(exists) {
        if(exists) 
            return;
        fs.mkdir('configure', function() {
            fs.writeFile(path.join('configure', 'default.yaml'), YAML.stringify({
                port: 3000,
                autoUpdateInterval: false
            }), function() {
            });
        });
    });
    fs.readFile(path.join(__dirname, '..', 'package.json'), function(err, mypackage) {
        mypackage = JSON.parse(mypackage);
        fs.readFile('package.json', function(err, package) {
            if(!package) {
                package = {};
            } else {
                package = JSON.parse(package);
            }
            if(!package.scripts) {
                package.scripts = {};
            }
            if(!package.scripts.start)
                package.scripts.start = 'nwa start';
            if(!package.name) {
                package.name = path.basename(BASE);
            }
            if(!package.version) {
                package.version = '1.0.0';
            }
            fs.writeFile('package.json', JSON.stringify(package, null, '  '), function() {
            });
        });
    });
};
