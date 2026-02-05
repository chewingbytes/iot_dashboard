var AWS = require('aws-sdk');
var iotdata = new AWS.IotData({ endpoint: "avvyh2o0cz7xw-ats.iot-endpoint.amazonaws.com" });
var sns = new AWS.SNS();

exports.handler = function(event, context, callback) {
    console.log("Device_id: " + event.device_id.toString() + " Power Usage: " + event.power.toString());

    if (event.power > 1000) {
        // Publish shutdown command to IoT device
        var postData = JSON.stringify({ device_id: event.device_id, command: "shutdown" });
        var iotParams = {
            topic: 'Energy_Usage',
            payload: postData,
            qos: 0
        };

        iotdata.publish(iotParams, function(err, data) {
            if (err) {
                console.log("IoT Publish Error: ", err);
            } else {
                console.log("Shutdown command sent.");
            }
        });

        // Send SNS Alert
        var snsMessage = `⚠️ High Power Usage Detected!\nDevice: ${event.device_id}\nPower: ${event.power}W\nTime: ${event.timestamp}`;

        var snsParams = {
            TopicArn: "arn:aws:sns:us-east-1:797493453999:Energy_Usage",
            Message: snsMessage,
            Subject: "Energy Alert: High Power Usage"
        };

        sns.publish(snsParams, function(err, data) {
            if (err) {
                console.log("SNS Publish Error: ", err);
            } else {
                console.log("SNS Alert Sent Successfully.");
            }
        });
    }

    callback();
};

