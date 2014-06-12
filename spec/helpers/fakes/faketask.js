goog.provide('spec.helpers.fakes.FakeTask');

goog.require('vid.tasks.Task');


/**
 * @constructor
 * @implements {vid.tasks.Task}
 */
spec.helpers.fakes.FakeTask = function() {
  /** type {number} */
  this.processCount = 0;
};


/** @override */
spec.helpers.fakes.FakeTask.prototype.process = function(params) {
  this.processCount++;
};
