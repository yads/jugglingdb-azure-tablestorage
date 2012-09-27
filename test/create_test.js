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
    whenCreatingModel: {
        setUp: function(callback) {
            adapter.define({model: {modelName: 'Person'}, settings: {}});
            person = {'firstName': 'John', 'lastName': 'Doe'};
            adapter.create('Person', person, callback);
        },
        tableShouldExist: function(test) {
            test.expect(1);
            adapter.client.getTable(adapter.tableName('Person'), function(error){
                test.ifError(error);
                test.done();
            })
        },
        entityShouldExist: function(test) {
            test.expect(4);
            adapter.client.queryEntity(adapter.tableName('Person'), person.PartitionKey, person.RowKey, function(error, entity){
                test.ifError(error);
                test.ok(entity);
                test.equal(entity.firstName, person.firstName);
                test.equal(entity.lastName, person.lastName);
                test.done();
            })
        }
    }
};
