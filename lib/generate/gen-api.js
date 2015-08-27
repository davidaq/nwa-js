var fs = require('fs');
var path = require('path');
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

function generateJson(callback) {
    function travel(dir, next) {
        try {
            fs.readdirSync(dir).forEach(function(file) {
                var pathname = path.join(dir, file);
                if (fs.statSync(pathname).isDirectory()) {
                    //travel(pathname, next);
                } else {
                    next(pathname, file);
                }
            });
        } catch(e) {}
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
        var dir = BASE;

        travel(path.join(dir, 'protocol', 'bean'), function(
                filePath, fileName) {
            var c = parseBean(filePath);
            if (c)
                types[getName(fileName)] = c;
        });

        travel(path.join(dir, 'protocol'), function(
                filePath, fileName) {
            var c = parseAction(filePath);
            if (c)
                actions[getName(fileName)] = c;
        });

        json['types'] = types;
        json['actions'] = actions;
        json['baseurl'] = "http://%%HOST%%/service/";
        fs.writeFile(path.join(BASE, 'build', 'api.json'),
                JSON.stringify(json, null, 2), function(err) {
                    if(err) {
                        callback(err);
                    } else {
                        console.log("success generate api.json ");
                        callback(null, json);
                    }
                });
    })();
}
function generateXML(callback, theJson) {
    var p = path.join(__dirname, 'jsonToXmlTemplate.html');
    fs.readFile(p, 'utf-8', function(err, XMLStr) {
        if (err) {
            console.log("jsonToXmlTemplate read error!");
        } else {
            var XMLTemplate = _.template(XMLStr);
            var xmlStr = XMLTemplate({
                data : theJson
            });
            fs.writeFile(path.join(BASE, 'build', 'api.xml'), xmlStr, function(err) {
                if(err) {
                    callback(err);
                } else {
                    console.log("success generate api.xml");
                    callback(null, xmlStr);
                }
            });
        }
    });
}
module.exports = function (callback) {
    generateJson(function(err, result) {
        if(err) {
            console.warn(err.stack);
        } else {
            generateXML(function(err) {
                if(err) console.warn(err.stack);
                else if(callback) callback();
            }, result);
        }
    });
};

