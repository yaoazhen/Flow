;
(function (define) {

  define(function (require, exports) {

      //If have dependencies, get them here
      var _ = require('underscore');

      var undef = undefined;
      var each = _.each;
      var bind = _.bind;
      var find = _.find;
      var isFunction = _.isFunction;
      var noop = function () {
      };

      var Task = function (taskName, func) {
        this.taskName = taskName;
        this.func = func;
      };

      var Process = function (func) {
        this.func = func;
        this.tasks = [];
      };


      Process.prototype.reset = function () {
        each(this.tasks, function (task) {
          task.done = false;
        });

        return this;
      }

      Process.prototype.createSubTask = function (taskName, func) {
        var task = find(this.tasks, function (item) {
          return item.taskName === taskName;
        });

        if (!task) {
          task = new Task(taskName, func);
          this.tasks.push(task);
        }

        return task;
      };

      var _taskAction = function (taskName, func) {

        if (isFunction(func)) {
          var process = this.current();
          var task = process.createSubTask(taskName, func);

          if (!(task.disable || task.done)) {
            func();
          }

          return task;
        }
        else {
          throw new TypeError;
        }
      };


      var Flow = function () {
        var me = this;

        me.index = -1;
        me.steps = [];

        me.current = function () {

          if (this.index == -1 || (this.index + 1) > this.steps.length) {
            return noop;
          }
          var obj = me.steps[this.index];

          if (isFlow(obj)) {
            return obj.current();
          }

          return obj;
        };

        var increaseIndex = function (i) {
          if (!me.isEOF(me.index + 1)) {

            me.index++;

            var obj = me.steps[me.index];

            if (isFlow(obj)) {

              if (obj.moveIndex(i)) {
                return true;
              }
              else {
                me.moveIndex(i);
              }
            }
            else {
              return true;
            }
          }
        };

        var decreaseIndex = function (i) {
          if (!me.isBOF()) {
            me.index--;
            var obj = me.steps[me.index];

            if (isFlow(obj)) {
              if (obj.moveIndex(i)) {
                return true;
              } else {
                me.moveIndex(i);
              }
            }
            else if (me.isBOF()) {

              return false;
            }
            else {
              return true;
            }
          }
        };


        me.moveIndex = function (i, cb) {
          if (i > 0) {
            if ((this.steps.length - this.index) > 0) {
              var obj = this.steps[this.index];

              if (isFlow(obj)) {
                if (obj.moveIndex(i)) {
                  i--;
                }
                else if (increaseIndex(i)) {
                  i--;
                }
                else {
                  return false;
                }
              }
              else if (this.isBOF() || isProcess(obj)) {
                if (increaseIndex(i)) {
                  i--;
                }
                else {
                  return false;
                }
              }
              else {
                return false;
              }
            }
            else {
              return false;
            }
          }
          else if (i < 0) {
            if (this.isBOF()) {
              return false;
            } else {
              var obj = this.steps[this.index];

              if (isFlow(obj)) {
                if (obj.moveIndex(i)) {
                  i++;
                }
                else if (decreaseIndex(i)) {
                  i++;
                }
                else {
                  return false;
                }
              }
              else if (isProcess(obj)) {
                if (decreaseIndex(i)) {
                  i++;
                }
                else {
                  return false;
                }
              }
            }
          }

          if (i === 0) {
            return true;
          }
          else {
            this.moveIndex(i);
          }
        };


        if (arguments.length > 0) {
          this.add.apply(this, arguments);
        }

        me.go = bind(me.go, this);
        me.back = bind(me.back, this);
        me.action = bind(me.action, this);
        me.jump = bind(me.jump, this);
        me.onceInAll = bind(me.onceInAll, this);
        me.once = bind(me.once, this);
      };

      var isFlow = function (obj) {
        return obj instanceof Flow;
      };
      var isProcess = function (obj) {
        return obj instanceof Process;
      };

      var p = Flow.prototype;

      p.add = function (scenario) {
        var me = this;
        if (arguments.length > 1) {
          each(arguments, function (scenario) {

            me.add(scenario);

          }, me);
        }
        else {

          if (isFunction(scenario)) {
            scenario = new Process(scenario);
          }
          else if (!isFlow(scenario)) {
            throw new TypeError;
          }

          this.steps.push(scenario);
        }

        return this;
      };

      p.reset = function () {
        this.index = -1;
      };

      // Run this step and keep current process
      p.action = function () {

        var process = this.current();
        if (process) {
          process.func.apply(this, arguments);
        }

        return this;
      };

      // Go to next process
      p.go = p.next = function () {

        if (this.moveIndex(1)) {
          this.current().reset();
          this.action.apply(this, arguments);
        }

        return this;
      };

      // Back to last process
      p.back = function () {
        if (this.moveIndex(-1)) {
          this.current().reset();
          this.action.apply(this, arguments);
        }
        return this;
      };

      p.once = function (func) {
        var task = _taskAction.apply(this, arguments);
        task.done = true;

        return this;
      };

      p.onceInAll = function (func) {
        var task = _taskAction.apply(this, arguments);
        task.disable = true;

        return this;
      };

      // Go to special process with index
      p.goto = p.jump = function (index) {

        if (index > -1 && index < this.steps.length) {
          this.index = index;
          this.action.apply(this, arguments);
        }

        return this;
      };

      p.isBOF = function (i) {
        if (i === undef) {
          i = this.index;
        }

        return this.index === -1;
      };

      p.isEOF = function (i) {
        if (i === undef) {
          i = this.index;
        }

        return i === this.steps.length;
      };

      //Attach properties to exports.
      return exports.Flow = Flow;
    }
  )
  ;

})(typeof define === 'function' && define.amd ? define : function (factory) {
    if (typeof exports !== 'undefined') {
      //commonjs
      factory(require, exports);
    } else {
      //Create a global function. Only works if
      //the code does not have dependencies, or
      //dependencies fit the call pattern below.

      var mapping = {"underscore": "_"};

      factory(function (value) {
        if (mapping[value]) {
          value = mapping[value];
        }
        return window[value];
      }, (window));
    }
  });