var path = require('path');
var fs = require('fs');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var express = require('express');

var app = module.exports = express();

if(fs.existsSync(path.join(BASE, 'index.js'))) {
    var index = require(path.join(BASE, 'index.js'));
    if(typeof index == 'function') {
        index(app);
    }
}

//=== log requests
app.use(morgan('dev'));

//=== parse post HTTP body
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

//=== serve special files
app.use(require('./route-index'));

//=== serve front ends
for(var k in config.fronts) {
    var front = config.fronts[k];
    console.log(front);
    if(front.mount[0] != '/')
        front.mount = '/' + front.mount;
    app.use(front.mount, require('./route-front')(front.path));
}

//=== serve service api
app.use('/service', require('./route-service'));

//=== serve static files
app.use(express.static(path.join(BASE, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

//=== catch 404
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

//=== handler error
app.use(function(err, req, res, next) {
    console.warn(err.stack);
    res.end(JSON.stringify({
        error : 500,
        message : err.message
    }));
});

