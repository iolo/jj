/**
 * "Model" support.
 *
 * @namespace
 * @name jj.m
 * @example
 * <div data-view="view1" data-model="model1"></div>
 * <div id="view1" class="jj-view">...</div>
 * <div id="model1" class="jj-model">...</div>
 */
(jj.define('jj.m', [ ], function (require, exports, module, global) {
    "use strict";
    //-------------------------------------------------------------

    var _DEBUG = !!global._DEBUG,
        g_doc = global.document,
        MODEL_SELECTOR = 'script[type^="application/x-jj-model"]',
        DEF_MODEL_TYPE = '*',
        DEF_REMOTE_MODEL_TYPE = 'ajax',
        WEBSTORAGE_MODEL_TYPE = 'webstorage',
        WEBSTORAGE_ATTR_STORAGE = 'data-storage',
        WEBSTORAGE_ATTR_STORAGE_KEY = 'data-storage-key',
        WEBSTORAGE_DEF_STORAGE_KEY_PREFIX = 'jj-model-webstorage-',
        modelTypes = {},
        models = {};


    //-------------------------------------------------------------

    /**
     *
     * @class
     * @name DefaultModel
     */
    modelTypes[DEF_MODEL_TYPE] = jj.defclass({
        /**
         *
         * @param {Node} node
         */
        init: function (node) {
            var _data, _metadata;

            this.id = node.id;
            this.node = node;

            this.__defineGetter__('data', function () {
                return _data;
            });
            this.__defineSetter__('data', function (data) {
                _data = jj.clone(data, true);
            });
            this.__defineGetter__('metadata', function () {
                return _metadata;
            });
            this.__defineSetter__('metadata', function (metadata) {
                _metadata = jj.clone(metadata, true);
            });
            this.toString = function () {
                return 'jj-model#' + node.id + ':' + node.type + ':' + node.src;
            }
        },
        /**
         *
         * @param {function} callback
         */
        load: function (callback) {
            if (!this.data) {
                this.data = JSON.parse(this.node.firstChild.nodeValue);//innerText? innerHTML?
            }
            callback(this.data);
        },
        /**
         *
         * @param {object} data
         */
        save: function (data) {
            this.data = data;
        }

        /*
        save: function(item, cb, eb) {},
        destroy function(item, cb, eb) {},
        find: function(key, cb, eb) {},
        all: function(cb, eb) {},
        count: function(cb, eb) {},
        */
    });


    //-------------------------------------------------------------

    /**
     *
     * @class
     * @name AjaxModel
     */
    modelTypes[DEF_REMOTE_MODEL_TYPE] = jj.defclass({
        /**
         * TODO: cache!
         *
         * @param {function} callback
         */
        load: function (callback) {
            var self = this;

            if (_DEBUG) { console.log('load model... ' + self); }

            if (!self.node.src) {
                throw new Error('bad or missing model src');
                return;
            }

            jj.ajax({
                method: 'GET',
                uri: self.node.src,
                async: true,
                success: function (xhr) {
                    if (_DEBUG) { console.log('load model ok: ' + self); }
                    self.data = JSON.parse(xhr.responseText);
                    callback(self.data);
                },
                error: function (xhr, e) {
                    if (e) { console.error(e); }
                    throw new Error('load model error: ' + self);
                }
            });
        }
    }, modelTypes[DEF_MODEL_TYPE]);

    //-------------------------------------------------------------

    modelTypes[WEBSTORAGE_MODEL_TYPE] = jj.defclass({
        init: function (node) {
            this.storage = global[node.getAttribute(WEBSTORAGE_ATTR_STORAGE)] || global.localStorage;
            this.storageKey = node.getAttribute(WEBSTORAGE_ATTR_STORAGE_KEY) || WEBSTORAGE_DEF_STORAGE_KEY_PREFIX + node.id;
        },
        load: function (callback) {
            if (!this.data) {
                this.data = JSON.parse(this.storage.getItem(this.storageKey));
            }
            callback(this.data);
        },
        save: function (data) {
            this.data = data;
            global.localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        }
    }, modelTypes[DEF_MODEL_TYPE]);

    //-------------------------------------------------------------

    /**
     *
     * @param {Node} node a model node with/without static data
     * @return {Model}
     */
    function initModel(node) {
        var modelType = node.type.split('+')[1] || (node.src ? DEF_REMOTE_MODEL_TYPE : DEF_MODEL_TYPE),
            ModelType = modelTypes[modelType],
            model;

        if (_DEBUG) { console.log('init model: id=' + node.id + ',type=' + node.type + ',src=' + node.src); }

        if (!modelType) {
            throw new Error('bad or missing model type');
        }

        model = new ModelType(node);
        models[model.id] = model;
        return model;
    }

    /**
     * pre-init all models.
     *
     * @param {Node=} base a base node to search view nodes
     */
    function init(base) {
        if (_DEBUG) { console.log('init v module...'); }
        jj.each((base || g_doc).querySelectorAll(MODEL_SELECTOR), initModel);
    }

    /**
     *
     * @param {string} id a model identifier
     * @return {Model}
     */
    function getModel(id) {
        var model = models[id];
        if (!model) {
            model = initModel(g_doc.getElementById(id));
        }
        return model;
    }

    // auto-init
    jj.ready(init);

    //-------------------------------------------------------------
    jj.def(exports)
        .constant('models', models)
        .constant('modelTypes', modelTypes)
        .method('initModel', initModel)
        .method('init', init)
        .method('getModel', getModel)
        .end();
}));
