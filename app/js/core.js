/* jshint expr:true */
/* global window */
(function (global) {
    "use strict";

    //---------------------------------------------------------------
    var _DEBUG = !!global._DEBUG,
        g_doc = global.document,
        VERSION = '1.0.0',
        FORMAT_PLACEHOLDER_PREFIX = '{{',
        FORMAT_PLACEHOLDER_SUFFIX = '}}',
        moduleBaseUri = global.JJ_MODULE_BASE_URI || '',
        modules = { };

    //---------------------------------------------------------------
    //
    // syntatic sugars
    //

    /**
     * no operation. used for dummy callback.
     *
     * @methodOf jj
     */
    function nop() {
        console.trace('nop');
    }

    /**
     *
     * @methodOf jj
     * @param {Object|Array|NodeList} target
     * @param {function} callback
     */
    function each(target, callback) {
        var k, len;
        if (!target) {
            return false; // ignore null
        }
        if (typeof callback !== 'function') {
            throw new TypeError();
        }
        if (Array.isArray(target) || (typeof target.length === 'number')) {
            // array or array-like
            for(k = 0, len = target.length; k < len; k++) {
                callback(target[k], k);
            }
        } else {
            // object
            for(k in target) {
                if(target.hasOwnProperty(k)) {
                    callback(target[k], k);
                }
            }
        }
        return false;
    }

    /**
     *
     * @param {object} obj
     * @param {boolean=} deep
     * @return {object}
     */
    function clone(obj, deep) {
        var target, k, v;
        // clone array
        if (obj instanceof Array) {
            return obj.slice(0);//Array.prototype.concat.call(obj);
        }
        // clone object
        target = {};
        each(obj, function (v, k) {
            target[k] = (deep && (typeof v === 'object')) ? clone(v, deep) : v;
        });
        return target;
    }

    /**
     *
     * @methodOf jj
     * @param {string} fmt
     * @param {*=} var_args
     * @return {string} formatted string
     */
    function format(fmt, var_args) {
        var i, argc, arg, str = String(fmt);
        if (arguments.length > 1) {
            if ((arguments.length === 2) && (typeof arguments[1] === 'object'))  {
                arg = arguments[1];
                // placeholder with name
                for(i in arg) {
                  if(arg.hasOwnProperty(i)) {
                    str = str.replace(new RegExp(FORMAT_PLACEHOLDER_PREFIX + i + FORMAT_PLACEHOLDER_SUFFIX, 'g'), arg[i]);
                  }
                }
            } else {
                // placeholder with index
                for(i = 1, argc = arguments.length; i < argc; i += 1) {
                    str = str.replace(new RegExp(FORMAT_PLACEHOLDER_PREFIX + (i - 1) + FORMAT_PLACEHOLDER_SUFFIX, 'g'), arguments[i]);
                }
            }
        }
        return str;
    }

    /**
     * bind a function with a context
     *
     * @methodOf jj
     * @param {Object} ctx
     * @param {function|string} func
     * @param {*=} var_args
     * @return {function}
     */
    function bind(ctx, func, var_args) {
        var slice, args;
        ctx = ctx || global;
        if (typeof func === 'string') {
            func = ctx[func];
        }
        if (typeof func !== 'function') {
            throw new TypeError();
        }
        slice = Array.prototype.slice;
        args = slice.call(arguments, 2);
        return function () {
            return func.apply(ctx, args.concat(slice.call(arguments)));
        };
    }

    /**
     * invoke a function in async
     *
     * @methodOf jj
     * @param func {function}
     * @param {number} timeout
     * @return {number} timeout handle
     */
    function invokeLater(func, timeout) {
        if (typeof func !== 'function') {
            throw new TypeError();
        }
        return setTimeout(func, timeout || 50);
    }

    /**
     *
     * @methodOf jj
     * @param {Node} node
     * @param {string} subtype
     * @param {string=} type
     * @param {boolean=} bubbles
     * @param {boolean} cancelable
     * @return {boolean}
     */
    function fireEvent(node, subtype, type, bubbles, cancelable) {
        var evt = g_doc.createEvent(type||'Events');
        evt.initEvent(subtype, !!bubbles, !!cancelable);
        return node.dispatchEvent(evt);
    }

    /**
     *
     * @param func
     */
    function ready(func) {
        g_doc.addEventListener('DOMContentLoaded', function () { func(); }, false);
    }

    /**
     * @name AjaxOpts
     * @class
     * @property {string=} method
     * @property {string} uri
     * @property {boolean=} async
     * @property {Object.<string,string>=} headers
     * @property {function(XMLHttpRequest)} success
     * @property {function(XMLHttpRequest)} error
     */

    /**
     * simple XMLHttpRequest wrapper.
     *
     * @methodOf jj
     * @param {Object.<AjaxOpts>} opts ajax options
     */
    function ajax(opts) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            var status, callback;
            if (xhr.readyState === 4) {
                status = xhr.status;
                callback = (status === 0 || (status >= 200 && status < 300) || status === 302) ? opts.success : opts.error;
                if (typeof callback === 'function') { callback(xhr); }
            }
        };
        try {
            xhr.open(opts.method || 'GET', opts.uri, !!opts.async);
            if(typeof opts.headers === 'object') {
                each(opts.headers, function(v, k) {
                    xhr.setRequestHeader(k, v);
                });
            }
            xhr.send(opts.data);
        } catch (e) {
            if (typeof opts.error === 'function') { opts.error(xhr, e); }
        }
        return xhr;
    }

    //---------------------------------------------------------------
    //
    // oop support
    //

    /**
     * This class provides helper methods to define/decorate javascript object.
     *
     * NOTE: use jj.def() to create an instance of this class.
     *
     * @class
     * @constructor
     * @param {Object=} target a target to decorate
     */
    function JJDef(target) {
        this.target = target || {};
    }

    /**
     * add a constant(read-only) property to the target.
     *
     * @param {string} name property name.
     * @param {*} value property value.
     * @return {JJDef}
     */
    JJDef.prototype.constant = function(name, value) {
        this.target.__defineGetter__(name, function () { return value; });
        return this;
    };

    /**
     * add a property to the target.
     *
     * @param {string} name property name.
     * @param {function=} getter getter function. no getter if null or undefined.
     * @param {function=} setter setter function. no setter if null or undefined.
     * @return {JJDef}
     */
    JJDef.prototype.property = function(name, getter, setter) {
        if (getter) { this.target.__defineGetter__(name, getter); }
        if (setter) { this.target.__defineSetter__(name, setter); }
        return this;
    };

    /**
     * add a method to the target.
     *
     * @param {string} name
     * @param {function=} func function to add.
     * @return {JJDef}
     */
    JJDef.prototype.method = function(name, func) {
        this.target.__defineGetter__(name, function () { return func; });
        return this;
    };

    /**
     * declare as a namespace.
     *
     * @param {string} name period(.) separated name
     * @param {Object=} parent parent namespace object(optional. default: global)
     * @return {JJDef}
     */
    JJDef.prototype.ns = function(name, parent) {
        var i, term, terms;
        if (!parent) {
            parent = global;
        }
        for (i = 0, terms = name.split('.'); i < terms.length - 1; i += 1) {
            term = terms[i];
            if (!parent.hasOwnProperty(term)) {
                // empty for interim namespace
                parent[term] = {};
            }
            parent = parent[term];
        }

        term = terms[i];
        parent[term] = this.target;

        return this;
    };

    /**
     * merge all properties(and methods) with other objects.
     *
     * @param {...object} var_args
     * @return {JJDef}
     */
    JJDef.prototype.mixin = function(var_args) {
        var k, v, i, argc, arg;
        for (i = 0, argc = arguments.length; i < argc; i += 1) {
            arg = arguments[i];
            for (k in arg) {
                if (arg.hasOwnProperty(k)) {
                    v = arg[k];
                    if (!this.target.hasOwnProperty(k) || (this.target[k] !== v)) {
                        this.target[k] = v;
                    }
                }
            }
        }
        return this;
    };

    /**
     * end of decorator.
     *
     * @return {Object} the decorated target
     */
    JJDef.prototype.end = function () {
        return this.target;
    };

    /**
     * define/decorate javascript object.
     *
     * @methodOf jj
     * @param {Object=} target an object to decorate or null
     * @return {JJDef} a decorator
     */
    function def(target) {
        return new JJDef(target);
    }

    /**
     * define a class-like constructor function.
     *
     * @methodOf jj
     * @param {Object=} members instance members
     * @param {function=} SuperClass constructor function of superclass
     */
    function defclass(members, SuperClass) {
        // define constructor function wraps initializer
        function SubClass() {
            // call initializer(pseudo constructor) of superclass
            if (SubClass.$super && SubClass.$super.hasOwnProperty('init')) {
                SubClass.$super.init.apply(this, arguments);
            }
            // call initializer(internal constructor) of subclass
            if (SubClass.prototype.hasOwnProperty('init')) {
                SubClass.prototype.init.apply(this, arguments);
            }
        }

        // by default, inherit from Object
        SuperClass = SuperClass || Object;

        // proxy to avoid unexpected prototype chain
        function DummyClass() {}
        DummyClass.prototype = SuperClass.prototype;

        // inherit from SuperClass via proxy
        SubClass.prototype = new DummyClass();
        SubClass.prototype.constructor = SubClass;

        // custom property to access instance of superclass
        SubClass.$super = SuperClass.prototype;
        SubClass.prototype.$super = function (name) {
            var self = this;
            return function() {
                SubClass.$super[name].apply(self, arguments);
            };
        };

        // copy instance members
        // TODO: read-only members...
        each(members, function (v, k) {
            SubClass.prototype[k] = members[k];
        });

        return SubClass;
    }

    //---------------------------------------------------------------
    //
    // commonjs support
    //

    /**
     * commonjs-like module.
     *
     * @class
     * @constructor
     * @param {string} id
     * @param {Object} exports
     */
    function Module(id, exports) {
        this.id = id;
        this.uri = moduleBaseUri + id.replace('.', '/') + '.js',
        this._exports = exports || { };
    }

    /**
     * load commonjs-like module.
     *
     * TODO: resolve relative moduleId
     * TODO: require.paths
     *
     * @methodOf jj
     * @param {string} id fully-qualified module identifier.
     * @param {function=} callback callback function.
     * @param {object=} context
     */
    function require(id, callback, context) {
        var module = modules[id];

        if (module) {
            console.warn('module already loaded: ' + id);
            return module._exports;
        }

        module = new Module(id);

        // wrap with local function
        function requireModule() {
            return require.apply(context, arguments);
        }
        requireModule.main = id;
        requireModule.paths = [];

        // load module script via ajax
        ajax({
            method: 'GET',
            uri: module.uri,
            async: !!callback,
            success: function(xhr) {
                // FIXME: security! script injection?
                /* jshint evil:true */
                var moduleFunc = new Function('require', 'exports', 'module', xhr.responseText);
                /* jshint evil:false */

                moduleFunc.call(context, requireModule, module._exports, module);

                modules[id] = module;
                _DEBUG && console.info('module loaded: ' + id);
                callback && callback.call(context, module._export);
            },
            error: function(xhr, e) {
                throw new Error('failed to load module: ' + id);
            }
        });

        return module._exports;
    }

    /**
     * TODO: ...
     */
    function define(id, deps, moduleFunc, context) {
        var module = modules[id];

        if (module) {
            console.warn('module already loaded: ' + id);
            return module._exports;
        }

        // TODO: make async!
        if (deps) {
            each(deps, require);
        }

        module = new Module(id);

        // wrap with local function
        function requireModule() {
            return require.apply(null, arguments);
        }
        requireModule.main = id;
        requireModule.paths = [];

        moduleFunc.call(context, requireModule, module._exports, module, global);

        modules[id] = module;
        if (_DEBUG) { console.info('module defined: ' + id); }

        // declare as a global namespace
        return def(module._exports).ns(id).end();
    }

    /**
     * assert condition.
     *
     * @param {boolean} condition
     * @param {string} message
     * @methodOf jj
     */
    function assert(condition, message) {
        if (!condition) {
            throw new Error('assertion failed:' + message);
        }
    }

    //---------------------------------------------------------------
    //
    // entry point
    //

    /**
     * @name jj
     * @namespace root namespace for jj library.
     */
    function jj() {
    }

    // register module itself
    modules['jj.core'] = new Module('jj.core');

    //---------------------------------------------------------------
    def(global)
        .constant('jj', def(jj)
            .constant('version', VERSION)
            .method('nop', nop)
            .method('each', each)
            .method('clone', clone)
            .method('format', format)
            .method('bind', bind)
            .method('invokeLater', invokeLater)
            .method('fireEvent', fireEvent)
            .method('ready', ready)
            .method('ajax', ajax)
            .method('def', def)
            .method('defclass', defclass)
            .method('require', require)
            .method('define', define)
            .method('assert', assert)
            .end()
    );
}(window));

