var HTTPParser = process.binding("http_parser").HTTPParser;
var Stream = require('stream').Stream;

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

exports.socketHandler = function (app) {
  return function (client) {
    var parser = new HTTPParser(HTTPParser.REQUEST);
    var req;

    parser.onHeadersComplete = function (info) {
      info.__proto__ = Stream.prototype;
      Stream.call(info);
      req = info;
      req.readable = true;
      app(req, function (statusCode, headers, body) {
        var reasonPhrase = STATUS_CODES[statusCode];
        if (!reasonPhrase) {
          throw new Error("Invalid response code " + statusCode);
        }
        var head = "HTTP/1.1 " + statusCode + " " + reasonPhrase + "\r\n";
        for (var key in headers) {
          head += key + ": " + headers[key] + "\r\n";
        }
        head += "\r\n";

        var isStreaming = body && typeof body === "object" && typeof body.pipe === "function";

        if (body && !isStreaming) head += body;

        client.write(head);

        if (!isStreaming) {
          return done()
        }

        body.pipe(client);
        body.on("end", done);

      });
    }

    parser.onBody = function (buf, start, len) {
      req.emit("data", buf.slide(start, len));
    };

    parser.onMessageComplete = function () {
      req.emit("end");
    };

    client.on("data", function (chunk) {
      var ret = parser.execute(chunk, 0, chunk.length);
      // TODO: handle error cases in ret
    });

    client.on("end", function () {
      parser.finish();
    });

    function done() {
      if (req.shouldKeepAlive) {
        parser.reinitialize(HTTPParser.REQUEST);
      }
      else {
        client.end();
      }
    }
  };
};
