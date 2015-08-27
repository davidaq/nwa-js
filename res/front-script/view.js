module('View')
.depends('Observable')
.build(function(Observable) {
    var templates = {};
    templates[''] = _.template('<%=text%><%_.each(children, function(v){print(v)})%>');

    var View = inherit(Observable, function(viewPath, model) {
        var attrs = {
            viewPath: viewPath,
            viewModel: model || this.viewModel || {},
            viewChildren : this.viewChildren || [],
            viewText : ''
        }
        if(typeof viewPath == 'function') {
            attrs.viewText = viewPath;
            viewPath = '';
        } else if(typeof viewPath != 'string') {
            attrs.viewPath = '';
            for(var k in viewPath) {
                attrs[k] = viewPath[k];
            }
            viewPath = attrs.viewPath;
        }
        if(!templates[viewPath]) {
            templates[viewPath] = _.template(ViewSources[viewPath]);
        }

        Observable.call(this, attrs);

        this.ui = null;
        this.viewEventBindings = [];
        this.viewTemplate = templates[viewPath];

        this.onUpdate(_.bind(this.redraw, this));

        this.redraw();
    });

    View.prototype.redraw = function() {
        var oldUI = this.$ui;
        var model = _.clone(this.viewModel || {});
        _.defaults(model, {
            $view: this,
            children: this.viewChildren,
            text: this.viewText
        });
        if(typeof model.text == 'function')
            model.text = model.text();
        var html = this.viewTemplate(model);
        var ui = document.createElement('aq-view');
        ui.innerHTML = html;
        this.$ui = $(ui);
        ui = this.ui = [ui];
        var self = this;

        var usedViews = [];
        $('*', this.ui).each(function() {
            if(this.tagName.toLowerCase() == 'aq-view') {
                usedViews.push(this);
                return;
            }
            var $e = this;
            var attrs = {};
            _.extend(attrs, this.attributes);
            for(var k = 0; k < attrs.length; k++) {
                (function(attr, k) {
                    if(attr.name.substr(0, 2) == 'on') {
                        $e.removeAttribute(attr.name);
                        if(attr.name == 'onsubmit') {
                            $e.setAttribute('onsubmit', 'return false');
                        }
                        $e.setAttribute('data-x-' + attr.name, attr.value);
                        var handler = ViewScopeHandlerFunc(self, attr.value);
                        $($e).on(attr.name.substr(2), function(e) {
                            if(false === handler(e)) {
                                e.stopPropagation();
                                e.preventDefault();
                                return false;
                            }
                        });
                    } else if(attr.name == 'bind') {
                        ui[attr.value] = $e;
                        $e.removeAttribute(attr.name);
                    }
                })(attrs[k], k);
            }
        });
        if(oldUI) {
            oldUI.replaceWith(this.ui);
            for(var k in this.viewEventBindings) {
                this.on.apply(this, this.viewEventBindings[k]);
            }
        }
        for(var k in usedViews) {
            var $t = $(usedViews[k]);
            var vid = $t.attr('data-replace-with');
            if(tmpRefs[vid]) {
                $t.replaceWith(tmpRefs[vid].view.ui);
            }
        }
    };

    View.prototype.append = function(val) {
        this.viewChildren.push(val);
        this.update();
    };

    View.prototype.prepend = function(val) {
        this.viewChildren.unshift(val);
        this.update();
    };

    View.prototype.clear = function() {
        this.setViewChildren([]);
    };

    View.prototype.setView = function(val) {
        this.setViewChildren([val]);
    };

    View.prototype.getView = function(index) {
        return this.viewChildren[index ? index : 0];
    };

    var tmpRefs = {};
    View.prototype.toString = function() {
        var vid = this.objectID;
        if(!tmpRefs[vid]) {
            tmpRefs[vid] = {
                deref: _.debounce(function() {
                    delete tmpRefs[vid];
                }, 100),
                view:this
            }
        }
        tmpRefs[vid].deref();
        return '<aq-view data-replace-with="' + vid + '"></aq-view>';
    };

    function evtHandlerId() {
        var eid = [];
        for(var k in arguments) {
            if(typeof arguments[k] == 'string') {
                if(k - 0 > 2)
                    eid.push(arguments[k]);
            } else if(typeof arguments[k] == 'function') {
                eid.push(objectID(arguments[k]));
            }
        }
        return eid.join("\033");
    }

    View.prototype.on = function() {
        this.viewEventBindings[evtHandlerId.apply(null, arguments)] = arguments;
        if(this.$ui) {
            this.$ui.on.apply(this.$ui, arguments);
        }
        return {
            cancel: _.bind(function() {
                this.off(arguments);
            }, this)
        };
    };

    View.prototype.off = function() {
        delete this.viewEventBindings[evtHandlerId.apply(null, arguments)];
        if(this.$ui) {
            this.$ui.off.apply(this.$ui, arguments);
        }
    };

    return View;
});

function ViewScopeHandlerFunc($view, handlerFunc) {
    var scope = {handlerFunc:handlerFunc};
    with(scope) {
        eval('handlerFunc=function(event) {' + handlerFunc + '}');
        return handlerFunc;
    }
}
