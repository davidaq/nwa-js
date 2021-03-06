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
            fs.readdir(dir, function(err, files) {
                _(files).each(function(file) {
                    if(file[0] == '.')
                        return;
                    var pathname = path.join(dir, file);
                    fs.stat(pathname, function(err, stat) {
                        if(!err && !stat.isDirectory()) {
                            next(pathname, file, stat);
                        }
                    });
                });
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
        try {
            if (filePath.match(/\.yaml$/i)) {
                ret = YAML.parse(content);
            } else if (filePath.match(/\.json$/i)) {
                ret = JSON.parse(content);
            } else {
                return null;
            }
        } catch(e) {
            console.warn('Can not parse', filePath, e);
        }
        ret.fields = normalizeBean(ret.fields);
        return ret;
    }
    function parseAction(filePath) {
        var content = fs.readFileSync(filePath, 'utf-8');
        var ret = {};
        try {
            if (filePath.match(/\.yaml$/i)) {
                ret = YAML.parse(content);
            } else if (filePath.match(/\.json$/i)) {
                ret = JSON.parse(content);
            } else {
                return null;
            }
        } catch(e) {
            console.warn('Can not parse', filePath, e);
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

        var beanFiles = [];
        var protocolFiles = [];

        fs.stat(path.join(BASE, 'build', 'api.json'), function(err, stat) {
            var updated = false;
            var otime = stat ? stat.mtime.getTime() : 0;
            var next = _.debounce(function() {
                if(updated) {
                    begin();
                }
            }, 100);
            travel(path.join(BASE, 'protocol', 'bean'), function(fpath, fname, stat) {
                beanFiles.push([fpath,fname]);
                if(stat.mtime.getTime() >= otime || stat.ctime.getTime() >= otime) {
                    updated = true;
                }
                next();
            });
            travel(path.join(BASE, 'protocol'), function(fpath, fname, stat) {
                protocolFiles.push([fpath,fname]);
                if(stat.mtime.getTime() >= otime || stat.ctime.getTime() >= otime) {
                    updated = true;
                }
                next();
            });
            next();
        });

        function begin() {
            var json = {};
            var types = {};
            var actions = {};

            for(var k in beanFiles) {
                var bean = parseBean(beanFiles[k][0]);
                if(bean) types[getName(beanFiles[k][1])] = bean;
            }
            for(var k in protocolFiles) {
                var action = parseAction(protocolFiles[k][0]);
                if(action) actions[getName(protocolFiles[k][1])] = action;
            }

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
        }
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

