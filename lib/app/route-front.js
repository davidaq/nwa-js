module.exports = function(dir) {
    var express = require('express');
    var path = require('path');
    var mime = require('mime');

    dir = path.join('build', 'dir');
    var router = express.Router();

    router.get('/', function(req, res) {
        if(req.originalUrl.substr(-1) != '/') {
            res.redirect(req.originalUrl + '/');
        } else {
            req.params.file = 'index.html';
            respond(req, res);
        }
    });

    router.get('/:file', respond);

    function respond(req, res) {
        res.set('Content-Encoding', 'gzip');
        res.set('Content-Type', mime.lookup(req.params.file) + '; charset=utf-8');
        res.sendFile(req.params.file + '.gz', 
                {root:path.join(__root, dir)},
                function(err) {
            if(err) {
                console.warn(err);
                res.writeHead(404, {
                    'Content-Encoding': '',
                    'Content-Type': 'text/plain'
                });
                res.end('{"Error":"Oops, nothing here."}');
            }
        });
    };
    return router;
}
