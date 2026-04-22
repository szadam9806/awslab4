var util = require("util");
var os = require("os");
var helpers = require("../helpers");
var Policy = require("../s3post").Policy;
var S3Form = require("../s3post").S3Form;
var sdb = require("../simpledb_helper");

var AWS_CONFIG_FILE = "config.json";
var POLICY_FILE = "policy.json";
var INDEX_TEMPLATE = "index.ejs";

var task = function(request, callback){
        var itemName = "log_" + Date.now();
        var clientIp =
                request.headers["x-forwarded-for"] ||
                (request.connection && request.connection.remoteAddress) ||
                "unknown";

        var logAttributes = [
                { Name: "path", Value: request.url || "/", Replace: true },
                { Name: "host", Value: os.hostname(), Replace: true },
                { Name: "clientIp", Value: String(clientIp), Replace: true },
                { Name: "date", Value: new Date().toISOString(), Replace: true }
        ];

        sdb.putAttributes(sdb.LOGS_DOMAIN, itemName, logAttributes, function(err) {
                if (err) {
                        console.log("Blad zapisu logu do SimpleDB:", err);
                } else {
                        console.log("Zapisano log wejscia do SimpleDB:", itemName);
                }

                var awsConfig = helpers.readJSONFile(AWS_CONFIG_FILE);
                var policyData = helpers.readJSONFile(POLICY_FILE);

                var policy = new Policy(policyData);

                var s3Form = new S3Form(policy);
                var fields = s3Form.generateS3FormFields();
                fields = s3Form.addS3CredientalsFields(fields, awsConfig);

                fields.push({ name: "x-amz-meta-host", value: os.hostname() });

                var bucket = policy.getConditionValueByKey("bucket");

                console.log("bucket: " + bucket);
                console.log("fields: " + util.inspect(fields, false, null));

                callback(null, {
                        template: INDEX_TEMPLATE,
                        params: {
                                fields: fields,
                                bucket: bucket
                        }
                });
        });
}

exports.action = task;
