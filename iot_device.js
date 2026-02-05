var awsIoT = require('aws-iot-device-sdk');

var device = awsIoT.device({
    keyPath: "./certs/private-pem.key",
    certPath: "./certs/certificate.pem.crt",
    caPath: './certs/AmazonRootCA1.pem',
    clientId: 'first-try',
        host: 'a3cgwqvwz0nizh-ats.iot.ap-southeast-1.amazonaws.com'
})

const now = new Date();

const sampleData = [
  {
    device_id: 1,
    time: new Date(now.getTime() - 2000).toISOString(),
    current: 0.85,
    voltage: 220,
    power: 1500
  },
  {
    device_id: 2,
    time: new Date(now.getTime() - 1000).toISOString(),
    current: 1.20,
    voltage: 220,
    power: 9999
  },
  {
    device_id: 3,
    time: new Date(now.getTime()).toISOString(),
    current: 0.95,
    voltage: 220,
    power: 209.0
  }
];

device.on("connect", function () {
    console.log("Connected to AWS IoT!");

    device.subscribe("Energy_Usage")
    sampleData.forEach((data, index) => {
        setTimeout(() => {
            console.log("Publishing Data:", data);
            device.publish("Energy_Usage", JSON.stringify(data));
        }, index * 3000); 
    });
});

device.on("error", function (err) {
  console.error("AWS IoT Error:", err);
});

device.on("reconnect", function () {
  console.log("Reconnecting to AWS IoT...");
});

device.on("offline", function () {
  console.log("AWS IoT Offline");
});

device.on("message", function(topic, payload){
    console.log('message', topic, payload.toString());
});

