# Web

Web is a new node module designed for building web applications.  It's intended to replace the built-in `http` module as well as middle-ware systems like connect and stack.

As the creator of the connect/stack interface, I've learned a lot over the years about what I could have done better.  Also the built-in `http` module in node itself has gotten bloated and complex since we've learned as we've gone on.  Features can be added a lot easier than they can be removed.  As a result, there are many different optional interfaces in the node HTTP interface.

The new interface for web app layers found in `web` is closer modeled after the ideas in wsgi, rack, jsgi, strata.js and friends.  This allows for easy module composition and a simple but powerful interface through which layers can work together to build a complex web application.

## The Old Interface

In the old node interface as exposed by the `http` module, you create a HTTP server and pass it a HTTP request handler function.  This function has the signature of:

```js
// Old "http" handler interface built-in to node.js
function handler(request, response) {
  // request.method is "GET", "PUT", "POST", etc..
  // request.url is "/foo/bar?and=stuff" ...
  // and other interesting properties.
  // Also request itself is a readable node stream
  // representing the http request body.

  // response.writeHead(code, headers)
  // response.write(data)
  // response.end(optionalData)
  // and *many* other interfaces and alternate methods for setting
  // headers and code.
  // also the response object is a writable node stream representing
  // the response body.
}

var server = http.createServer(handler);
// server is a net.Server instance that parses HTTP protocol and
// calls the handler function on each request.
```

This interface alone is not easy to wrap and so middle-ware dispatchers like connect and stack were invented to ease the pain.  They still have several problems however.

Considering it's history, this module has a pretty good API, but there is only so much you can do if you're learning as you go and are unable to break backwards compatibility.  Cruft will accumulate even under the watchful eye of the best maintainers.

## The New Way

The new interface is changed slightly.

Firstly, instead of a `response` object that's both response stream and object full of random methods, there is a `respond` function that accepts status code, headers, and body.

Second, it's not bound to the `net` module anymore.  I believe that parsing HTTP and listening on a real network socket should be two different responsibilities.  If you separate the two, then it's much easier to create mock servers that listen on fake sockets or exotic real servers that aren't TCP based.

```js
var app = function (request, respond) {
  // request.method is "GET", "POST", "PUT", etc..
  // request.url is { pathname: "/foo/bar", query: "and=stuff" }...
  // request is still the request stream, but I'm thinking of moving
  // it to a .body property.

  // respond(code, headers, body) is a function
  // body can be a string or a writable stream.
}

// This handler function expects a raw tcp connection
// It handles HTTP parsing internally
var handler = require('web').socketHandler(app);

// To serve the http app over tcp, we only need to connect to a tcp server.
var server = require('net').createServer(handler);
```

