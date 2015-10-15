var fs = require('fs');
var path = require('path');
var esprima = require('esprima');

module.exports = genLogic;

function genLogic() {
    fs.readFile(path.join(BASE, 'build', 'api.json'), 'utf-8', function(err, api) {
        api = JSON.parse(api);
        var actions = api.actions;
        for(name in actions) {
            var action = actions[name];
            genGroup(name, action);
        }
    });
}

function genGroup(name, group) { 
    var fpath = path.join(BASE, 'service', name + '.js');
    var proc = function(_, content) {
        var log = function(msg) {
            console.log(pad(fpath.substr(BASE.length), 35) + "\t : " + msg);
        };
        content = genGroupContent(name, group, content);
        if (content) {
            fs.writeFile(fpath, content, function(err) {
                log(err ? err : 'success');
            });
        }
    };
    fs.exists(fpath, function(exists) {
        if(exists) {
            fs.readFile(fpath, {encoding:'utf-8'}, proc);
        } else {
            proc(null, "/********** **/\nvar EXPORT = module.exports = {};\n");
        }
    });
}

function genGroupContent(name, group, content) {
    var ast;
    try {
        ast = esprima.parse(content, {
            loc: true,
            range: true,
            comment: true
        });
    } catch(e) {
        console.warn('Error, Line', e.lineNumber, '(' + name + '.js):', e.description);
        return false;
    }

    var exports = parseExports(ast, content);

    var topContent = '';
    var remain = '';
    var actionCode = {};
    if (exports[0]) {
        topContent = exports[0].prev;
        exports[0].prev = '';
        remain = content.substr(exports[exports.length - 1].range[1]);
        for (var i = 0; i < exports.length; i++) {
            var actionName = exports[i].name;
            if (actionCode[actionName]) {
                console.warn('Error, Line', exports[i].line, '(' + name + '.js): Duplicate action implementation "' + actionName + '", previously implemented at line', actionCode[actionName].line + '.');
                return false;
            }
            actionCode[actionName] = exports[i];
        }
    } else {
        topContent = content;
    }

    var comment = '[ ' + name + ' ]';
    if (group.__comment) {
        comment += "\n" + group.__comment;
    }
    var firstComment = ast.comments[0];
    if (firstComment && firstComment.range[0] == 0) {
        topContent = topContent.substring(firstComment.range[1]);
    }
    topContent = genComment(comment) + topContent;
    content = '';

    var actionDefs = {};
    for(var name in group) {
        actionDefs[name] = genAction(name, group[name]);
    }

    var defaultBody = "{\n    var self = this;\n\n    self.result(null);\n};\n";
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
                content += ' ';
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
                content += ' ';
                content += defaultBody;
            }
        }
    }
    return topContent + content + remain;
}

function parseExports(ast, content) {
    var comments = [];
    for (var i = 0; i < ast.comments.length; i++) {
        var comment = ast.comments[i];
        if (comment.type == 'Block') {
            comments.push(comment);
        }
    }
    var exports = [];
    var j = 0;
    var pend = 0;
    for (var i = 0; i < ast.body.length; i++) {
        var exp = ast.body[i];
        var range = exp.range;
        if (exp.type == 'ExpressionStatement') {
            exp = exp.expression;
        }
        if (exp.type == 'AssignmentExpression' 
                && exp.right.type == 'FunctionExpression'
                && exp.left.object && exp.left.object.name == 'EXPORT') {
            for (; j < comments.length; j++) {
                if (comments[j].range[0] > range[0]) {
                    break;
                }
            }
            if (j) {
                j--;
                var checkRange = [comments[j].range[1], range[0]];
                if (checkRange[0] == checkRange[1]
                        || !content.substring(checkRange[0], checkRange[1]).trim()) {
                    range = [comments[j].range[0], range[1]];
                }
            }
            var body = content.substring(exp.right.body.range[0], exp.right.body.range[1]).trim();
            if (body && body[body.length - 1] != ';') {
                body += ';';
            }
            var def = content.substring(exp.left.range[0], exp.right.body.range[0]).trim();
            exports.push({
                line: exp.loc.start.line,
                name: exp.left.property.name,
                prev: content.substring(pend, range[0]),
                body: body, 
                def: def,
                range: range
            });
            pend = range[1];
        }
    }
    return exports;
}

function genAction(name, action) {
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
}

function genComment(str) {
    str = str.split("\n");
    for(var k in str) {
        str[k] = ' * ' + str[k];
    }
    return "/**********\n" + str.join("\n") + "\n **/";
}

function pad(str, len) {
    len -= str.length;
    while(len --> 0) {
        str += ' ';
    }
    return str;
}

function max(a, b) {
    return a > b ? a : b;
}

function parseBlock(res, callback) {
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
}


