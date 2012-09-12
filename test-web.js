var middle = require('middle');
var fs = require('fs');

function app(req, res) {
  var isHead;
  var method = req.method;
  if (method === "HEAD") {
    method = "GET";
    isHead = true;
  }
  if (!method === "GET") return res(404, {}, "");
  
  // fs.open(__filename, "r", function (err, fd) {
  //   if (err) throw err;
  //   fs.fstat(fd, function (err, stat) {
  //     if (err) throw err;
  //     var input;
  //     if (isHead) {
  //       fs.close(fd);
  //     }
  //     else {
  //       input = fs.createReadStream(null, {fd:fd});
  //     }
  //     res(200, {
  //       "ETag": '"' + stat.ino.toString(36) + "-" + stat.size.toString(36) + "-" + stat.mtime.valueOf().toString(36) + '"',
  //       "Content-Type": "application/javascript",
  //       "Content-Length": stat.size
  //     }, input);
  //   });
  // });
  res(200, {
    "Content-Type": "text/plain",
  }, "Hello World\n");
}

app = middle.autoHeaders(app);

app = middle.log(app);

var server = require('net').createServer(require('web').socketHandler(app));
server.listen(8080, function () {
  var address = server.address();
  console.log("http://%s:%s/", address.address, address.port);
});
