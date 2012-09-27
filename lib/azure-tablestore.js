var azure = require('azure')
    , uuid = require('node-uuid')
    , natural = require('natural');

exports.initialize = function(schema, callback) {
    var s = schema.settings;
    schema.client = azure.createTableService(s.accountName, s.accountKey, s.host);
    schema.adapter = new AzureTablestore(schema.client, s.partitionKey || 'default');
    schema.adapter.schema = schema;
    callback();
};

function AzureTablestore(client, partitionKey) {
    this._models = {};
    this.client = client;
    this.partitionKey = partitionKey;
    this.nounInflector = new natural.NounInflector();
}

AzureTablestore.prototype.define = function(descr) {
    var m = descr.model.modelName;
    this._models[m] = descr;
    descr.settings.table = this.nounInflector.pluralize(m);
};

AzureTablestore.prototype.ensureTableExists = function(name, callback) {
    this.client.createTableIfNotExists(name,
        function tableCreated(error) {
            if(error) {
                throw error;
            }
            callback();
        });
};

AzureTablestore.prototype.tableName = function(model) {
    return this._models[model].settings.table
}

AzureTablestore.prototype.create = function(model, data, callback) {
    var table = this.tableName(model);
    var self = this;
    this.ensureTableExists(table, function() {
        data.RowKey = uuid();
        data.PartitionKey = self.partitionKey;
        self.client.insertEntity(table, data,
            function entityInserted(error) {
                if(error){
                    callback(error, data);
                }
                callback(null, data);
            });
    });
};

AzureTablestore.prototype.save = function(model, data, callback) {
    var table = this.tableName(model);
    this.ensureTableExists(table, function(){
        this.client.updateEntity(self._models[model].settings.table, model,
            function entityUpdated(err) {
                if(err) {
                    callback(err);
                }
                callback(null);
            });
    });
};