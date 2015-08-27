module('Observable', function() {
    function Observable(map) {
        objectID(this);

        this.__updateDebounceTimeout = false;
        this.__updatePreHandlers = {};
        this.__updateHandlers = {};
        this.__updatePostHandlers = {};

        if(map) {
            for(var k in map) {
                (function(k, v) {
                    this[k] = v;
                    var uname = k[0].toUpperCase() + k.substr(1);
                    this['set' + uname] = function(v) {
                        this[k] = v;
                        this.update();
                    };
                }).call(this, k, map[k]);
            }
        }
    }

    Observable.prototype.update = function() {
        if(this.__updateDebounceTimeout)
            clearTimeout(this.__updateDebounceTimeout);
        var self = this;
        this.__updateDebounceTimeout = setTimeout(function() {
            self.__updateDebounceTimeout = false;
            signalHandlers(self.__updatePreHandlers, self);
            signalHandlers(self.__updateHandlers, self);
            signalHandlers(self.__updatePostHandlers, self);
        }, 50);
    };

    Observable.prototype.onUpdate = function(handler) {
        if(isValidHandler(handler))
            this.__updateHandlers[objectID(handler)] = handler;
    };

    Observable.prototype.preUpdate = function(handler) {
        if(isValidHandler(handler))
            this.__updatePreHandlers[objectID(handler)] = handler;
    };

    Observable.prototype.postUpdate = function(handler) {
        if(isValidHandler(handler))
            this.__updatePostHandlers[objectID(handler)] = handler;
    };

    Observable.prototype.observe = function(object) {
        if(object.onUpdate && typeof object.onUpdate == 'function') {
            object.onUpdate(this);
        }
    };

    Observable.prototype.detach = function(handler) {
        delete this.__updateHandlers[objectID(handler)];
        delete this.__updatePreHandlers[objectID(handler)];
        delete this.__updatePostHandlers[objectID(handler)];
    };

    Observable.prototype.detachAll = function() {
        this.__updateHandlers = [];
        this.__updatePreHandlers = [];
        this.__updatePostHandlers = [];
    };

    function isValidHandler(handler) {
        if(typeof handler == 'function') {
            return true;
        }
        if(handler.update && typeof handler.update == 'function') {
            return true;
        }
        return false;
    }

    function signalHandlers(handlers, context) {
        for(var k in handlers) {
            var handler = handlers[k];
            if(typeof handler == 'function') {
                setTimeout(_.bind(handler, context), 0);
            } else {
                setTimeout(_.bind(handler.update, handler), 0);
            }
        }
    }
    
    return Observable;
});

function inherit(type, func) {
    if(typeof type != 'function')
        throw new Error('Can not inherit from non function type');
    if(!func)
        func = function() {};
    var ret = func;
    _.extend(ret.prototype, type.prototype);
    return ret;
}

function objectID(object) {
    if(!object) return 'id';
    if(!object.objectID) {
        object.objectID = new Date().getTime() & 0xfffff;
        object.objectID *= 10000;
        object.objectID += Math.ceil(Math.random() * 10000);
        object.objectID = 'id' + object.objectID;
    }
    return object.objectID;
}

