var helper = require('./test_helper');

var person;

module.exports = {
    setUp: helper.globalSetUp,
    /*tearDown: helper.gloablTearDown
    },*/
    whenCreatingModel: {
        setUp: function(callback) {
            helper.getAdapter().define({model: {modelName: 'Person'}, settings: {}});
            person = {'firstName': 'John', 'lastName': 'Doe'};
            helper.getAdapter().create('Person', person, callback);
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
    }
};
