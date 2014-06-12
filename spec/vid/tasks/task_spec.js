goog.provide('spec.vid.tasks.Task');

goog.require('spec.helpers.fakes.FakeTask')

describe('spec.vid.tasks.Task', function() {
  var fakeTask;

  beforeEach(function() {
    fakeTask = new spec.helpers.fakes.FakeTask();
  });

  describe('#process', function() {
    it('has a process method', function() {
      expect(fakeTask.processCount).toBe(0);
      fakeTask.process();
      expect(fakeTask.processCount).toBe(1);
    });
  });
});
