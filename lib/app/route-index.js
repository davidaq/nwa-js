var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs')

/**
 * Site update api
 */
router.get('/update-site', function(req, res) {
    console.log('UPDATE!');
	res.writeHead(200, {
		'Content-Type' : 'text/plain;charset=UTF-8'
	});
    res.write('Update from branch: ');
    res.end(config.gitBranch || 'master');
    require('../common/update-site')();
});

/**
 * Serve api description file with modified host
 */
function serveApiDefinition(fpath, req, res) {
    fs.readFile(fpath, 'utf-8', function(err, c) {
        if(err) {
            res.end('');
        } else {
            c = c.replace(/%%HOST%%/, req.headers.host);
            res.end(c);
        }
    });
}
router.get('/api.json', function(req, res) {
    res.writeHead(200, {
        'Content-Type' : 'text/plain;charset=utf-8'
    });
    serveApiDefinition(path.join(BASE, 'build', 'api.json'), req, res);
});
router.get('/api.xml', function(req, res) {
    res.writeHead(200, {
        'Content-Type' : 'text/xml;charset=utf-8'
    });
    serveApiDefinition(path.join(BASE, 'build', 'api.xml'), req, res);
});

module.exports = router;
