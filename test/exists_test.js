var helper = require('./test_helper');

var person;

module.exports = {
    setUp: helper.globalSetUp,
    tearDown: helper.globalTearDown,
    whenExistsInDatabase: {
        setUp: function(callback) {
            helper.getAdapter().define({model: {modelName: 'Person'}, settings: {}});
            person = {'firstName': 'John', 'lastName': 'Doe'};
            helper.getAdapter().create('Person', person, callback);
        },
        shouldSendTrueToCallback: function(test) {
            test.expect(2);
            helper.getAdapter().exists('Person', person.RowKey, function(err, exists) {
                test.ifError(err);
                test.ok(exists);
                test.done();
            });
        }
    },
    whenDoesNotExistInDatabase: {
        setUp: function(callback) {
            helper.getAdapter().define({model: {modelName: 'Person'}, settings: {}});
            callback();
        },
        shouldSendFalseToCallback: function(test) {
            test.expect(2);
            helper.getAdapter().exists('Person', 'doesnotexist', function(err, exists) {
                test.ok(err);
                test.equal(exists, false);
                test.done();
            });
        }
    }
}