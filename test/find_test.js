var helper = require('./test_helper');

var person;

module.exports = {
    setUp: helper.globalSetUp,
    /*tearDown: helper.gloablTearDown
     },*/
    whenExistsInDatabase: {
        setUp: function(callback) {
            helper.getAdapter().define({model: {modelName: 'Person'}, settings: {}});
            person = {'firstName': 'John', 'lastName': 'Doe'};
            helper.getAdapter().create('Person', person, callback);
        },
        shouldSendEntityToCallback: function(test) {
            test.expect(2);
            helper.getAdapter().find('Person', person.RowKey, function(err, entity) {
                test.ifError(err);
                test.ok(entity);
                test.done();
            });
        }
    },
    whenDoesNotExistInDatabase: {
        setUp: function(callback) {
            helper.getAdapter().define({model: {modelName: 'Person'}, settings: {}});
            callback();
        },
        shouldSendNullAsEntityToCallback: function(test) {
            test.expect(2);
            helper.getAdapter().find('Person', 'doesnotexist', function(err, entity) {
                test.ok(err);
                test.equal(entity, null);
                test.done();
            });
        }
    }
}