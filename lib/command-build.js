var fs = require('fs');
var genApi = require('./generate/gen-api');
var genLogic = require('./generate/gen-logic');
var genFront = require('./generate/gen-front');

module.exports = function() {
    fs.mkdir('build', function() {
        GLOBAL.__root = BASE;
        if (!process.env.noFront) {
            for(var k in config.fronts) {
                genFront(config.fronts[k].path);
            }
        }
        fs.mkdir('service', function() {
            genApi(genLogic);
        });
    });
};
