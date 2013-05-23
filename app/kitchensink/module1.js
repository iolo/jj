console.log('module.id:' + module.id);
console.log('module.uri:' + module.uri);
console.log('require.main:' + require.main);
console.log('require.paths:' + require.paths);
exports.hello = require('module2').hello;
