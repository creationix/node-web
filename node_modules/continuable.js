var nativeFs = process.binding('fs')

var fs = exports.fs = (function () {

  var constants = require('constants');

  function stringToFlags(string) {
    if (typeof string === "number") return string;
    switch (string) {
      case 'r':  return constants.O_RDONLY;
      case 'r+': return constants.O_RDWR;
      case 'w':  return constants.O_CREAT | constants.O_TRUNC | constants.O_WRONLY;
      case 'w+': return constants.O_CREAT | constants.O_TRUNC | constants.O_RDWR;
      case 'a':  return constants.O_APPEND | constants.O_CREAT | constants.O_WRONLY;
      case 'a+': return constants.O_APPEND | constants.O_CREAT | constants.O_RDWR;
      default: throw new Error("Unknown flag string " + JSON.stringify(string));
    }
  }

  function noop(err) {
    if (err) console.error(err.stack);
  }

  function ReadStream(fd) {
    this.fd = fd;
    this.buffer = new Buffer(this.chunkSize);
    this.position = 0;
  }
  ReadStream.prototype.chunkSize = 1024 * 40;
  ReadStream.prototype.read = function () {
    var self = this;
    return function (callback) {
      read(self.fd, self.buffer, 0, self.chunkSize, self.position)(function (err, bytesRead) {
        if (err) return callback(err);
        self.position += bytesRead;
        if (bytesRead) {
          return callback(null, self.buffer.slice(0, bytesRead));
        }
        callback();
      });
    }
  }
  ReadStream.prototype.close = function () {
    return close(this.fd);
  };
  
  function WriteStream(fd) {
    this.fd = fd;
    this.position = 0;
  }
  WriteStream.prototype.write = function (chunk) {
    var self = this;
    return function (callback) {
      if (!chunk) { return callback(); }
      write(self.fd, chunk, 0, chunk.length, self.position)(function (err, bytesWritten) {
        if (err) return callback(err);
        self.position += bytesWritten;
        callback(null, bytesWritten);
      });
    };
  };
  WriteStream.prototype.close = ReadStream.prototype.close;

  function open(path, flags, mode) {
    return function (callback) {
      return nativeFs.open(path, stringToFlags(flags), mode || 0666, callback || noop);
    };
  }

  function read(fd, buffer, offset, length, position) {
    return function (callback) {
      return nativeFs.read(fd, buffer, offset, length, position, callback || noop)
    };
  };

  function write(fd, buffer, offset, length, position) {
    return function (callback) {
      return nativeFs.write(fd, buffer, offset, length, position, callback || noop);
    };
  };

  function close(fd) {
    return function (callback) {
      return nativeFs.close(fd, callback || noop);
    };
  };

  function stat(path) {
    return function (callback) {
      return nativeFs.stat(path, callback || noop);
    };
  };

  function fstat(fd) {
    return function (callback) {
      return nativeFs.fstat(fd, callback || noop);
    };
  };

  function lstat(path) {
    return function (callback) {
      return nativeFs.lstat(path, callback || noop);
    };
  };

  return {
    ReadStream: ReadStream,
    WriteStream: WriteStream,
    open: open,
    read: read,
    write: write,
    close: close,
    stat: stat,
    fstat: fstat,
    lstat: lstat
  };

})();
