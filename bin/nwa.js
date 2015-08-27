#!/usr/bin/env node

var argv = require('yargs').usage("Usage: $0 <command> [options]")
    .command("init",  "Create a bootstrap nwa project")
    .command("start", "Start running the http server")
    .command("stop",  "Terminate the http server if running")
    .command("build", "Front-end apps and service implementations will be updated")
    .command("watch", "Issue build when detected change. May not work on some os")
    .command("poll",  "Issue build every second. Use when watch is not supported")
    .demand(1, "must provide a valid command")
    .help("help").alias("help", "h")
    .describe("dir",  "Base directory of the nwa project").alias("dir", "d")
    .argv;


//=== set working directory to node project root
var path = require('path');
var fs = require('fs');

var basedir = argv.dir || process.cwd();
for(var i = 0; i < 10; i++) {
    if(fs.existsSync(path.join(basedir, 'package.json'))) {
        break;
    } else {
        basedir = path.join(basedir, '..');
    }
}
basedir = path.resolve(basedir);
if(!basedir || basedir == '/') {
    basedir = path.resolve(argv.dir || process.cwd());
}
process.chdir(basedir);
GLOBAL.BASE = basedir;

//=== load project configuration
require('../lib/common/load-config');

//=== try to load specified command
try {
    require('../lib/command-' + argv._[0])(argv);
} catch(e) {
    console.warn("Error: command not suported.");
    throw e;
}
