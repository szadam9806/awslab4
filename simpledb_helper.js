var AWS = require("aws-sdk");
var helpers = require("./helpers");

var AWS_CONFIG_FILE = "config.json";
var LOGS_DOMAIN = "szadam9806_logs";
var DIGESTS_DOMAIN = "szadam9806_digests";

function getSimpleDB() {
    var awsConfig = helpers.readJSONFile(AWS_CONFIG_FILE);
    AWS.config.update({
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
        region: awsConfig.region || "us-west-2"
    });
    return new AWS.SimpleDB();
}

function createDomainIfNeeded(domainName, callback) {
    var sdb = getSimpleDB();
    sdb.createDomain({ DomainName: domainName }, function(err, data) {
        callback(err, data);
    });
}

function putAttributes(domainName, itemName, attributes, callback) {
    var sdb = getSimpleDB();
    sdb.putAttributes({
        DomainName: domainName,
        ItemName: itemName,
        Attributes: attributes
    }, function(err, data) {
        callback(err, data);
    });
}

exports.LOGS_DOMAIN = LOGS_DOMAIN;
exports.DIGESTS_DOMAIN = DIGESTS_DOMAIN;
exports.createDomainIfNeeded = createDomainIfNeeded;
exports.putAttributes = putAttributes;
