var helper = require('./test_helper');

var person1,
    person2,
    error,
    entities;

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
            helper.getAdapter().all('Person', {where: {firstName: 'John'}}, function(err, data) {
                error = err;
                entities = data;
                callback();
            });
        },
        shouldNotHaveError: function(test) {
            test.expect(1);
            test.ifError(error);
            test.done();
        },
        shouldSendEntitiesToCallback: function(test) {
            test.expect(3);
            test.ok(entities);
            test.equal(entities.length, 1);
            test.equal(entities[0].firstName, 'John');
            test.done();
        }
    },
    whenSpecifyingNullValueInFilter: {
        shouldThrowException: function(test) {
            test.expect(1);
            test.throws(function(){
                helper.getAdapter().all('Person', {where: {firstName: null}}, function() {});
            });
            test.done();
        }
    },
    whenSpecifyingInOperator: {
        shouldThrowException: function(test) {
            test.expect(1);
            test.throws(function(){
                helper.getAdapter().all('Person', {where: {firstName: {inq: ['John']}}}, function() {});
            });
            test.done();
        }
    },
    whenSpecifyingNotInOperator: {
        shouldThrowException: function(test) {
            test.expect(1);
            test.throws(function(){
                helper.getAdapter().all('Person', {where: {firstName: {nin: ['John']}}}, function() {});
            });
            test.done();
        }
    },
    whenSpecifyingOperatorLookup: {
        setUp: function(callback) {
            helper.getAdapter().all('Person', {where: {numAccounts: {gt: 5}}}, function(err, data) {
                error = err;
                entities = data;
                callback();
            });
        },
        shouldNotHaveError: function(test) {
            test.expect(1);
            test.ifError(error);
            test.done();
        },
        shouldSendEntitiesToCallback: function(test) {
            test.expect(3);
            test.ok(entities);
            test.equal(entities.length, 1);
            test.equal(entities[0].firstName, 'James');
            test.done();
        }
    },
    whenSpecifyingDate: {
        setUp: function(callback) {
            helper.getAdapter().all('Person', {where: {dateCreated: {gt: new Date(2011, 1, 1)}}}, function(err, data) {
                error = err;
                entities = data;
                callback();
            });
        },
        shouldNotHaveError: function(test) {
            test.expect(1);
            test.ifError(error);
            test.done();
        },
        shouldSendEntitiesToCallback: function(test) {
            test.expect(3);
            test.ok(entities);
            test.equal(entities.length, 1);
            test.equal(entities[0].firstName, 'John');
            test.done();
        }
    }
}