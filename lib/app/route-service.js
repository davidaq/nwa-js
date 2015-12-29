var express = require('express');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var _ = require('underscore');
var dataMatchBean = require('./data-match-bean');

var router = module.exports = express.Router();

var api;

router.use(function(req, res, next) {
    res.set('Content-Encoding', 'gzip');
    
    var write = _.bind(res.write, res);
    var end = _.bind(res.end, res);

    var gzip = zlib.createGzip();
    gzip.on('data', function(data) {
        write(data);
    });
    gzip.on('end', function() {
        end();
    });

    res.write = _.bind(gzip.write, gzip);
    res.end = _.bind(gzip.end, gzip);

    next();
});

router.all('/:group/:action', function(req, res) {
    if (!api || config.devmode) {
        api = path.resolve(BASE, 'build', 'api.json');
        try {
            api = fs.readFileSync(api);
            api = JSON.parse(api);
        } catch(e) {
            console.warn(e.stack);
            api = {
                actions: {},
                types: {}
            };
        }
    }
    res.set('Content-Type', 'application/json;charset=UTF-8');
    var group;
    var actionInfo = api.actions[req.params.group];
    try {
        group = Lrequire('service', req.params.group);
    } catch(e) {
        console.warn(e.stack);
        group = false;
    }
    if(!group && !actionInfo) {
        res.end('{error:500,message:"No such service group"}');
        return;
    }
    var action = group[req.params.action];
    actionInfo = actionInfo[req.params.action];
    if(!action || !actionInfo) {
        res.end('{error:500,message:"No such service action"}');
        return;
    }
    if(!req.body)
        req.body = {};
    if(!req.query)
        req.query = {};
    var params = [];
    for(var k in actionInfo.param) {
        params.push(req.body[k] || req.query[k]);
    }

    var TMP;
    action.apply(TMP = {
        req : req,
        res : res,
        resultMsg : {
            error : 0,
            message : '',
            result : null,
        },
        sendData : function(data) {
            res.end(JSON.stringifyNoNull(data));
        },
        result : function(data) {
            TMP.resultMsg.result = data;
            if (req.query.jsoncallback && req.query.jsoncallback.length > 0) {
                var method = req.query.jsoncallback;
                res.end(method + "&&" + method + "("
                        + JSON.stringifyNoNull(TMP.resultMsg) + ");");
            } else if (req.query.checktype && req.query.checktype.length > 0) {
                var theText = JSON.parse(JSON.stringifyNoNull(data));
                var theDMB = dataMatchBean(theText, actionInfo.result, api.types);
                TMP.resultMsg.checktype = theDMB;
                res.end(JSON.stringifyNoNull(TMP.resultMsg));
            } else {
                res.end(JSON.stringifyNoNull(TMP.resultMsg));
            }
        },
        error : function(result, message) {
            TMP.resultMsg.error = result;
            if (message) {
                TMP.resultMsg.message = message;
            } else if(config.error && config.error[result]) {
                TMP.resultMsg.message = config.error[result];
            }
            res.end(JSON.stringifyNoNull(TMP.resultMsg));
        }
    }, params);
});

