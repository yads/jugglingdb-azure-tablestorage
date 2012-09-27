var azureTablestore = require('../index'),
    azure = require('azure'),
    ServiceClient = azure.ServiceClient,
    config = {
        accountName: ServiceClient.DEVSTORE_STORAGE_ACCOUNT,
        accountKey: ServiceClient.DEVSTORE_STORAGE_ACCESS_KEY,
        host: ServiceClient.DEVSTORE_TABLE_HOST
    },
    adapter;

module.exports = {
    globalSetUp: function(callback) {
        var schema = {settings: config};
        azureTablestore.initialize(schema, function() {});
        adapter = schema.adapter;
        callback();
    },
    globalTearDown: function(callback) {
        if (!adapter) callback();
        for (var model in adapter._models) {
            adapter.client.deleteTable(adapter._models[model].settings.table, function (error){
            });
        }
        adapter = null;
        callback();
    },
    getAdapter: function(){
        return adapter;
    }
};