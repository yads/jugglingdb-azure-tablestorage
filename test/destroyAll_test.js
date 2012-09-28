var helper = require('./test_helper');
var azure = require('azure');

var person,
    error;

module.exports = {
    setUp: helper.globalSetUp,
    tearDown: helper.globalTearDown,
    whenDestroying: {
        setUp: function(callback) {
            helper.getAdapter().define({model: {modelName: 'Person'}, settings: {}});
            person = {'firstName': 'John', 'lastName': 'Doe'};
            helper.getAdapter().create('Person', person, function() {
                helper.getAdapter().destroyAll('Person', function(err) {
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
            helper.getAdapter().client.queryEntities(azure.TableQuery.select().from(helper.getAdapter().tableName('Person')), function(error, entity){
                test.ok(error);
                test.equal(entity, null);
                test.done();
            });
        }
    }
}
