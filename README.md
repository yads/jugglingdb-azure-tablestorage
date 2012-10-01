## About

This is a Windows Azure Table Storage adapter for the juggling db ORM http://github.com/1602/jugglingdb

## Usage

To use this custom adapter, use the adapter name in the `Schema` constructor call

    mySchema = new Schema('azure-table', {accountName:.., accountKey:...});

The adapter will automatically set the Azure host to be <accountName>.table.core.windows.net
To specify your own host, pass in the `host` parameter in the settings

    mySchema = new Schema('azure-table', {accountName:.., accountKey:..., host:...});

## License

MIT