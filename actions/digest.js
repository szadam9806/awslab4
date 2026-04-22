var os = require("os");
var AWS = require("aws-sdk");
var helpers = require("../helpers");
var sdb = require("../simpledb_helper");

var AWS_CONFIG_FILE = "config.json";

var task = function(request, callback) {
        var awsConfig = helpers.readJSONFile(AWS_CONFIG_FILE);

        AWS.config.update({
                accessKeyId: awsConfig.accessKeyId,
                secretAccessKey: awsConfig.secretAccessKey,
                region: awsConfig.region || "us-west-2"
        });

        var s3 = new AWS.S3();

        var bucket = request.query.bucket;
        var key = request.query.key;

        if (!bucket || !key) {
                callback(null, "Brak parametrów bucket lub key w redirect z S3.");
                return;
        }

        s3.getObject(
                {
                        Bucket: bucket,
                        Key: key
                },
                function(err, data) {
                        if (err) {
                                callback(null, "Błąd pobierania pliku z S3:<br>" + err);
                                return;
                        }

                        var doc = data.Body.toString("utf8");
                        var algorithms = ["md5", "sha1", "sha256", "sha512"];
                        var metadata = data.Metadata || {};

                        helpers.calculateMultiDigest(
                                doc,
                                algorithms,
                                function(err, digests) {
                                        if (err) {
                                                callback(null, "Błąd liczenia skrótów: " + err);
                                                return;
                                        }

                                        var digestMap = {};
                                        digests.forEach(function(d) {
                                                var parts = d.split(": ");
                                                if (parts.length === 2) {
                                                        digestMap[parts[0]] = parts[1];
                                                }
                                        });

                                        var itemName = "digest_" + Date.now();
                                        var digestAttributes = [
                                                { Name: "bucket", Value: String(bucket), Replace: true },
                                                { Name: "key", Value: String(key), Replace: true },
                                                { Name: "host", Value: os.hostname(), Replace: true },
                                                { Name: "date", Value: new Date().toISOString(), Replace: true },
                                                { Name: "md5", Value: String(digestMap.md5 || ""), Replace: true },
                                                { Name: "sha1", Value: String(digestMap.sha1 || ""), Replace: true },
                                                { Name: "sha256", Value: String(digestMap.sha256 || ""), Replace: true },
                                                { Name: "sha512", Value: String(digestMap.sha512 || ""), Replace: true }
                                        ];

                                        sdb.putAttributes(sdb.DIGESTS_DOMAIN, itemName, digestAttributes, function(sdbErr) {
                                                if (sdbErr) {
                                                        console.log("Blad zapisu digestow do SimpleDB:", sdbErr);
                                                } else {
                                                        console.log("Zapisano digesty do SimpleDB:", itemName);
                                                }

                                                var metadataHtml = Object.keys(metadata).length
                                                        ? Object.keys(metadata)
                                                                .map(function(k) {
                                                                        return "<b>" + k + ":</b> " + metadata[k];
                                                                })
                                                                .join("<br>")
                                                        : "brak";

                                                var result =
                                                        "<h3>Wynik</h3>" +
                                                        "<b>Bucket:</b> " + bucket + "<br>" +
                                                        "<b>Key:</b> " + key + "<br>" +
                                                        "<b>Metadata:</b><br>" + metadataHtml + "<hr>" +
                                                        digests.join("<br>") +
                                                        "<hr><br>Service provided by: " + os.hostname();

                                                callback(null, result);
                                        });
                                },
                                1
                        );
                }
        );
};

exports.action = task;
