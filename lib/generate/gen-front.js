#!/usr/bin/env node

var Path = require('path');
var path = Path.join;
var fs = require('fs');
var zlib = require('zlib');

var uglify = require('uglify-js');
var minhtml = require('html-minifier').minify;
var fse = require('fs-extra');
var walk = require('walkdir');
var _ = require('underscore');

module.exports = function(appPath) {
    var appDir = path(BASE, appPath);
    var buildDir = path(BASE, 'build', appPath);

    (function buildIndex() {
        try {
            var mtime = fs.statSync(path(appDir, 'index.html'))
                .mtime.getTime();
            var utime = fs.statSync(path(buildDir, 'index.html.gz'))
                .mtime.getTime();
            if(mtime < utime) {
                return;
            }
        } catch(e) {
        }
        fs.readFile(path(appDir, 'index.html'), TC(function(content) {
            save('index.html.gz', minifyHTML(content));
        }));
    })();

    (function buildStyle() {
        var scssArgs = ['--update', 'style:' + buildDir, '--style', 'compressed'];
        var scss = require('child_process').spawn('scss', scssArgs, {
            cwd: appDir,
            stdio: ['ignore', 'inherit', 'inherit']
        });
        scss.on('exit', function() {
            try {
                var mtime = fs.statSync(path(buildDir, 'style.css'))
                    .mtime.getTime();
                var utime = fs.statSync(path(buildDir, 'style.css.gz'))
                    .mtime.getTime();
                if(mtime < utime) {
                    return;
                }
            } catch(e) {
            }
            fs.readFile(path(buildDir, 'style.css'), TC(function(content) {
                save('style.css.gz', content);
            }));
            fs.readFile(path(buildDir, 'style.css.map'), function(err, content) {
                if(!err)
                    save('style.css.map.gz', content);
            });
        });
    })();

    build('script', /\.js$/, function(files, save) {
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

    build('view', /\.html$/i, function(files, save) {
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

    function build(mod, filter, callback) {
        var bmtime = 0;
        fs.stat(path(buildDir, mod + '.js.gz'), function(err, stat) {
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
    }

    function save(name, content, callback) {
        if(typeof callback != 'function')
            callback = function() {console.log('built:', name);};
        fse.ensureFile(path(buildDir, name), TC());
        zlib.gzip(new Buffer(content), TC(function(compressed) {
            writeAtomic(path(buildDir, name), compressed, callback);
        }));
    }
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

