
function app(req, res) {
  if (req.method === "GET" && req.url.path === "/") {
    res(200, { "Content-Type": "text/plain" }, "Hello World\n");
  }
  else {
    res(404, {}, "");
  }
}


var server = require('net').createServer(require('./web').socketHandler(app));
server.listen(8080, function () {
  var address = server.address();
  console.log("http://%s:%s/", address.address, address.port);
});
