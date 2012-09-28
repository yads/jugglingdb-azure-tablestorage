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
        var keys = Object.keys(adapter._models);
        for (var i = 0; i < keys.length; i++) {
            adapter.client.deleteTable(adapter._models[keys[i]].settings.table, function (error){
                if (error) throw error;
                if (i == keys.length) {
                    adapter = null;
                    callback();
                }
            });
        }
    },
    getAdapter: function(){
        return adapter;
    }
};