var azureTablestore = require('../index'),
    schemaSettings = {
        accountName: 'devstoreaccount1',
        accountKey: 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
        host: '127.0.0.1:10002'
    },
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
