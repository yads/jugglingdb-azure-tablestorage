var azureTablestore = require('../index'),
    assert = require('assert'),
    azure = require('azure')
ServiceClient = azure.ServiceClient;

var adapter,
    person,
    config = {
        accountName: ServiceClient.DEVSTORE_STORAGE_ACCOUNT,
        accountKey: ServiceClient.DEVSTORE_STORAGE_ACCESS_KEY,
        host: ServiceClient.DEVSTORE_TABLE_HOST
    };

module.exports = {
    setUp: function(callback) {
        var schema = {settings: config};
        azureTablestore.initialize(schema, function() {});
        adapter = schema.adapter;
        callback();
    },
    /*tearDown: function(callback) {
     if (!adapter) callback();
     for (var model in adapter._models) {
     adapter.client.deleteTable(adapter._models[model].settings.table, function (error){
     });
     }
     adapter = null;
     callback();
     },*/
    whenDefiningModel: {
        setUp: function(callback) {
            adapter.define({model: {modelName: 'Person'}, settings: {}});
            callback();
        },
        shouldHaveInModelList: function(test) {
            test.expect(2);
            test.ok(adapter._models['Person']);
            test.equal(adapter._models['Person'].settings.table, 'People');
            test.done();
        }
    }
}