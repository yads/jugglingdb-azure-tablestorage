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
    if ('id' in data) {
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
        AzureTablestore.toDatabase(self._models[model].properties, data);
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
        AzureTablestore.toDatabase(self._models[model].properties, data);
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
    this.client.retrieveEntity(this.tableName(model), this.partitionKey, id, function(error, entity){
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
    var table = this.tableName(model);
    var self = this;
    this.ensureTableExists(table, function() {
        data.RowKey = data.RowKey || uuid();
        data.PartitionKey = data.PartitionKey || self.partitionKey;
        AzureTablestore.toDatabase(self._models[model].properties, data);
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
    var self = this;
    var tableQuery = new TableQuery();
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
    this.client.queryEntities(this.tableName(model), tableQuery, null, function(error, entities){
        if (error) return callback(error);

        entities.entries.forEach(function(entity) {
            AzureTablestore.fromDatabase(self._models[model].properties, entity);
        });
        callback(null, entities.entries);
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

        self.client.createTableIfNotExists(tableName, function(error) {
            callback(error);
        })
    })
};

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