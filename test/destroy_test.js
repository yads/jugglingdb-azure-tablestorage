var helper = require('./test_helper');

var person,
    error;

module.exports = {
    setUp: helper.globalSetUp,
    whenDestroying: {
        setUp: function(callback) {
            helper.getAdapter().define({model: {modelName: 'Person'}, settings: {}});
            person = {'firstName': 'John', 'lastName': 'Doe'};
            helper.getAdapter().create('Person', person, function() {
                helper.getAdapter().destroy('Person', person.RowKey, function(err) {
                    error = err;
                    callback();
                })
            });
        },
        errorShouldBeNull: function(test) {
            test.expect(1);
            test.ifError(error);
            test.done();
        },
        shouldHaveDeleted: function(test) {
            test.expect(2);
            helper.getAdapter().client.queryEntity(helper.getAdapter().tableName('Person'), person.PartitionKey, person.RowKey, function(error, entity){
                test.ok(error);
                test.equal(entity, null);
                test.done();
            });
        }
    }
}
