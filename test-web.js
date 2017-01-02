
function app(req, res) {
  if (req.method === "GET" && req.url.path === "/") {
    res(200, { "Content-Type": "text/plain" }, "Hello World\n");
  }
  else {
    res(404, {}, "");
  }
}


var server = require('net').createServer(), web = require('./web');
server.on('connection', web.socketHandler(app, { debug: true }));
server.listen(8080, function () {
  var address = server.address();
  console.log("http://%s:%s/", address.address, address.port);
});
