var fs = require('fs');
var path = require('path');
var YAML = require('yamljs');

var __root = path.join(__dirname, '..');
var UTF8 = {encoding:'utf-8'};

function loadConfigFile(name) {
    try {
        var p = path.join(__root, 'configure');
        if(fs.existsSync(path.join(p, name + '.json'))) {
            var c = fs.readFileSync(path.join(p, name + '.json'), UTF8);
            return JSON.parse(c);
        }
        if(fs.existsSync(path.join(p, name + '.yaml'))) {
            var c = fs.readFileSync(path.join(p, name + '.yaml'), UTF8);
            return YAML.parse(c);
        }
    } catch(e) {
        console.warn(e);
    }
    return {};
};
(function() {
    var role;
    var p = path.join(__root, '.myrole');
    if(fs.existsSync(p)) {
        role = fs.readFileSync(p, UTF8).trim();
    } else {
        p = path.join(__root, '..', '.myrole');
        if(fs.existsSync(p)) {
            role = fs.readFileSync(p, UTF8).trim();
        }
    }
    
    var cfg = loadConfigFile('default');
    if(role) {
        var ncfg = loadConfigFile(role);
        for(var k in ncfg) {
            cfg[k] = ncfg[k];
        }
    }
    cfg.MY_ROLE = role;
    GLOBAL.config = cfg;
})();
