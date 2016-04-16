var WebSocketServer = require('ws').Server;
var port = process.env.PORT || 5000;

var wss = new WebSocketServer({
    port: port
}, function callback() {
    console.log(arguments);
});
