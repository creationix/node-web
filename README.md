# Web

Web is a new node module designed for building web applications.  It's intended to replace the built-in `http` module as well as middle-ware systems like connect and stack.

As the creator of the connect/stack interface, I've learned a lot over the years about what I could have done better.  Also the built-in `http` module in node itself has gotten bloated and complex since we've learned as we've gone on.  Features can be added a lot easier than they can be removed.  As a result, there are many different optional interfaces in the node HTTP interface.

The new interface for web app layers found in `web` is closer modeled after the ideas in wsgi, rack, jsgi, strata.js and friends.  This allows for easy module composition and a simple but powerful interface through which layers can work together to build a complex web application.

## The Old Interface

In the old node interface as exposed by the `http` module, you create an HTTP server and pass it an HTTP request handler function.

Usage looks like:

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

// Create a TCP server that parses HTTP protocol and
// calls the handler function on each request.
var server = http.createServer(handler);
server.listen(8080);
```

This interface alone is not easy to wrap application layers and so middle-ware dispatchers like connect and stack were invented to ease the pain.  They still have several problems however.

Considering it's history, this module has a pretty good API, but there is only so much you can do if you're learning as you go and are unable to break backwards compatibility.  Cruft will accumulate even under the watchful eye of the best maintainers.

## The New Way

The new interface is changed slightly.

Firstly, instead of a `response` object that's both response stream and object full of random methods, there is a `respond` function that accepts status code, headers, and body.

Second, it's not bound to the `net` module anymore.  I believe that parsing HTTP and listening on a real network socket should be two different responsibilities.  If you separate the two, then it's much easier to create mock servers that listen on fake sockets or exotic real servers that aren't TCP based.

```js
var app = function (request, respond) {
  // request.method is "GET", "POST", "PUT", etc..
  // request.url is { pathname: "/foo/bar", query: "and=stuff" ...}
  // request is still the request stream, but I'm thinking of moving
  // it to a .body property.

  // respond(code, headers, body) is a function
  // body can be a string or a writable stream.
}

// This handler function expects a raw TCP connection
// It handles HTTP parsing internally
var handler = require('web').socketHandler(app);

// To serve the HTTP app over TCP, we only need to connect to a TCP server.
var server = require('net').createServer(handler);
server.listen(8080);
```

## Built-in Middleware System

Unlike the `http` module, `web` makes it trivial to stack app layers.  There is no need for a library because all that's needed is a simple function.  Any function that implements the `(request, respond)` interface is a valid web application.

### Basic Logger Layer

Suppose you wanted to add a layer that logged all request and the response code the app gave them.

This can be done simple as:

```js
function logger(app) {
  // Any per-layer startup logic would go here.
  // We only need the app closure reference, so there is nothing else to do

  return function(req, res) {

    // Per request logic during the inward path would go here.  Since
    // we want to wait till the response code is generated, there is nothing
    // to do.

    // Forward to the next layer inward.
    app(req, function (code, headers, body) {

      // Here we've intercepted the response function and can do stuff on the
      // way back out of the layers.  We want to log the request and response.

      console.log(req.method + " " + req.url.path + " " + code);

      // Forward to the layers outward.
      res(code, headers, body);
    });
  };
}

// Then to use this layer, we just wrap out app.
app = logger(app);
```

As you can see, there are places to do logic at several steps in a request and server lifetime.


