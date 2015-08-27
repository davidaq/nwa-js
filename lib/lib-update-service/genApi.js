var fs = require('fs');
var path = require('path');
var async = require('async');
var YAML = require('yamljs');
var _ = require("underscore");

function getName(fileName) {
	var str = fileName.split(".");
	if (str.length > 1) {
		str.pop();
	}
	str.join(".");
	return str;
}

if (typeof (__root) == "undefined" || !__root) {
	__root = path.join(__dirname, '..');
}

function generateJson(callback, theArray) {
    function travel(dir, next) {
        fs.readdirSync(dir).forEach(function(file) {
            var pathname = path.join(dir, file);
            if (fs.statSync(pathname).isDirectory()) {
                travel(pathname, next);
            } else {
                next(pathname, file);
            }
        });
    }
    function normalizeBean(v) {
        if (!v)
            return {};
        for ( var k in v) {
            if ('string' == typeof v[k]) {
                v[k] = {
                    type : v[k]
                };
            }
            if (!v[k].__comment)
                v[k].__comment = '';
        }
        return v;
    }
    function parseBean(filePath) {
        var content = fs.readFileSync(filePath, 'utf-8');
        var ret = {};
        if (filePath.match(/\.yaml$/i)) {
            ret = YAML.parse(content);
        } else if (filePath.match(/\.json$/i)) {
            ret = JSON.parse(content);
        } else {
            return null;
        }
        ret.fields = normalizeBean(ret.fields);
        return ret;
    }
    function parseAction(filePath) {
        var content = fs.readFileSync(filePath, 'utf-8');
        var ret = {};
        if (filePath.match(/\.yaml$/i)) {
            ret = YAML.parse(content);
        } else if (filePath.match(/\.json$/i)) {
            ret = JSON.parse(content);
        } else {
            return null;
        }
        for ( var k in ret) {
            ret[k].param = normalizeBean(ret[k].param);
            if (!ret[k].cache)
                ret[k].cache = false;
            if(!ret[k].__comment)
                ret[k].__comment = '';
        }
        return ret;
    }
    (function() {
        var json = {};
        var types = {};
        var actions = {};
        var dir = path.join(__root, '/api');

        travel(path.join(dir, '/bean'), function(
                filePath, fileName) {
            console.log(filePath);
            var c = parseBean(filePath);
            if (c)
                types[getName(fileName)] = c;
        });

        travel(path.join(dir, '/protocol'), function(
                filePath, fileName) {
            console.log(filePath);
            var c = parseAction(filePath);
            if (c)
                actions[getName(fileName)] = c;
        });

        json['types'] = types;
        json['actions'] = actions;
        json['baseurl'] = "http://%%HOST%%/service/";
        fs.writeFileSync(path.join(__root, 'api', 'api.json'),
                JSON.stringify(json, null, 2));
        console.log("success generate : " + path.join(__root, 'api', 'api.json'));
        callback(null, json);
    })();
}
function generateXML(callback, theArray) {
    var theJson = theArray.generateJson;
    var p = path.join(__dirname, 'jsonToXmlTemplate.html');
    fs.readFile(p, 'utf-8', function(err, XMLStr) {
        if (err) {
            console.log("jsonToXmlTemplate read error!");
        } else {
            var XMLTemplate = _.template(XMLStr);
            var xmlStr = XMLTemplate({
                data : theJson
            });
            fs.writeFileSync(path.join(__root, 'api', 'api.xml'), xmlStr, 'utf-8');
            console.log("success generate : " + path.join( __root, 'api', 'api.xml'));
            callback(null, xmlStr);
        }
        callback(null);
    });
}
function main() {
	async.auto({
        generateJson : generateJson,
        generateXML : ["generateJson", generateXML]
    }, function(err, results) {
        console.log(err);
    });
}
if(!module.parent) main();
else module.exports = main;

