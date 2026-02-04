var awsIoT = require('aws-iot-device-sdk');

var device = awsIoT.device({
    keyPath: "./certs/46da3bb2f657600bfba45ec93cfdde27c2a7c8c4ae18724a014d4f3450c5cfbb-private.pem.key",
    certPath: "./certs/46da3bb2f657600bfba45ec93cfdde27c2a7c8c4ae18724a014d4f3450c5cfbb-certificate.pem.crt",
    caPath: './certs/AmazonRootCA1.pem',
    clientId: 'first-try',
        host: 'avvyh2o0cz7xw-ats.iot.us-east-1.amazonaws.com'
})

const sampleData = [
  {
    device_id: 1,
    current: 0.85,
    voltage: 220,
    power: 1500,
    timestamp: new Date().toISOString()
  },
  {
    device_id: 2,
    current: 1.20,
    voltage: 220,
    power: 9999,
    timestamp: new Date().toISOString()
  },
  {
    device_id: 3,
    current: 0.95,
    voltage: 220,
    power: 209.0,
    timestamp: new Date().toISOString()
  }
];

device.on("connect", function () {
    console.log("Connected to AWS IoT!");

    device.subscribe("Energy_Usage")
    sampleData.forEach((data, index) => {
        setTimeout(() => {
            console.log("Publishing Data:", data);
            device.publish("Energy_Usage", JSON.stringify(data));
        }, index * 3000); // Publish every 3 seconds
    });
});

device.on("message", function(topic, payload){
    console.log('message', topic, payload.toString());
});

