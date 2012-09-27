var helper = require('./test_helper');

var person;

module.exports = {
    setUp: helper.globalSetUp,
    /*tearDown: helper.gloablTearDown
     },*/
    whenDefiningModel: {
        setUp: function(callback) {
            helper.getAdapter().define({model: {modelName: 'Person'}, settings: {}});
            callback();
        },
        shouldHaveInModelList: function(test) {
            test.expect(2);
            test.ok(helper.getAdapter()._models['Person']);
            test.equal(helper.getAdapter()._models['Person'].settings.table, 'People');
            test.done();
        }
    }
}