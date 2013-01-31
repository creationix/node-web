var HTTPParser = process.binding("http_parser").HTTPParser;
var Stream = require('stream').Stream;
var urlParse = require('url').parse;

var STATUS_CODES = {
  '100': 'Continue',
  '101': 'Switching Protocols',
  '102': 'Processing',                 // RFC 2518, obsoleted by RFC 4918
  '200': 'OK',
  '201': 'Created',
  '202': 'Accepted',
  '203': 'Non-Authoritative Information',
  '204': 'No Content',
  '205': 'Reset Content',
  '206': 'Partial Content',
  '207': 'Multi-Status',               // RFC 4918
  '300': 'Multiple Choices',
  '301': 'Moved Permanently',
  '302': 'Moved Temporarily',
  '303': 'See Other',
  '304': 'Not Modified',
  '305': 'Use Proxy',
  '307': 'Temporary Redirect',
  '400': 'Bad Request',
  '401': 'Unauthorized',
  '402': 'Payment Required',
  '403': 'Forbidden',
  '404': 'Not Found',
  '405': 'Method Not Allowed',
  '406': 'Not Acceptable',
  '407': 'Proxy Authentication Required',
  '408': 'Request Time-out',
  '409': 'Conflict',
  '410': 'Gone',
  '411': 'Length Required',
  '412': 'Precondition Failed',
  '413': 'Request Entity Too Large',
  '414': 'Request-URI Too Large',
  '415': 'Unsupported Media Type',
  '416': 'Requested Range Not Satisfiable',
  '417': 'Expectation Failed',
  '418': 'I\'m a teapot',              // RFC 2324
  '422': 'Unprocessable Entity',       // RFC 4918
  '423': 'Locked',                     // RFC 4918
  '424': 'Failed Dependency',          // RFC 4918
  '425': 'Unordered Collection',       // RFC 4918
  '426': 'Upgrade Required',           // RFC 2817
  '500': 'Internal Server Error',
  '501': 'Not Implemented',
  '502': 'Bad Gateway',
  '503': 'Service Unavailable',
  '504': 'Gateway Time-out',
  '505': 'HTTP Version not supported',
  '506': 'Variant Also Negotiates',    // RFC 2295
  '507': 'Insufficient Storage',       // RFC 4918
  '509': 'Bandwidth Limit Exceeded',
  '510': 'Not Extended'                // RFC 2774
};

var defaults = {
  autoDate: true,
  autoServer: "node.js " + process.version,
  autoContentLength: true,
  autoChunked: true,
  autoConnection: true,
};
exports.socketHandler = function (app, options) {
  // Mix the options with the default config.
  var config = Object.create(defaults);
  for (var key in options) {
    config[key] = options[key];
  }

  return function (client) {
    var parser = new HTTPParser(HTTPParser.REQUEST);
    var req;

    function res(statusCode, headers, body) {

      var hasContentLength, hasTransferEncoding, hasDate, hasServer;
      for (var key in headers) {
        switch (key.toLowerCase()) {
          case "date": hasDate = true; continue;
          case "server": hasServer = true; continue;
          case "content-length": hasContentLength = true; continue;
          case "transfer-encoding": hasTransferEncoding = true; continue;
        }
      }
      if (!hasDate && config.autoDate) {
        headers["Date"] = (new Date).toUTCString();
      }
      if (!hasServer && config.autoServer) {
        headers["Server"] = config.autoServer;
      }
      var isStreaming = body && typeof body === "object" && typeof body.pipe === "function";
      if (body && !hasContentLength && !hasTransferEncoding) {
        if (!isStreaming && config.autoContentLength) {
          body += "";
          headers["Content-Length"] = Buffer.byteLength(body);
          hasContentLength = true;
        }
        else if (config.autoChunked) {
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

      if (config.autoConnection) {
        if (req.shouldKeepAlive && (hasContentLength || hasTransferEncoding || statusCode == 304)) {
          headers["Connection"] = "keep-alive"
        }
        else {
          headers["Connection"] = "close"
          req.shouldKeepAlive = false
        }
      }

      var reasonPhrase = STATUS_CODES[statusCode];
      if (!reasonPhrase) {
        throw new Error("Invalid response code " + statusCode);
      }
      var head = "HTTP/1.1 " + statusCode + " " + reasonPhrase + "\r\n";
      for (var key in headers) {
        head += key + ": " + headers[key] + "\r\n";
      }
      head += "\r\n";

      if (body && !isStreaming) head += body;

      client.write(head);

      if (!isStreaming) {
        return done()
      }

      body.pipe(client);
      body.on("end", done);

    }

    function done() {
      if (req.shouldKeepAlive) {
        parser.reinitialize(HTTPParser.REQUEST);
      }
      else {
        client.end();
      }
    }

    parser.onHeadersComplete = function (info) {
      info.body = new Stream();
      info.body.readable = true;
      req = info;
      var rawHeaders = req.rawHeaders = req.headers;
      var headers = req.headers = {};
      for (var i = 0, l = rawHeaders.length; i < l; i += 2) {
        headers[rawHeaders[i].toLowerCase()] = rawHeaders[i + 1];
      }
      req.url = urlParse(req.url);
      app(req, res);
    }

    parser.onBody = function (buf, start, len) {
      req.body.emit("data", buf.slide(start, len));
    };

    parser.onMessageComplete = function () {
      req.body.emit("end");
    };

    client.on("data", function (chunk) {
      var ret = parser.execute(chunk, 0, chunk.length);
      // TODO: handle error cases in ret
    });

    client.on("end", function () {
      parser.finish();
    });

  };
};
