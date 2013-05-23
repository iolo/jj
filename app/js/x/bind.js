(function () {
    "use strict";

    if (typeof Function.prototype.bind !== 'function') {
        console.log('mimic Function.prototype.bind...');

        /**
         * https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind
         *
         * @param {object|null} ctx
         * @param {*...} var_args
         * @return {function}
         */
        Function.prototype.bind = function (ctx) {
            var self = this, slice = Array.prototype.slice, args = slice.call(arguments, 1);
            return function () {
                return self.apply(ctx, args.concat(slice.call(arguments)));
            }
        }

    }
}());