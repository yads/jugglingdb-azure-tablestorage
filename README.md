## About

This is a Windows Azure Table Storage adapter for the [juggling db](http://github.com/1602/jugglingdb) v0.3.x ORM

## Installation

    npm install jugglingdb-azure-tablestorage

## Usage

To use this custom adapter, use the adapter name in the `Schema` constructor call

    mySchema = new Schema('azure-tablestorage', {accountName:.., accountKey:...});

The adapter will automatically set the Azure host to be *accountName*.table.core.windows.net
To specify your own host, pass in the `host` parameter in the settings

    mySchema = new Schema('azure-tablestorage', {accountName:.., accountKey:..., host:...});

## Limitations
* Azure Table Storage only supports String id properties
* Some querying features are not supported, notably skip and order by

## License

MIT
