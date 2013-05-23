/**
 * "View" support.
 *
 * @namespace
 * @name jj.v
 * @example
 * <div data-view="view1" data-model="model1"></div>
 * <script id="view1" type="application/x-jj-view">...</div>
 * <script id="model1" type="application/x-jj-model">...</div>
 */
(jj.define('jj.v', [ 'jj.m' ], function (require, exports, module, global) {
    "use strict";
    //-------------------------------------------------------------

    var _DEBUG = !!global._DEBUG,
        g_doc = global.document,
        VIEW_SELECTOR = 'script[type^="application/x-jj-view"]',
        VIEW_ATTR_TEMPLATE = 'data-template',
        DEF_VIEW_TYPE = '*',
        DEF_REMOTE_VIEW_TYPE = 'ajax',
        DEF_TEMPLATE_TYPE = '*',
        EJS_TEMPLATE_TYPE = 'ejs',
        EJS_SCRIPTLET_PREFIX = '{%',
        EJS_SCRIPTLET_SUFFIX = '%}',
        EJS_PLACEHOLDER_REGEXP = /\{\{[\s]*([^\s]+)[\s]*\}\}/g,
        templateTypes = {},
        viewTypes = {},
        views = {};

    //-------------------------------------------------------------

    /**
     *
     * @class
     * @name DefaultTemplate
     */
    templateTypes[DEF_TEMPLATE_TYPE] = jj.defclass({
        /**
         *
         * @constructor
         * @param source
         */
        init: function(source) {
            this.source = source;
        },
        /**
         *
         * @param model
         */
        merge: function(model) {
            return jj.format(this.source, model);
        }
    });

    //-------------------------------------------------------------

    /**
     *
     * @class
     * @name EjsTemplate
     */
    templateTypes[EJS_TEMPLATE_TYPE] = jj.defclass({
        init: function(source) {
            // XXX: swap javascript stmts and html
            var funcBody = 'var p=[];' +
                'p.push(\'' +
                source
                    .replace(/[\r\t\n]/g, ' ')
                    .split(EJS_SCRIPTLET_PREFIX).join('\t')
                    .replace(/((^|%})[^\t]*)'/g, '$1\r')
                    .replace(EJS_PLACEHOLDER_REGEXP, '\',model.$1,\'')
                    .split('\t').join('\');')
                    .split(EJS_SCRIPTLET_SUFFIX).join('p.push(\'')
                    .split('\r').join('\'') +
                '\');' +
                'return p.join(\'\');';
            if (_DEBUG) {
                console.log('create ejs template');
                console.log(funcBody);
            }
            this.func = new Function('jj', 'model', funcBody);
        },

        merge: function(model) {
            if (_DEBUG) { console.log('merge ejs template with data'); }
            return this.func.call(global, jj, model);
        }
    }, templateTypes[DEF_TEMPLATE_TYPE]);

    //-------------------------------------------------------------

    /**
     * @class
     * @name DefaultView
     */
    viewTypes[DEF_VIEW_TYPE] = jj.defclass({
        /**
         *
         * @param {Node} node
         */
        init: function (node) {
            this.node = node;
            this.template = null;
            this.toString = function () {
                return 'jj-view#' + node.id + ':' + node.type + ':' + node.src;
            }
        },
        /**
         *
         * @param {function} callback
         */
        load: function (callback) {
            callback(this.node.firstChild.nodeValue);//innerHTML? innerText?
        },
        /**
         *
         * @param model
         * @param callback
         * @return {*}
         */
        merge: function (model, callback) {
            var self = this;

            if (_DEBUG) { console.log('merge ' + self + ' with ' + model); }

            if (!model)  {
                if (_DEBUG) { console.warn('no model to merge with'); }
                return this.load(callback);
            }

            function doMerge() {
                model.load(function (data) {
                    callback(self.template.merge(data));
                });
            }

            if (this.template) {
                return doMerge();
            }

            this.load(function (content) {
                var templateType = self.node.getAttribute(VIEW_ATTR_TEMPLATE) || DEF_TEMPLATE_TYPE,
                    TemplateType = templateTypes[templateType];
                if (TemplateType) {
                    self.template = new TemplateType(content);
                    if(self.template) {
                        return doMerge();
                    }
                }
                console.warn('bad or missing template: id=' + self.node.id + ',type=' + self.node.type + ',template=' + templateType);;
                return content;
            });
        }
    });

    //-------------------------------------------------------------

    /**
     *
     * @class
     * @name AjaxView
     */
    viewTypes[DEF_REMOTE_VIEW_TYPE] = jj.defclass({
        /**
         * TODO: cache!
         *
         * @param {function} callback
         */
        load: function (callback) {
            var self = this;

            if (_DEBUG) { console.log('load view... ' + self); }

            if (!self.node.src) {
                throw new Error('bad or missing src: ' + self);
            }

            jj.ajax({
                method: 'GET',
                uri: self.node.src,
                async: true,
                success: function (xhr) {
                    if (_DEBUG) { console.log('load view ok: ' + self); }
                    callback(xhr.responseText);
                },
                error: function (xhr, e) {
                    if (e) { console.error(e); }
                    throw new Error('load view error: ' + self);
                }
            });
        }
    }, viewTypes[DEF_VIEW_TYPE]);

    /**
     *
     * @param {Node} node a view node with/without static template
     * @return {View}
     */
    function initView(node) {
        var viewType = node.type.split('+')[1] || ((node.src) ? DEF_REMOTE_VIEW_TYPE : DEF_VIEW_TYPE),
            ViewType = viewTypes[viewType],
            view;

        if (_DEBUG) { console.log('init view: id=' + node.id + ',type=' + node.type + ',src=' + node.src); }

        if (!ViewType) {
            throw new Error('bad or missing view type');
        }

        view = new ViewType(node);
        views[node.id] = view;
        return view;
    }

    /**
     * pre-init all views.
     *
     * @param {Node=} base a base node to search view nodes
     */
    function init(base) {
        if (_DEBUG) { console.log('init v module...'); }
        jj.each((base || g_doc).querySelectorAll(VIEW_SELECTOR), initView);
    }

    /**
     *
     * @param {string} id a view identifier
     * @return {View}
     */
    function getView(id) {
        var view = views[id];
        if (!view) {
            view = initView(g_doc.getElementById(id));
        }
        return view;
    }

    // auto-init
    jj.ready(init);

    //-------------------------------------------------------------
    jj.def(exports)
        .constant('templateTypes', templateTypes)
        .constant('views', views)
        .constant('viewTypes', viewTypes)
        .method('initView', initView)
        .method('init', init)
        .method('getView', getView)
        .end();
}));
