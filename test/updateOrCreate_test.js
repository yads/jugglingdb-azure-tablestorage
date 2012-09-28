/*****************************************
 * This operation is currently not supported by emulated storage.
 * http://msdn.microsoft.com/en-us/library/windowsazure/hh452242.aspx
 */
var helper = require('./test_helper');

var person,
    error,
    data;

module.exports = {
    setUp: helper.globalSetUp,
    tearDown: helper.globalTearDown,
    whenModelDoesNotExist: {
        setUp: function(callback) {
            helper.getAdapter().define({model: {modelName: 'Person'}, settings: {}});
            person = {'firstName': 'John', 'lastName': 'Doe'};
            helper.getAdapter().updateOrCreate('Person', person, function(err, entity) {
                error = err;
                data = entity;
                callback();
            });
        },
        errorShouldBeNull: function(test) {
            test.expect(1);
            test.ifError(error);
            test.done();
        },
        dataShouldBeEntity: function(test) {
            test.expect(2);
            test.ok(data);
            test.equal(data.RowKey, person.RowKey);
            test.done();
        },
        tableShouldExist: function(test) {
            test.expect(1);
            helper.getAdapter().client.getTable(helper.getAdapter().tableName('Person'), function(error){
                test.ifError(error);
                test.done();
            });
        },
        entityShouldExist: function(test) {
            test.expect(4);
            helper.getAdapter().client.queryEntity(helper.getAdapter().tableName('Person'), person.PartitionKey, person.RowKey, function(error, entity){
                test.ifError(error);
                test.ok(entity);
                test.equal(entity.firstName, person.firstName);
                test.equal(entity.lastName, person.lastName);
                test.done();
            });
        }
    },
    whenModelDoesExist: {
        setUp: function(callback) {
            helper.getAdapter().define({model: {modelName: 'Person'}, settings: {}});
            person = {'firstName': 'John', 'lastName': 'Doe'};
            helper.getAdapter().create('Person', person, function() {
                person.firstName = 'James';
                helper.getAdapter().updateOrCreate('Person', person, function(err, entity) {
                    error = err;
                    data = entity;
                    callback();
                });
            });
        },
        errorShouldBeNull: function(test) {
            test.expect(1);
            test.ifError(error);
            test.done();
        },
        dataShouldBeEntity: function(test) {
            test.expect(2);
            test.ok(data);
            test.equal(data.RowKey, person.RowKey);
            test.done();
        },
        shouldHaveChangedValue: function(test) {
            test.expect(1);
            helper.getAdapter().client.queryEntity(helper.getAdapter().tableName('Person'), person.PartitionKey, person.RowKey, function(error, entity){
                test.equal(entity.firstName, person.firstName)
                test.done();
            });
        }
    }
};
