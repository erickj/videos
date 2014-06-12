var fs = require('fs');
var path = require('path');

var closureTaskMessage = 'Builds a target with the closure compiler';
/** Task for compiling project sources to single file "binaries". */
module.exports = function(grunt) {
  grunt.registerMultiTask('closure', closureTaskMessage, function(namespace) {
    var targetPrefix = this.target.split('-')[0];
    switch(targetPrefix) {
      case 'compile':
        return compileTask.call(this, grunt, namespace);
      case 'concat':
        return concatTask.call(this, grunt, namespace);
      default:
        throw Error('Unknown closure multitask target ' + this.target);
    };
  });
};

/**
 * The concat task. Calculate dependencies of the given {@code namespace} and
 * concatenate the files together.
 * @task closure:concat[:namespace]
 * @param {!grunt} The grunt object
 * @param {(string|!Array.<string>)=} opt_namespace The namespace or namespaces
 *     to build
 * @inner
 */
var concatTask = function(grunt, opt_namespace) {
  var options = this.options();

  grunt.config.requires('closure.options.library');

  var closureLibraryPath = options.library;
  var target = opt_namespace || options.defaultTarget;

  if (!target) {
    throw Error('Missing target namespace')
  }
  if (this.files.length > 1) {
    throw Error('Only one dest/srcs pair currently supported');
  }

  this.files.forEach(function(files) {
    var srcFiles = files.src;
    var destFile = files.dest.match(/.*\.js$/) ?
        files.dest :
        path.join(files.dest, target + '.js');

    var config =
        getBaseClosureBuilderConfig(srcFiles, destFile, closureLibraryPath);
    config.closureBuilder.options.namespaces = target;
    config.closureBuilder.options.output_mode = 'script';

    generateAndRunClosureToolsTask(grunt, config);
  });
};


/**
 * The compile task. Calculate dependencies of the given {@code namespace} and
 * compile the script with advanced modifications.
 * @task closure:compile[:namespace]
 * @param {!grunt} The grunt object
 * @param {(string|!Array.<string>)=} opt_namespace The namespace or namespaces
 *     to build
 * @inner
 */
var compileTask = function(grunt, opt_namespace) {
  var options = this.options();

  grunt.config.requires('closure.options.library');
  grunt.config.requires('closure.options.compilerFlags');
  grunt.config.requires('closure.options.compilerJar');

  var closureLibraryPath = options.library;
  var flagFile = options.compilerFlags;
  var jarFile = options.compilerJar;
  var externs = options.compilerExterns || [];

  var target = opt_namespace || options.defaultTarget;
  if (!target) {
    throw Error('Missing target namespace')
  }
  if (this.files.length > 1) {
    throw Error('Only one dest/srcs pair currently supported');
  }

  this.files.forEach(function(files) {
    var srcFiles = files.src;
    var destFile = path.join(files.dest, target + '.opt.js');

    var config =
        getBaseClosureBuilderConfig(srcFiles, destFile, closureLibraryPath);
    config.closureBuilder.options.namespaces = target;
    config.closureBuilder.options.output_mode = 'compiled';
    config.closureBuilder.options.compile = true
    config.closureBuilder.options.compilerFile = jarFile;
    config.closureBuilder.options.compilerOpts = {
      'compilation_level': 'ADVANCED_OPTIMIZATIONS',
      'flagfile': flagFile,
      'js': path.join(closureLibraryPath, 'closure', 'goog', 'deps.js'),
      'externs': externs
    }

    generateAndRunClosureToolsTask(grunt, config);
  });
};


/**
 * @param {string|!Array.<string>} targetSrc
 * @param {string|!Array.<string>} targetDest
 * @param {string} closureLibraryPath
 * @return {{closureBuilder: !Object}}
 * @inner
 */
var getBaseClosureBuilderConfig =
    function(targetSrc, targetDest, closureLibraryPath) {
  return {
    closureBuilder: {
      options: {
        closureLibraryPath: closureLibraryPath,
        namespaces: null,
        output_mode: 'script',
        compile: false,
        compilerOps: {},
        execOpts: {
          maxBuffer: 999999 * 1024
        }
      },
      target: {
        src: targetSrc,
        dest: targetDest
      }
    }
  };
};


/**
 * Dynamically generates a new grunt-closure-tools task and runs the task.
 * @see https://github.com/thanpolas/grunt-closure-tools
 * @param {!Object} config
 * @inner
 */
var generateAndRunClosureToolsTask = function(grunt, config) {
  grunt.log.write('Initing grunt config for grunt-closure-tools...');
  grunt.config('closureBuilder', config.closureBuilder);
  grunt.log.ok();

  grunt.log.write('Loading npm task grunt-closure-tools...');
  grunt.loadNpmTasks('grunt-closure-tools');
  grunt.log.ok();

  grunt.log.write('Scheduling run for task closureBuilder:target...');
  grunt.task.run('closureBuilder:target');
  grunt.log.ok();
};
