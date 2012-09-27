var helper = require('./test_helper');

var person;

module.exports = {
    setUp: helper.globalSetUp,
    whenSaving: {
        setUp: function(callback) {
            helper.getAdapter().define({model: {modelName: 'Person'}, settings: {}});
            person = {'firstName': 'John', 'lastName': 'Doe'};
            helper.getAdapter().create('Person', person, function() {
                person.firstName = 'James';
                helper.getAdapter().save('Person', person, function() {
                    callback();
                })
            });
        },
        shouldHaveChangedValue: function(test) {
            test.expect(1);
            helper.getAdapter().client.queryEntity(helper.getAdapter().tableName('Person'), person.PartitionKey, person.RowKey, function(error, entity){
                test.equal(entity.firstName, person.firstName)
                test.done();
            });
        }
    }
}
