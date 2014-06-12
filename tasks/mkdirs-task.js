var fs = require('fs');
var path = require('path');

var mkdirsTaskMessage = 'Makes project directories for the given target';

/**
 * The mkdirs multitask
 * @param {...*} var_args
 * @this {grunt.util~Task}
 * @see http://gruntjs.com/api/inside-tasks
 * @task mkdirs
 */
var mkdirsTask = function(grunt) {
  var dirs = this.data;
  dirs.forEach(function(dir) {
    var dirPath = path.resolve(dir);
    if (!fs.existsSync(dirPath)) {
      grunt.log.write('mkdir ' + dirPath + '...');
      fs.mkdirSync(dirPath);
      grunt.log.ok();
    } else {
      grunt.log.writeln('dir ' + dirPath + ' exists, skipping');
    }
  });
};

module.exports = function(grunt) {
  grunt.registerMultiTask('mkdirs', mkdirsTaskMessage, function() {
    return mkdirsTask.apply(this, [grunt].concat(arguments));
  });
};
