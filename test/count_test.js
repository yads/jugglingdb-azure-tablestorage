var helper = require('./test_helper');

var person1,
    person2,
    error,
    count;

module.exports = {
    setUp: function(callback) {
        helper.globalSetUp(function () {
            var adapter = helper.getAdapter();
            adapter.define({model: {modelName: 'Person'}, settings: {}});
            person1 = {'firstName': 'John', 'lastName': 'Doe', numAccounts: 5, dateCreated: new Date(2012, 1, 1)};
            person2 = {'firstName': 'James', 'lastName': 'Doe', numAccounts: 9, dateCreated: new Date(2010, 1, 1)};
            adapter.create('Person', person1, function() {});
            adapter.create('Person', person2, callback)
        });
    },
    tearDown: helper.globalTearDown,
    whenSpecifyingKeyLookup: {
        setUp: function(callback) {
            helper.getAdapter().count('Person', {firstName: 'John'}, function(err, data) {
                error = err;
                count = data;
                callback();
            });
        },
        shouldNotHaveError: function(test) {
            test.expect(1);
            test.ifError(error);
            test.done();
        },
        shouldSendCountToCallback: function(test) {
            test.expect(1);
            test.equal(count, 1);
            test.done();
        }
    },
    whenSpecifyingNullValueInFilter: {
        shouldThrowException: function(test) {
            test.expect(1);
            test.throws(function(){
                helper.getAdapter().count('Person', {firstName: null}, function() {});
            });
            test.done();
        }
    },
    whenSpecifyingDate: {
        setUp: function(callback) {
            helper.getAdapter().count('Person', {dateCreated: new Date(2010, 1, 1)}, function(err, data) {
                error = err;
                count = data;
                callback();
            });
        },
        shouldNotHaveError: function(test) {
            test.expect(1);
            test.ifError(error);
            test.done();
        },
        shouldSendCountToCallback: function(test) {
            test.expect(1);
            test.equal(count, 1);
            test.done();
        }
    }
}