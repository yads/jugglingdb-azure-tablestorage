var azure = require('azure-storage'),
    uuid = require('node-uuid'),
    natural = require('natural'),
    TableQuery = azure.TableQuery;

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
                return callback(error);
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

AzureTablestore.prototype.destroy = function destroy(model, id, callback) {
    this.client.deleteEntity(this.tableName(model), {RowKey: id, PartitionKey: this.partitionKey}, function(error){
        callback(error);
    });
};

AzureTablestore.prototype.all = function all(model, filter, callback) {
    var tableQuery = TableQuery.select()
        .from(this.tableName(model));
    if (filter.where) {
        attachWhereClause(tableQuery, filter.where);
    }
    if (filter.order) {
        throw "Order clause not supported by Azure Table Storage";
    }
    if (filter.skip) {
        throw "Skip not supported by Azure Table Storage";
    }
    if (filter.limit) {
        tableQuery.top(filter.limit);
    }
    this.client.queryEntities(tableQuery, function(error, entities){
        callback(error, entities);
    });

    function attachWhereClause(tableQuery, where) {
        Object.keys(where).forEach(function(key) {
            tableQuery.where(condition(key, where[key]));
        });
    }

    function condition(key, value) {
        if (value.constructor.name === 'Object') {
            var operator = Object.keys(value)[0];
            if (operator === 'inq' || operator === 'nin') {
                var fullCondition = "";
                for (var i = 0; i < value[operator].length; i++) {
                    if (i > 0) {
                        fullCondition += " or";
                    }
                    fullCondition += " ";
                    fullCondition += condition(key, value[operator][i]);
                }
                if (operator === 'nin') {
                    fullCondition = "!(" + fullCondition + ")";
                }
                return fullCondition;
            }
            return key + mapOperator(operator) + prepValue(value[operator]);
        }
        else {
            return key + " == " + prepValue(value);
        }
    }

    function mapOperator(operator) {
        switch (operator) {
            case 'gt':
                return " > ";
            case 'gte':
                return " >= ";
            case 'lt':
                return " < ";
            case 'lte':
                return " <= ";
            case 'neq':
                return " != ";
            case 'between':
            case 'inq':
            case 'nin':
                throw "Unsupported operator " + operator;
        }
    }

    function prepValue(value) {
        if (value === null) {
            throw "null values not supported in Azure Table Storage queries";
        }
        else {
            return "'" + value + "'";
        }
    }
};

AzureTablestore.prototype.destroyAll = function destroyAll(model, callback) {
    this.client.deleteTable(this.tableName(model), function(error) {
        callback(error);
    })
}

AzureTablestore.prototype.count = function count(model, where, callback) {
    var tableQuery = TableQuery.select(['RowKey'])
        .from(this.tableName(model));
    if (where) {
        attachWhereClause(tableQuery, where);
    }

    this.client.queryEntities(tableQuery, function(error, entities){
        callback(error, entities && entities.length);
    });

    function attachWhereClause(tableQuery, where) {
        Object.keys(where).forEach(function(key) {
            tableQuery.where(key + " == " + prepValue(where[key]));
        });
    }

    function prepValue(value) {
        if (value === null) {
            throw "null values not supported in Azure Table Storage queries";
        }
        else {
            return "'" + value + "'";
        }
    }
};

AzureTablestore.prototype.updateAttributes = function(model, id, data, callback) {
    data.RowKey = id;
    data.PartitionKey = this.partitionKey;
    this.save(model, data, callback);
}