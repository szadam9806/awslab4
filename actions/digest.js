var AWS = require("aws-sdk");
var helpers = require("../helpers");

var AWS_CONFIG_FILE = "config.json";
var QUEUE_URL = "https://sqs.us-west-2.amazonaws.com/327481845219/SzymanskiSQS";

var task = function(request, callback) {
    var awsConfig = helpers.readJSONFile(AWS_CONFIG_FILE);

    AWS.config.update({
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
        region: awsConfig.region || "us-west-2"
    });

    var sqs = new AWS.SQS();

    var bucket = request.query.bucket;
    var key = request.query.key;

    if (!bucket || !key) {
        callback(null, "Brak parametrów bucket lub key w redirect z S3.");
        return;
    }

    var message = {
        bucket: bucket,
        key: key,
        date: new Date().toISOString()
    };

    sqs.sendMessage({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(message)
    }, function(err, data) {
        if (err) {
            console.log("Blad wysylania wiadomosci do SQS:", err);
            callback(null, "Plik zapisany w S3, ale wystapil blad wysylania zadania do SQS:<br>" + err);
            return;
        }

        console.log("Wyslano zadanie do SQS:", data.MessageId, message);

        var result =
            "<h3>Plik zapisany</h3>" +
            "<b>Bucket:</b> " + bucket + "<br>" +
            "<b>Key:</b> " + key + "<br>" +
            "<b>SQS MessageId:</b> " + data.MessageId + "<br>" +
            "<br>Wyliczanie skrotow zostalo przekazane do digestServer przez SQS.";

        callback(null, result);
    });
};

exports.action = task;
