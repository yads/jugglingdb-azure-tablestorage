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

AzureTablestore.toDatabase = function toDatabase(props, data) {
    function processValue(prop, val) {
        if (val == undefined) {
            return null;
        }

        if (prop && (prop.type instanceof Array || prop.type.name === 'JSON')) {
            return JSON.stringify(val);
        }
        if (prop && prop.type.name === 'Date') {
            if (!val) {
                return null;
            }
            if (!val.toISOString) {
                return new Date(val);
            }
            else {
                return val.toISOString();
            }
        }
        return val;
    }

    if (!data) return;

    Object.keys(data).forEach(function(key) {
        data[key] = {'_': processValue(props[key], data[key])};
    });
    if ('id' in data && data.RowKey) {
        data.id = data.RowKey;
    }

};

AzureTablestore.fromDatabase = function fromDatabase(props, data) {
    function processValue(prop, val) {
        if (val == undefined) {
            return null;
        }

        if (prop && (prop.type instanceof Array || prop.type.name === 'JSON')) {
            return JSON.parse(val);
        }
        if (prop && prop.type.name === 'Date') {
            if (!val) {
                return null;
            }
            return new Date(val);
        }
        return val;
    }

    if (!data) return;

    Object.keys(data).forEach(function(key) {
        if ('_' in data[key]) {
            data[key] = processValue(props[key], data[key]._);
        }
    });
};

AzureTablestore.prototype.define = function define(descr) {
    if (!descr.properties.RowKey) descr.properties.RowKey = {type: String};
    if (!descr.properties.PartitionKey) descr.properties.PartitionKey = {type: String};
    var m = descr.model.modelName;
    this._models[m] = descr;
    descr.settings.table = this.nounInflector.pluralize(m);
};

AzureTablestore.prototype.ensureTableExists = function ensureTableExists(name, callback) {
    this.client.createTableIfNotExists(name,
        function tableCreated(error) {
            if(error) throw error;

            callback();
        });
};

AzureTablestore.prototype.tableName = function tableName(model) {
    return this._models[model].settings.table
};

AzureTablestore.prototype.create = function create(model, data, callback) {
    var id = data.RowKey = uuid();
    data.PartitionKey = this.partitionKey;
    AzureTablestore.toDatabase(this._models[model].properties, data);

    function entityInserted(error) {
        if(error){
            callback(error);
        }
        else {
            callback(null, id);
        }
    }

    var tableName = this.tableName(model);
    this.ensureTableExists(tableName, this.client.insertEntity.bind(this.client, tableName, data, entityInserted));
};

AzureTablestore.prototype.save = function save(model, data, callback) {
    if (!data.PartitionKey) data.PartitionKey = this.partitionKey;
    if (!data.RowKey) data.RowKey = data.id;
    AzureTablestore.toDatabase(this._models[model].properties, data);
    this.client.updateEntity(this.tableName(model), data,
        function entityUpdated(err) {
            if(err) {
                callback(err);
            }
            else {
                callback(null);
            }
        });
};

AzureTablestore.prototype.exists = function exists(model, id, callback) {
    if (id && typeof id !== 'string') {
        id = id.toString();
    }
    this.client.retrieveEntity(this.tableName(model), this.partitionKey, id, function(error, entity){
        if (error && error.code === 'ResourceNotFound') return callback(null, false);

        callback(error, entity != undefined)
    });
};

AzureTablestore.prototype.find = function find(model, id, callback) {
    var self = this;
    if (id && typeof id !== 'string') {
        id = id.toString();
    }
    this.client.retrieveEntity(this.tableName(model), this.partitionKey, id, function(error, entity){
        if (error && error.code === 'ResourceNotFound') return callback(null, null);

        if (error) return callback(error);

        AzureTablestore.fromDatabase(self._models[model].properties, entity);
        callback(null, entity)
    });
};

AzureTablestore.prototype.updateOrCreate = function updateOrCreate(model, data, callback) {
    data.RowKey = data.RowKey || uuid();
    data.PartitionKey = data.PartitionKey || self.partitionKey;
    AzureTablestore.toDatabase(self._models[model].properties, data);

    function entityInsertedOrReplaced(error, entity) {
        if(error){
            callback(error);
        }
        else {
            callback(null, entity);
        }
    }

    var tableName = this.tableName(model);
    this.ensureTableExists(tableName, this.client.insertOrReplaceEntity.bind(this.client, tableName, data, entityInsertedOrReplaced));
};

AzureTablestore.prototype.destroy = function destroy(model, id, callback) {
    var descriptor = {
        RowKey: { _: id },
        PartitionKey: { _: this.partitionKey}
    };

    this.client.deleteEntity(this.tableName(model), descriptor, function(error){
        callback(error);
    });
};

AzureTablestore.prototype.all = function all(model, filter, callback) {
    var self = this;
    var tableQuery = new TableQuery();
    if (filter) {
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
    }
    this.client.queryEntities(this.tableName(model), tableQuery, null, function(error, result){
        if (error) return callback(error);

        var entities = result.entries;

        entities.forEach(function(entity) {
            AzureTablestore.fromDatabase(self._models[model].properties, entity);
        });
        //check for eager loading relationships
        if (filter && filter.include) {
            self._models[model].model.include(entities, filter.include, callback);
        } else {
            callback(null, entities);
        }
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
    var self = this;
    var tableName = this.tableName(model);
    this.client.deleteTable(tableName, function(error) {
        if (error) return callback(error);

        self.client.createTable(tableName, function(error) {
            callback(error);
        });
    });
};

AzureTablestore.prototype.count = function count(model, callback, where) {
    var tableQuery = new TableQuery().select(['RowKey']);
    if (where) {
        attachWhereClause(tableQuery, where);
    }

    this.client.queryEntities(this.tableName(model), tableQuery, null, function(error, entities){
        callback(error, entities && entities.entries && entities.entries.length);
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
};

AzureTablestore.prototype.automigrate = function(callback) {
    var self = this;
    var wait = 0;
    Object.keys(this._models).forEach(function (model) {
        wait += 1;
        self.client.createTableIfNotExists(self.tableName(model), function (err) {
            // console.log('drop', model);
            if (err) throw err;
            done();
        });
    });
    if (wait === 0) callback();

    function done() {
        if (--wait === 0 && callback) {
            callback();
        }
    }
};