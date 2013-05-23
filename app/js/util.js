(jj.define('jj.util', [ ], function (require, exports, module, global) {
    "use strict";
    //-------------------------------------------------------------

    function decodeQueryString(query) {
        var params = {};
        if (query) {
            query.split('&').forEach(function (term) {
                var keyValue = term.split('=');
                if (keyValue.length === 2) {
                    params[decodeURIComponent(keyValue[0])] = decodeURIComponent(keyValue[1]);
                }
            });
        }
        return params;
    }

    //-------------------------------------------------------------
    jj.def(exports)
        .method('decodeQueryString', decodeQueryString)
        .end()
}));
