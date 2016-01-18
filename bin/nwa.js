#!/usr/bin/env node

var argv = require('yargs').usage("Usage: $0 <command> [options]")
    .command("init",  "Create a nwa project boiler plate")
    .command("start", "Start http server as daemon")
    .command("stop",  "Terminate running daemon http server")
    .command("restart",  "Terminate running daemon http server and start a new one")
    .command("run",   "Start running the http server")
    .command("dev", "Start running development server, project will be auto updated")
    .demand(1, "must provide a valid command")
    .help("help").alias("help", "h")
    .describe("dir",  "Base directory of the nwa project. Current working directory by default").alias("dir", "d")
    .argv;


//=== set working directory to node project root
var path = require('path');
var fs = require('fs');

var command = argv._[0];

var cwd =  argv.dir || process.cwd();
var basedir = cwd;
if (command != 'init') {
    for(var i = 0; i < 10; i++) {
        if(fs.existsSync(path.join(basedir, 'package.json'))) {
            break;
        } else {
            basedir = path.join(basedir, '..');
        }
    }
}
basedir = path.resolve(basedir);
if(!basedir || basedir == '/') {
    basedir = path.resolve(cwd);
}
process.chdir(basedir);
GLOBAL.BASE = basedir;

//=== load project configuration
require('../lib/common/load-config');

//=== try to load specified command
try {
    require('../lib/common/json-strip-null');
    require('../lib/command-' + command)(argv);
} catch(e) {
    console.warn("Error: command not suported.");
    throw e;
}
