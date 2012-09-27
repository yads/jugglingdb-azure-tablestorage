var azure = require('azure'),
    uuid = require('node-uuid'),
    natural = require('natural');

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

AzureTablestore.prototype.define = function define(descr) {
    var m = descr.model.modelName;
    this._models[m] = descr;
    descr.settings.table = this.nounInflector.pluralize(m);
};

AzureTablestore.prototype.ensureTableExists = function ensureTableExists(name, callback) {
    this.client.createTableIfNotExists(name,
        function tableCreated(error) {
            if(error) {
                throw error;
            }
            callback();
        });
};

AzureTablestore.prototype.tableName = function tableName(model) {
    return this._models[model].settings.table
};

AzureTablestore.prototype.create = function create(model, data, callback) {
    var table = this.tableName(model);
    var self = this;
    this.ensureTableExists(table, function() {
        var id = data.RowKey = uuid();
        data.PartitionKey = self.partitionKey;
        self.client.insertEntity(table, data,
            function entityInserted(error) {
                if(error){
                    callback(error);
                }
                else {
                    callback(null, id);
                }
            });
    });
};

AzureTablestore.prototype.save = function save(model, data, callback) {
    var table = this.tableName(model);
    var self = this;
    this.ensureTableExists(table, function(){
        self.client.updateEntity(table, data,
            function entityUpdated(err) {
                if(err) {
                    callback(err);
                }
                else {
                    callback(null);
                }
            });
    });
};

AzureTablestore.prototype.exists = function exists(model, id, callback) {
    this.client.queryEntity(this.tableName(model), this.partitionKey, id, function(error, entity){
        callback(error, entity !== null && entity !== undefined)
    });
};

AzureTablestore.prototype.find = function find(model, id, callback) {
    this.client.queryEntity(this.tableName(model), this.partitionKey, id, function(error, entity){
        callback(error, entity)
    });
};

AzureTablestore.prototype.updateOrCreate = function updateOrCreate(model, data, callback) {
    var table = this.tableName(model);
    var self = this;
    this.ensureTableExists(table, function() {
        data.RowKey = data.RowKey || uuid();
        data.PartitionKey = data.PartitionKey || self.partitionKey;
         self.client.insertOrReplaceEntity(table, data,
            function entityInsertedOrReplaced(error, entity) {
                if(error){
                    callback(error);
                }
                else {
                    callback(null, entity);
                }
            });
    });
};