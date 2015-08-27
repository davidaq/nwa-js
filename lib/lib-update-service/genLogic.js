var fs = require('fs');
var path = require('path');

var genLogic = function() {
    fs.readFile(path.join(__root, 'api', 'api.json'), {encoding:'utf-8'}, function(err, api) {
        api = JSON.parse(api);
        var actions = api.actions;
        for(name in actions) {
            var action = actions[name];
            genGroup(name, action);
        }
    });
};

var genGroup = function(name, group) { 
    var fpath = path.join(__root, 'service', name + '.js');
    var proc = function(_, content) {
        var log = function(msg) {
            console.log(pad(fpath.substr(__root.length), 35) + "\t : " + msg);
        };
        try {
            //eval(content);
            content = genGroupContent(name, group, content);
        } catch (e) {
            log(e);
            return;
        }
        fs.writeFile(fpath, content, function(err) {
            log(err ? err : 'success');
        });
    };
    fs.exists(fpath, function(exists) {
        if(exists) {
            fs.readFile(fpath, {encoding:'utf-8'}, proc);
        } else {
            proc(null, "/********** **/\nvar EXPORT = module.exports = {};\n");
        }
    });
};

var genGroupContent = function(name, group, content) {
    var comment = '[ ' + name + ' ]';
    if(group.__comment) {
        comment += "\n" + group.__comment;
    }
    content = content.replace(/^\/\*[^]*?\*\//, '');
    content = genComment(comment) + content;

    var actionCode = {};

    var m;
    var topContent = false;
    var exportFound = false;
    if(content.match(/var\s+EXPORT\s*=\s*module\s*\.\s*exports\s*=\s*\{\s*\}\s*;\s*/)) {
        exportFound = true;
    }
    while(m = content.match(/^([^]*?)\s*(EXPORT\s*\.\s*([a-zA-Z0-9_]+)\s*=\s*function\s*\([^]*?\))/)) {
        var ac = actionCode[m[3]]  = {};
        content = content.substr(m[0].length);
        ac.prev = m[1];
        ac.def = m[2];
        if(ac.prev.match(/\*\/\s*$/)) {
            var p = ac.prev.lastIndexOf('/*');
            if(p >= 0) {
                ac.prev = ac.prev.substr(0, p);
            } else {
                throw 'Syntax error, can not parse comment of ' + m[3] + ":\n" + ac.prev.substr(ac.prev.length - 100, 100) + "\n";
            }
        } else {
            ac.prev += "\n\n";
        }
        if(!topContent) {
            topContent = ac.prev;
            ac.prev = '';
            var mm = topContent.match(/^([^]*?)(\s*)$/);
            if(mm) {
                topContent = mm[1];
                ac.prev = mm[2];
            }
        }
        var blockEnd;
        if(!(blockEnd = parseBlock(content))) {
            throw 'Syntax error, can not parse function body of ' + m[3] + ":\n" + content.substr(0, 100) + "\n";
        }
        ac.body = content.substr(0, blockEnd) + ";";
        content = content.substr(blockEnd);
        content = content.replace(/^\s*;/, '');
    }
    if(topContent) {
        if(!exportFound) {
            topContent += "\nEXPORT = module.exports = {};\n";
        }
    } else {
        topContent = content;
        content = '';
    }
    var remain = content;
    content = '';

    var actionDefs = {};
    for(var name in group) {
        actionDefs[name] = genAction(name, group[name]);
    }

    var defaultBody = " {\n    var self = this;\n\n    self.result(null);\n};\n";
    var actionNames = ['%'];
    var actionChain = {'%':[]};
    for(var name in actionDefs) {
        actionNames.push(name);
        actionChain[name] = [name];
    }
    var chainIndex = 0;
    for(var name in actionCode) {
        if(name == actionNames[chainIndex + 1]) {
            chainIndex++;
        } else if(!actionDefs[name]) {
            actionChain[actionNames[chainIndex]].push(name);
        }
    }
    for(var k in actionNames) {
        var chain = actionChain[actionNames[k]];
        for(var k in chain) {
            name = chain[k];
            if(actionCode[name]) {
                content += actionCode[name].prev;
                if(actionDefs[name])
                    content += actionDefs[name];
                else {
                    content += "/**********\n";
                    content += " * @ " + name + "\n";
                    content += " * Warning: not defined!\n";
                    content += " * This action will not be routed.\n";
                    content += " **/\n";
                    content += actionCode[name].def;
                }
                if(actionCode[name].body.match(/^\s*\{\s*\}\s*;\s*$/)) {
                    // empty action code
                    content += defaultBody;
                } else {
                    content += actionCode[name].body;
                }
                delete actionCode[name];
            } else {
                content += "\n";
                content += actionDefs[name];
                content += defaultBody;
            }
        }
    }
    return topContent + content + remain;
};

var genAction = function(name, action) {
    var content = '@ ' + name;
    if(action.__comment) {
        content += "\n" + action.__comment;
    }
    var params = [];
    var maxNameLen = 0;
    var maxTypeLen = 0;
    for(var pname in action.param) {
        params.push(pname);
        maxNameLen = max(pname.length, maxNameLen);
        maxTypeLen = max(action.param[pname].type.length, maxTypeLen);
    }
    for(var pname in action.param) {
        var param = action.param[pname];
        content += "\nIN " + pad(pname, maxNameLen) + " : " + pad(param.type, maxTypeLen);
        if(param.__comment)
            content += " - " + param.__comment;
    }
    content += "\nRETURN " + action.result;
    content = genComment(content);
    content += "\nEXPORT." + name + " = function(" + params.join(', ') + ")";
    return content;
};

var genComment = function(str) {
    str = str.split("\n");
    for(var k in str) {
        str[k] = ' * ' + str[k];
    }
    return "/**********\n" + str.join("\n") + "\n **/";
};

var pad = function(str, len) {
    len -= str.length;
    while(len --> 0) {
        str += ' ';
    }
    return str;
};

var max = function(a, b) {
    return a > b ? a : b;
};

var parseBlock = function(res, callback) {
    var foundBlock = false;
    var brace = 0;
    var quot = false;
    var escp = false;
    var i;
    for(i = 0; i < res.length; i++) {
        if(escp) {
            escp = false;
            continue;
        }
        var c = res[i];
        if(!foundBlock) {
            if(c == ' ' || c == '\n' || c == '\r') {
                continue;
            } else if(c == '{') {
                foundBlock = true;
                brace++;
            } else {
                break;
            }
        } else if(quot) {
            if(c == '\\') {
                escp = true;
            } else if(c = quot) {
                quot = false;
            }
        } else if(c == '"' || c == "'") {
            quot = c;
        } else if(c == '{') {
            brace++;
        } else if(c == '}') {
            brace--;
            if(brace <= 0)
                break;
        } else if(c == '/') {
            if(res[i + 1] == '/') {
                for(i = i + 2; i < res.length; i++) {
                    if(res[i] == "\n")
                        break;
                }
            } else if(res[i + 1] == '*') {
                for(i = i + 2; i < res.length - 1; i++) {
                    if(res[i] == '*' && res[i + 1] == '/')
                        break;
                }
            } else {
                quot = '/';
            }
        }
    }
    return foundBlock ? i + 1 : false;
};

function main() {
    if (typeof (__root) == "undefined" || !__root) {
        __root = ''
        var chk = function(exists) {
            if (exists) {
                __root = path.resolve(__root);
                genLogic();
            } else {
                __root = path.join(__root, '..');
                fs.exists(path.join(__root, 'package.json'), chk);
            }
        };
        fs.exists(path.join(__root, 'package.json'), chk);
    } else {
        genLogic();
    }
}
if(!module.parent) main();
else module.exports = main;

