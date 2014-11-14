require('./init.js');

describe('azure-tablestorage imported features', function() {
    this.timeout(5000);

    require('jugglingdb/test/common.batch.js');
    require('jugglingdb/test/include.test.js');

});