/* global jj */
(jj.define('jj.nls', [ ], function (require, exports, module, global) {
    "use strict";
    //-------------------------------------------------------------

    var _DEBUG = !!global._DEBUG,
        g_doc = global.document,
        g_html = g_doc.documentElement,
        URI_MESSAGES_PREFIX = 'locales/',
        URI_MESSAGES_SUFFIX = '/messages.json',
        EVENT_NLS_CHANGE = 'jj_nls_change',
        ATTR_NLS = 'data-nls',
        SELECTOR_NLS = '[data-nls]',
        DEF_LANG = 'en',
        activeLang = null,
        messages = {};

    /**
     *
     * @param {string} key
     * @return {string} localized message
     */
    function get(key) {
        return messages[key];
    }

    /**
     *
     * @param {string} key
     * @param {*=} var_args
     * @return {string} formatted localized message
     */
    function format(key, var_args) {
        var args = Array.prototype.slice.call(arguments);
        args[0] = messages[key];
        return jj.format.apply(null, args);
    }

    /**
     *
     * @param {Node=} node
     */
    function update(node) {
        var key = node.getAttribute(ATTR_NLS);
        if(key) {
            var msg = messages[key];
            if(msg) {
                node.innerHTML = msg;
                return;
            }
        }
        if (_DEBUG) { console.error('bad or missing data-nls: ' + key); }
    }

    /**
     *
     * @param {Node=} base
     */
    function updateAll(base) {
        jj.each((base || g_doc).querySelectorAll(SELECTOR_NLS), update);
    }

    /**
     *
     * @param {string=} lang
     * @param {function=} callback
     * @param {function=} errback
     */
    function loadMessages(lang, callback, errback) {
        if (_DEBUG) { console.log('nls loading... lang=' + lang); }
        jj.ajax({
            method: 'GET',
            uri: URI_MESSAGES_PREFIX + lang + URI_MESSAGES_SUFFIX,
            async: !!callback,
            success: function(xhr) {
                jj.def(messages).mixin(JSON.parse(xhr.responseText));

                if (_DEBUG) { console.log('nls load ok: lang=' + lang); }

                // set active language
                activeLang = lang;
                jj.fireEvent(global, EVENT_NLS_CHANGE);

                // remove all existing jj-nls- class
                // and add newly applied jj-nls- class
                g_html.className = g_html.className.replace(/jj-nls-[^\s]+/g, '').trim() + (' jj-nls-' + lang);

                if (typeof callback === 'function') { callback(lang); }
            },
            error: function(xhr) {
                if (_DEBUG) { console.error('nls load error: lang=' + lang); }

                // try again with locale variant(ko-kr -> ko)
                if (lang.length > 2) {
                    return loadMessages(lang.substring(0, 2), callback, errback);
                }

                // try agagin with default
                if (lang !== DEF_LANG) {
                    return loadMessages(DEF_LANG, callback, errback);
                }

                if (typeof errback === 'function') { errback(xhr); }
            }
        });
    }

    /**
     * @return {string} active language
     */
    function getActiveLang() {
        return activeLang;
    }

    /**
     *
     * @param {string} lang
     */
    function setActiveLang(lang) {
        loadMessages(lang, function () {
            updateAll();
        });
    }

    /**
     *
     * @param {string} lang
     */
    function init(lang) {
        // use browser language, by default
        lang = (lang || navigator.language || navigator.userLanguage).toLowerCase();
        if (_DEBUG) { console.log('init nls module...: lang=' + lang); }
        loadMessages(lang);
    }

    // auto init
    jj.ready(init);

    //-------------------------------------------------------------
    jj.def(exports)
        .property('activeLang', getActiveLang, setActiveLang)
        .constant('messages', messages)
        .method('get', get)
        .method('format', format)
        .method('update', update)
        .method('updateAll', updateAll)
        .method('init', init)
        .end();
}));
