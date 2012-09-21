var azure = require('azure')
    , uuid = require('node-uuid')
    , natural = require('natural');

module.initialize = function(schema, callback) {
    var s = schema.settings;
    schema.client = azure.createTableService(s.accountName, s.accountKey);
    schema.adapter = new AzureTablestore(schema.client, s.partitionKey || 'default');
    schema.adapter.schema = schema;
    process.nextTick(callback);
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
    this.client.createTableIfNotExists(descr.settings.table,
        function tableCreated(error) {
            if(error) {
                throw error;
            }
        });
};

AzureTablestore.prototype.create = function(model, data, callback) {
    self = this;
    model.RowKey = uuid();
    model.PartitionKey = self.partitionKey;
    model.completed = false;
    self.client.insertEntity(this._models[model].settings.table, data,
        function entityInserted(error) {
            if(error){
                callback(error, data);
            }
            callback(null, data);
        });
};