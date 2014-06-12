var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');

var buildTaskMessage = 'Builds the JS protobuf classes for the given target';
/** Task for building protobuf JS from .proto files. */
module.exports = function(grunt) {
  grunt.registerMultiTask('protobuf', buildTaskMessage, function() {
    return buildTask.apply(this, [grunt].concat(arguments));
  });
};

var extension = ".pb.js";

/**
 * The build multitask.
 * @param {...*} var_args
 * @this {grunt.util~Task}
 * @see http://gruntjs.com/api/inside-tasks
 * @task protobuf:target
 */
var buildTask = function(grunt, var_args) {
  grunt.config.requires('protobuf.options.protoCompiler');
  grunt.config.requires('protobuf.options.protobufPluginClosure');

  // TODO(erick): Update the async {@code #done} call above to handle more
  // than a single build result.
  if (this.files.length > 1) {
    throw Error('Doesn\'t support more than one build currently');
  }

  var done = this.async();
  /**
   * @param {!Array.<string>} expectedResults
   * @param {Error} error
   * @param {!Buffer} stdout
   * @param {!Buffer} stderr
   * @private
   */
  var handleExec = function(expectedResults, error, stdout, stderr) {
    if (stdout.length) {
      grunt.log.writeln('stdout: ' + stdout);
    }

    var success = error == null;
    if (!success) {
      grunt.log.errorlns(error);
    } else {
      grunt.log.writeln();
      grunt.log.oklns('Built ' + expectedResults.length + ' protobuffer files:');
      expectedResults.forEach(function(result) {
        var resultStat = fs.statSync(result);
        var kiloBytes = (resultStat.size / 1024).toFixed(1);
        grunt.log.write(result + '\t' + kiloBytes + ' kB ');
        grunt.log.ok();
      });
    }
    done(success);
  };

  var protoCompiler = grunt.config.get('protobuf.options.protoCompiler');
  var protobufPluginClosure =
      grunt.config.get('protobuf.options.protobufPluginClosure');
  var cmdBase = [
    protoCompiler,
    '--plugin=' + protobufPluginClosure + '/protobuf/protoc-gen-js'
  ];
  var includes = grunt.config.get('protobuf.options.include');
  includes.forEach(function(include) {
    cmdBase.push('-I', include);
  });
  var protoPaths = {};

  // Run the protoc cmd for each set of src/dest files
  // @see http://gruntjs.com/api/inside-tasks#this.files
  this.files.forEach(function(files) {
    var srcFiles = files.src;
    var destFile = files.dest;

    var cmd = cmdBase.concat('--js_out=' + path.resolve(destFile));
    srcFiles.forEach(function(srcFile) {
      var protoPath = path.resolve(path.dirname(srcFile));
      if (protoPaths[protoPath]) {
        return;
      }
      cmd.push('--proto_path=' + protoPath);
      protoPaths[protoPath] = true;
    });
    srcFiles.forEach(function(srcFile) {
      cmd.push(path.resolve(srcFile));
    });

    cmd = cmd.join(' ');
    grunt.log.writeln();
    grunt.log.writeln('Executing: ' + cmd);
    exec(cmd, function() {
      var args = Array.prototype.slice.apply(arguments);
      var expectedResults =
        srcFiles.map(function(srcFile) {
          var srcBase = path.basename(srcFile);
          var expectedBasename = srcBase.replace('.proto', extension);
          return path.join(destFile, expectedBasename);
        });
      args.unshift(expectedResults);
      handleExec.apply(null, args);
    });
  });
};
