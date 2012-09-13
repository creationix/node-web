var Stream = require('stream').Stream;
var urlParse = require('url').parse;

exports.log = function (app) {
  return function (req, res) {
    var method = req.method;
    var url = req.url;
    app(req, function (code, headers, body) {
      console.log(method + " " + url + " " + code);
      res(code, headers, body);
    });
  };
};

// Moves the raw headers to .rawHeaders and makes easy to access headers at .headers
// Also adds missing headers in response like Date, Server, and Content-Length
exports.autoHeaders = function (app) {
  return function (req, res) {
    // Make the headers more user friendly
    var rawHeaders = req.rawHeaders = req.headers;
    var headers = req.headers = {};
    for (var i = 0, l = rawHeaders.length; i < l; i += 2) {
      headers[rawHeaders[i].toLowerCase()] = rawHeaders[i + 1];
    }

    // Parse the url and store the original in rawUrl
    var rawUrl = req.rawUrl = req.url;
    req.url = urlParse(rawUrl);
    
    app(req, function (code, headers, body) {
      var hasContentLength, hasTransferEncoding, hasDate, hasServer;
      for (var key in headers) {
        switch (key.toLowerCase()) {
          case "date": hasDate = true; continue;
          case "server": hasServer = true; continue;
          case "content-length": hasContentLength = true; continue;
          case "transfer-encoding": hasTransferEncoding = true; continue;
        }
      }
      if (!hasDate) {
        headers["Date"] = (new Date).toUTCString();
      }
      if (!hasServer) {
        headers["Server"] = "node " + process.version;
      }
      if (body && !hasContentLength && !hasTransferEncoding) {
        var isStreaming = body && typeof body === "object" && typeof body.pipe === "function";
        if (!isStreaming) {
          body += "";
          headers["Content-Length"] = Buffer.byteLength(body);
          hasContentLength = true;
        }
        else {
          headers["Transfer-Encoding"] = "chunked";
          hasTransferEncoding = true;
          var originalBody = body;
          body = new Stream();
          body.readable = true;
          
          originalBody.on("data", function (chunk) {
            if (Buffer.isBuffer(chunk)) {
              body.emit("data", chunk.length.toString(16).toUpperCase() + "\r\n");
              body.emit("data", chunk);
              body.emit("data", "\r\n");
              return;
            }
            var length = Buffer.byteLength(chunk);
            body.emit("data", toString(16).toUpperCase() + "\r\n" + chunk + "\r\n");
          });
          
          originalBody.on("end", function () {
            body.emit("data", "0\r\n\r\n\r\n");
            body.emit("end")
          });
        }
      }
      
      if (req.shouldKeepAlive && (hasContentLength || hasTransferEncoding || code == 304)) {
        headers["Connection"] = "keep-alive"
      }
      else {
        headers["Connection"] = "close"
        req.shouldKeepAlive = false
      }
      
      res(code, headers, body);
    });
  };
};