var azureTablestore = require('../index'),
    schemaSettings = {},
    adapter;

var Schema = require('jugglingdb').Schema;

if (!('getSchema' in global)) {

    global.getSchema = function () {
        var schema = new Schema(require('../'), schemaSettings);
        schema.log = function (a) {
            console.log(a);
        };
        return schema;
    }

}
