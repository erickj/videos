goog.provide('vid.tasks.Task');

/**
 * @interface
 */
vid.tasks.Task = function() {};


/**
 * Runs the task with the given task parameters.
 * @param {!Object} params
 */
vid.tasks.Task.prototype.process = goog.abstractMethod;
