;
(function (define) {

  define('Flow', function (require, exports) {

      //If have dependencies, get them here
      var _ = require('underscore');

      var undef = undefined;
      var ArrayProto     = Array.prototype;
      var ObjProto       = Object.prototype;
      var FuncProto      = Function.prototype;
      var slice          = Array.prototype.slice;
      var hasOwnProperty = ObjProto.hasOwnProperty;
      var nativeSome     = ArrayProto.some;
      var nativeBind     = FuncProto.bind;
      var nativeForEach  = ArrayProto.forEach;
      var noop = function () {
      };

      var isFunction = function(obj) {
          return typeof obj === 'function';
        };

      // Establish the object that gets returned to break out of a loop iteration.
      var breaker = {};
      // Reusable constructor function for prototype setting.
      var ctor = function(){};

      var bind = function(func, context){
        var bound, args;
        if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
        if (!isFunction(func)) throw new TypeError;
        args = slice.call(arguments, 2);
        return bound = function() {
          if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
          ctor.prototype = func.prototype;
          var self = new ctor;
          var result = func.apply(self, args.concat(slice.call(arguments)));
          if (Object(result) === result) return result;
          return self;
        };
      };

      // The cornerstone, an `each` implementation, aka `forEach`.
      // Handles objects with the built-in `forEach`, arrays, and raw objects.
      // Delegates to **ECMAScript 5**'s native `forEach` if available.
      var each = function(obj, iterator, context){
        if(obj == null) return;
        if(nativeForEach && obj.forEach === nativeForEach){
          obj.forEach(iterator, context);
        }
        else if(obj.length === +obj.length){
          for (var i = 0, l = obj.length; i < l; i++) {
            if (iterator.call(context, obj[i], i, obj) === breaker) return;
          }
        }
        else{
          for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) {
              if (iterator.call(context, obj[key], key, obj) === breaker) return;
            }
          }
        }
      };

      // Determine if at least one element in the object matches a truth test.
      // Delegates to **ECMAScript 5**'s native `some` if available.
      var some = function(obj, iterator, context){
        var result = false;
        if (obj == null) return result;
        if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);

        each(obj, function(value, index, list) {
          if (result || (result = iterator.call(context, value, index, list))) return breaker;
        });
        return !!result;
      };

      // Return the first value which passes a truth test.
      var find = function(obj, iterator, context) {
        var result;
        some(obj, function(value, index, list) {
          if (iterator.call(context, value, index, list)) {
            result = value;
            return true;
          }
        });
        return result;
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
        index--;

        if (index >= -1 && index < this.steps.length) {
          this.index = index;
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
      exports.Flow = Flow;
    }
  )
  ;

})(typeof define === 'function' && define.amd ? define : function (id, factory) {
    if (typeof exports !== 'undefined') {
      //commonjs
      factory(require, exports);
    } else {
      //Create a global function. Only works if
      //the code does not have dependencies, or
      //dependencies fit the call pattern below.

      var mapping = {"underscore": "_"};

      factory(function (value) {
        if(mapping[value]){
          value = mapping[value];
        }
        return window[value];
      }, (window));
    }
  });