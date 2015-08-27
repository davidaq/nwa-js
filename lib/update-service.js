#!/usr/bin/env node

var genApi = require('./lib-update-service/genApi.js');
var genLogic = require('./lib-update-service/genLogic.js');

function main() {
    console.log('update api');
    genApi();
    setImmediate(function() {
        console.log('generate logic');
        genLogic();
    });
}

var path = require('path');
GLOBAL.__root = path.resolve(path.join(__dirname, '..'));

if(!module.parent) main();
else exports.update = main;
