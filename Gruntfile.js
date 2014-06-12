/**
 * For Grunt references see the following links:
 * @see http://gruntjs.com/api/grunt Grunt API
 * @see http://gruntjs.com/configuring-tasks#files Configuring file formats
 * @see http://gruntjs.com/inside-tasks Writing tasks
 */
var fs = require('fs');
var path = require('path');

var pathClosureLibrary = 'src/closure-library';
if (!fs.existsSync(pathClosureLibrary)) {
  throw Error(
      'Install closure library at an accessible path. See Gruntfile.js');
}
var pathSpec = 'spec';

var pathBuildRoot = 'build';
var pathBuildClosure = 'build/closure';
var pathBuildSpec = 'build/spec';

module.exports = function(grunt) {
  grunt.initConfig({
    /** Cleans all files in ROOT/build/* */
    clean: {
      build: [pathBuildRoot + '/*'],
      spec: [pathBuildSpec + '/*']
    },

    /** Makes the ROOT/build/* directories */
    mkdirs: {
      build: [
        pathBuildRoot,
        pathBuildClosure,
        pathBuildSpec
      ]
    },

    /**
     * Writes deps.js files
     * @see https://developers.google.com/closure/library/docs/depswriter
     * @see https://github.com/thanpolas/grunt-closure-tools
     */
    closureDepsWriter: {
      options: {
        closureLibraryPath: pathClosureLibrary,
        root: [pathClosureLibrary + '/closure/goog'],
        // All roots are relative to the closure root directory, i.e.
        // <pathClosureLibrary>/closure/goog
        root_with_prefix: [
          '"spec ../../../../spec"',
          '"src/vid ../../../vid"'
        ],
        execOpts: {
          maxBuffer: Math.pow(2, 30)
        }
      },
      /** task closureDepsWriter:src */
      src: {
        src: ['src/vid/**/*.js'],
        dest: pathBuildClosure + '/deps.js'
      },
      /** task closureDepsWriter:spec */
      spec: {
        src: ['spec/**/*Spec.js'],
        dest: pathBuildSpec + '/deps.js'
      }
    },

    /** Compiles JS with closure compiler */
    closure: {
      options: {
        library: pathClosureLibrary,
        defaultTarget: 'vid.client',
        compilerFlags: '.closureflags',
        compilerJar: '/usr/local/bin/closure-compiler.jar'
      },

      /** task closure:compile-src */
      'compile-src': {
        src: [
          pathClosureLibrary,
          'src/vid'
        ],
        dest: pathBuildClosure
      },

      /** task closure:concat-src */
      'concat-src': {
        src: [
          pathClosureLibrary,
          'src/vid'
        ],
        dest: pathBuildClosure
      },

      /** task closure:concat-spec */
      'concat-spec': {
        options: {
          defaultTarget: 'specdeps.all'
        },
        src: [
          pathClosureLibrary,
          'src/vid',
          pathBuildSpec,
          pathSpec
        ],
        dest: pathBuildSpec + '/concat.spec.js'
      },

      /** task closure:compile-spec */
      'compile-spec': {
        options: {
          compilerExterns: 'externs/jasmine.js',
          defaultTarget: 'specdeps.all'
        },
        src: [
          pathClosureLibrary,
          'src/vid',
          pathBuildSpec,
          pathSpec
        ],
        dest: pathBuildSpec
      }
    },

    /** Runs gjslint on task targets */
    gjslint: {
      options: {
        flags: [
          '--strict',
          '--custom_jsdoc_tags namespace,name',
          '--exclude_files genspecdeps.all.autogen.js'
        ],
        reporter: {
          name: 'console'
        }
      },

      /** task gjslint:src for linting src/vid */
      src: {
        src: 'src/vid/**/*.js'
      },

      /** task gjslint:spec for linting specs */
      spec: {
        src: 'spec/**/*.js'
      }
    },

    // TODO(erick): This is a totally shitty name, but since things are just
    // working, I'm too lazy to give this a better definition. This should be
    // cleaned up to indicate that it's building a file of goog.require targets
    // for the closure:concat-spec task.
    /** task genspecdeps builds an autogen file for goog.require namespaces */
    genspecdeps: {
      all: {
        options: {
          provideTarget: 'specdeps.all',
          namespacePrefix: 'spec.'
        },
        src: 'spec/**/*.js',
        dest: pathBuildSpec
      }
    },

    // TODO(erick): I'm using both jasmine 2.0 for client tests and jasmine 1.3
    // for server tests... uh-oh - should upgrade server tests to 2.0.
    /** Jasmine phantomjs runner config (client specs) */
    jasmine: {
      all: {
        options : {
          specs : pathBuildSpec + '/**/*spec.js'
        }
      }
    },

    /** Jasmine nodejs runner config (server specs) */
    jasmine_node: {
      all: [pathBuildSpec]
    },

    /** Loads required deps.js for the closure nodejs bootstrapper. */
    'load-closure-bootstrap': {
      spec: {
        src: pathBuildSpec + '/deps.js'
      }
    }
  });

  /** Loads all files as tasks in the ROOT/tasks directory */
  grunt.loadTasks('tasks');

  /** Loads NPM tasks */
  grunt.loadNpmTasks('grunt-closure-tools');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-gjslint');
  grunt.loadNpmTasks('grunt-jasmine-node');

  // TODO(erick): This is just a mess...
  /** Custom tasks */
  grunt.registerTask('init', ['clean', 'mkdirs']);
  grunt.registerTask('build-deps', ['closureDepsWriter']);

  /**
   * Task to bootstrap nodejs for using goog.require.
   * requries a deps.js file to be created, @see task build-deps
   */
  grunt.registerMultiTask(
    'load-closure-bootstrap', 'Bootstrap node for goog.require', function() {
      require('./src/closure-library/closure/goog/bootstrap/nodejs.js');
      this.files.forEach(function(files) {
        files.src.forEach(function(depsFile) {
          require(path.resolve(depsFile));
        });
      });
    });

  grunt.registerTask(
      'bootstrap-closure:spec', ['build-deps', 'load-closure-bootstrap:spec']);

  /** Task to run specs on nodejs. */
  grunt.registerTask(
      'server-specs', 'Run jasmine tests on node', function() {
    grunt.task.run('bootstrap-closure:spec');
    grunt.task.run('jasmine_node');
  });

  /** Task to run specs on phantomjs. */
  grunt.registerTask(
      'client-specs', 'Run jasmine tests on node', function() {
    grunt.task.run('genspecdeps:all');
    grunt.task.run('closure:concat-spec');
    grunt.task.run('jasmine:all');
  });

  /** Task to compile specs. */
  grunt.registerTask(
      'compile-specs', 'JS Compiles specs', function() {
    // TODO(erick): 'init' task is only here because running 'compile-specs'
    // after client-specs fails with error:
    // 'Base file should not provide or require namespaces.'
    // It probably has to do with the concat-spec output file being
    // in the include path of the compile-spec input.
    grunt.task.run('init');
    grunt.task.run('genspecdeps:all');
    grunt.task.run('closure:compile-spec');
  });

  /** Task to clean, concat, run, and compile specs. */
  grunt.registerTask('test-all', 'Runs specs for client and server targets ',
      ['init', 'gjslint', 'server-specs', 'client-specs', 'compile-specs']);

  /** Task to clean, concat, run, and compile specs. */
  grunt.registerTask('test-specs', 'Runs specs for server and client targets ',
      ['init', 'server-specs', 'client-specs']);

  /** Task default, runs client and server specs */
  grunt.registerTask('default', 'test-specs');
};
