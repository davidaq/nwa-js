#!/usr/bin/env node

var Path = require('path');
var path = Path.join;
var fs = require('fs');
var zlib = require('zlib');

var uglify = tryrequire('uglify-js');
var minhtml = tryrequire('html-minifier').minify;
var fse = tryrequire('fs-extra');
var walk = tryrequire('walkdir');
var _ = tryrequire('underscore');

var appName = process.argv[2] || 'admin';
console.log('Build app:', appName);
var appDir = path(__dirname, '..', appName);

function buildIndex() {
    try {
        var mtime = fs.statSync(path(appDir, 'index.html'))
            .mtime.getTime();
        var utime = fs.statSync(path(appDir, 'build', 'index.html.gz'))
            .mtime.getTime();
        if(mtime < utime) {
            return;
        }
    } catch(e) {
    }
    fs.readFile(path(appDir, 'index.html'), TC(function(content) {
        save('index.html.gz', minifyHTML(content));
    }));
}

function buildStyle() {
    var scssArgs = ['--update', 'style:build', '--style', 'compressed'];
    var scss = require('child_process').spawn('scss', scssArgs, {
        cwd: appDir,
        stdio: ['ignore', 'inherit', 'inherit']
    });
    scss.on('exit', function() {
        try {
            var mtime = fs.statSync(path(appDir, 'build', 'style.css'))
                .mtime.getTime();
            var utime = fs.statSync(path(appDir, 'build', 'style.css.gz'))
                .mtime.getTime();
            if(mtime < utime) {
                return;
            }
        } catch(e) {
        }
        fs.readFile(path(appDir, 'build', 'style.css'), TC(function(content) {
            save('style.css.gz', content);
        }));
        fs.readFile(path(appDir, 'build', 'style.css.map'), function(err, content) {
            if(!err)
                save('style.css.map.gz', content);
        });
    });
}

var buildScript = build('script', /\.js$/,
            function(files, save) {
    var content = '';
    var count = files.length;
    for(var k in files) {
        (function(fpath) {
            fs.readFile(fpath, TC(function(raw) {
                try {
                    content += minifyJS(raw);
                    count--;
                    if(count == 0) save(content);
                } catch(e) {
                    console.warn('Error in', fpath, e.toString());
                }
            }));
        })(files[k]);
    }
});

var buildView = build('view', /\.html$/i, 
            function(files, save) {
    var content = {};
    var count = files.length;
    for(var k in files) {
        (function(fpath) {
            fs.readFile(fpath, TC(function(raw) {
                try {
                    var rpath = Path.relative(path(appDir, 'view'), fpath);
                    rpath = rpath.replace(/\.html$/i, '');
                    content[rpath] = minifyHTML(raw);
                    count--;
                    if(count == 0) {
                        content = JSON.stringify(content);
                        save('ViewSources=' + content);
                    }
                } catch(e) {
                    console.warn('Error in', fpath, e.toString());
                }
            }));
        })(files[k]);
    }
});

var buildAll = _.debounce(function() {
    buildIndex();
    buildStyle();
    buildScript();
    buildView();
}, 300);
buildAll();
try {
    var watcher = new (require('fs-watcher').watch)({
        root: appDir,
        refresh: 1000
    });
    watcher.on('create', buildAll);
    watcher.on('update', buildAll);
    watcher.on('delete', buildAll);
    watcher.start();
    setInterval(buildAll, 1000);
} catch(e) {
    console.log(e);
    fs.watch(appDir, {recursive:true}, buildAll);
}

//var scssArgs = ['--watch', 'style:build', '--style', 'compressed', '--sourcemap=none'];
//var scss = require('child_process').spawn('scss', scssArgs, {
//    cwd: appDir,
//    stdio: ['ignore', 'inherit', 'inherit']
//});
//function closeScss() {
//    try {
//        scss.kill();
//    } catch(e) {}
//    process.exit();
//};
//process.on('exit', closeScss);
//process.on('SIGINT', closeScss);
//process.on('SIGTERM', closeScss);

function build(mod, filter, callback) {
    return function() {
        var bmtime = 0;
        fs.stat(path(appDir, 'build', mod + '.js.gz'), function(err, stat) {
            if(stat)
                bmtime = stat.mtime.getTime();
            var w = walk(path(appDir, mod));
            var files = [];
            var updated = false;
            w.on('file', function(path, stat) {
                if(path.match(filter)) {
                    files.push(path);
                    if(stat.mtime.getTime() > bmtime || stat.ctime.getTime() > bmtime)
                        updated = true;
                }
            });
            w.on('end', function() {
                if(updated) {
                    callback(files, function(content) {
                        save(mod + '.js.gz', content);
                    });
                }
            });
        });
    };
}

function minifyHTML(content) {
    return minhtml(content.toString(), {
            removeAttributeQuotes: true,
            minifyJS: true,
            minifyCSS: true,
            removeComments: true,
            collapseWhitespace: true,
            removeRedundantAttributes:true
    });
}

function minifyJS(content) {
    return uglify.minify(content.toString(), {fromString: true}).code;
}

function save(name, content, callback) {
    if(typeof callback != 'function')
        callback = function() {console.log('built:', name);};
    fse.ensureFile(path(appDir, 'build', name), TC());
    zlib.gzip(new Buffer(content), TC(function(compressed) {
        writeAtomic(path(appDir, 'build', name), compressed, callback);
    }));
}

function writeAtomic(fpath, content, callback) {
    var thumb = '.' + new Date().getTime() + Math.ceil(Math.random() * 1000) / 1000;
    fs.writeFile(fpath + thumb + '.tmp', content, TC(function() {
        fs.rename(fpath + thumb + '.tmp', fpath, TC(callback));
    }));
}

function TC(callback) {
    return function(err) {
        if(err) 
            console.warn(err);
        else if(callback) 
            callback.apply(this, Array.prototype.slice.call(arguments, 1));
    };
}

function tryrequire(name) {
    try {
        return require(name);
    } catch(e) {
        console.warn('Missing module: ' + name);
        console.warn('  run\033[32m npm install ' + name + '\033[0m');
    }
}

