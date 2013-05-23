(jj.define('jj.dom', [ ], function (require, exports, module, global) {
    "use strict";
    //-------------------------------------------------------------

    var _DEBUG = !!global._DEBUG,
        g_doc = global.document,
        g_html = g_doc.documentElement,
        g_body = g_doc.body,
        listenerId = 0,
        listeners = {};

    /**
     *
     * @param {string} id
     * @return {Object.<Node>}
     */
    function byId(id) {
        return g_doc.getElementById(id);
    }

    /**
     *
     * @param {string} tagName
     * @return {Object.<NodeList>}
     */
    function byTag(tagName) {
        return g_doc.getElementsByTagName(tagName);
    }

    /**
     *
     * @param {string} tagName
     * @return {Object.<NodeList>}
     */
    function byClass(className) {
        return g_doc.getElementsByClassName(className);
    }

    /**
     *
     * @methodOf jj
     * @param {string} selector
     * @param {Object.<Node>=} base
     * @return {Object.<Node>}
     */
    function query(selector, base) {
        return (base || g_doc).querySelector(selector)
    }

    /**
     *
     * @methodOf jj
     * @param {string} selector
     * @param {Object.<Node>=} base
     * @return {Object.<NodeList>}
     */
    function queryAll(selector, base) {
        return (base || g_doc).querySelectorAll(selector);
    }

    /**
     *
     * @param {Node} node
     * @param {Event} event
     * @param {function} func
     * @param {boolean=} capture
     * @return {*} listener identifier
     */
    function connect(node, event, func, capture) {
        node.addEventListener(event, func, !!capture);
        listeners[++listenerId] = [ node, event, func ];
        return listenerId;
    }

    /**
     *
     * @param {*} id
     */
    function disconnect(id) {
        var listener = listeners[id];
        listener.node.removeEventListener(listener.event, listener.func);
        delete listeners[id];
    }


    //-------------------------------------------------------------
    jj.def(exports)
        .method('byId', byId)
        .method('byTag', byTag)
        .method('byClass', byClass)
        .method('query', query)
        .method('queryAll', queryAll)
        .method('connect', connect)
        .method('disconnect', disconnect)
        .end();
}));
