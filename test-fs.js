var fs = require('continuable').fs;

copy(__filename, __filename + ".copy")(onCopy)

function copy(inputPath, outputPath) {
  console.log("Copying %s to %s", inputPath, outputPath);

  return function (callback) {
    var input, output;
    var totalWritten = 0;

    fs.open(inputPath, "r")(onOpenInput);

    function onOpenInput(err, fd) {
      if (err) return done(err);
      input = new fs.ReadStream(fd);
      fs.open(outputPath, "w")(onOpenOutput);
    }

    function onOpenOutput(err, fd) {
      if (err) return done(err);
      output = new fs.WriteStream(fd);
      input.read()(onRead);
    }

    function onRead(err, chunk) {
      if (err) return done(err);
      output.write(chunk)(onWrite);
    }

    function onWrite(err, bytesWritten) {
      if (err) return done(err);
      if (bytesWritten) {
        totalWritten += bytesWritten;
        return input.read()(onRead);
      }
      return done();
    }

    function done(err) {
      input && input.close()();
      output && output.close()();
      callback(err, totalWritten);
    }

  };
}

function onCopy(err, bytes) {
  if (err) throw err;
  console.log("copied %s bytes", bytes);
}
