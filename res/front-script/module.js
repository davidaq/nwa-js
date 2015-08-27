function module() {
    initModuleLoader();
    var name, dependencies = [], body;
    for(var k in arguments) {
        switch(typeof arguments[k]) {
        case 'string':
            if(!name) {
                name = arguments[k];
            } else {
                dependencies = arguments[k].split(/\s*,\s*/);
            }
            break;
        case 'function':
            body = arguments[k];
            break;
        default:
            dependencies = arguments[k];
            break;
        }
    }
    if(!name) {
        name = 'Annonymous module ' + module.annoCounter;
        module.annoCounter++;
    }
    if(body) {
        if(module.mods[name]) {
            console.error('Duplicate module: ' + name, body);
            return;
        }
        var mod = {
            name: name,
            body: body,
            loaded: false,
            entity: null,
            dependencies: dependencies,
            waits: {}
        };
        module.mods[name] = mod;
        for(var k in dependencies) {
            mod.waits[dependencies[k]] = true;
        }
        module.check(mod);
    } else {
        return {
            build: function(body) {
                return module(name, dependencies, body);
            },
            depends: function(dependencies) {
                return module(name, dependencies);
            },
            get: function() {
                var mod = module.mods[name];
                if(!mod) return null;
                return mod.entity;
            },
            new: function() {
                var mod = module.mods[name];
                if(!mod || !mod.entity) 
                    return null;
                mod = mod.entity;
                var ret = [];
                for(var k in arguments) {
                    ret.push('arguments[' + k + ']');
                }
                ret = ret.join(',');
                eval('ret = new mod(' + ret + ')');
                return ret;
            }
        }
    }
}

function depends(dependencies) {
    return module().depends(dependencies);
};

function initModuleLoader() {
    if(module.inited)
        return;
    module.inited = true;
    module.annoCounter = 0;
    module.mods = {};
    module.waits = {};

    module.loaded = function(mod) {
        mod.loaded = true;
        var deps = [];
        for(var k in mod.dependencies) {
            deps.push(module.mods[mod.dependencies[k]].entity);
        }
        mod.entity = mod.body.apply(null, deps);
        if(module.waits[mod.name]) {
            for(var k in module.waits[mod.name]) {
                module.check(module.waits[mod.name][k]);
            }
            delete module.waits[mod.name];
        }
    };

    module.check = function(mod) {
        var satisfied = true;
        for(var depModName in mod.waits) {
            if(module.mods[depModName] && module.mods[depModName].loaded) {
                mod.waits[depModName] = null;
                delete mod.waits[depModName];
            } else {
                satisfied = false;
                if(!module.waits[depModName]) {
                    module.waits[depModName] = {};
                }
                module.waits[depModName][mod.name] = mod;
            }
        }
        if(satisfied) {
            delete mod.waits;
            module.loaded(mod);
        }
    };

    extendJQuery();
}
