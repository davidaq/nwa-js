global.__root = __dirname;

var path = require('path');
var util = require(path.join(__root, 'common/util'));

var express = require('express');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var session = require('express-session');
var FSStore = require('session-file-store')(session);

var app = express();

app.use(logger('dev'));

app.use(bodyParser.urlencoded({ extended : true }));
app.use(bodyParser.json());

require('./common/session-file-atomic-fix');
app.use(session({
    name : "sessionid",
    store : new FSStore({
        path: '/tmp/waaa_node_sessions',
        ttl: 2 * 24 * 3600 * 1000,
        retries: 1
    }),
    resave: true,
    saveUninitialized: true,
    secret : 'Waaa',
    cookie: { maxAge: 2 * 24 * 3600 * 1000  } // 2 days
}));

app.use('/', require('./common/route-index'));
app.use('/admin', require('./common/route-front')('admin'));
app.use('/demo', require('./common/route-front')('demo'));

app.use('/service', require('./common/filter-gzip'));
app.use('/service', require('./common/filter-nwalogin'));
app.use('/service', require('./common/route-service'))

app.use(express.static(path.join(__dirname, 'public')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function(err, req, res, next) {
    console.log(err.stack);
    res.end(JSON.stringify({
        error : 500,
        message : err.message
    }));
});

module.exports = app;

console.log('Start up', new Date().toString());
