// ## Multiple environment support
;(function(name, factory){
  var hasDefine = typeof define === 'function' && define.amd,
  hasExports = typeof module !== 'undefined' && module.exports;
  if(hasDefine){/*AMD Module*/
    define(['underscore'], factory);
  }
  else if(hasExports){
    /*Node.js Module*/
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like enviroments that support module.exports,
    // like Node.
    module.exports = factory();
  }
  else{
    /*Assign to common namespaces or simply the global object (window)*/
    this[name] = factory();
  }
})('Jumper', function(undef){
  "use strict";
  
  var ver = '0.1.1'
  , ArrayProto     = Array.prototype
  , ObjProto       = Object.prototype
  , FuncProto      = Function.prototype
  , slice          = Array.prototype.slice
  , hasOwnProperty = ObjProto.hasOwnProperty
  , nativeSome     = ArrayProto.some
  , nativeBind     = FuncProto.bind
  , nativeForEach  = ArrayProto.forEach

  , isFunction = function(obj) {
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

  var _createTask = function(){
    return {
      disable:false
      , went:false
    };
  };

  var _createProcess = function(func){
    return {
      func : func
      , running: false
      , tasks : undef
    };
  };

  var _reviveProcess =function(process){
    each(process.tasks, function(task){
      task.went = false;
    });
  };

  var Jumper = function() {
    this.index = -1;
    this.steps=[];

    if(arguments.length > 0){
      this.add.apply(this, arguments);
    }

    this.go = bind(this.go, this);
    this.back = bind(this.back, this);
    this.action = bind(this.action, this);
    this.jump = bind(this.jump, this);
    this.onceInAll = bind(this.onceInAll, this);
    this.once = bind(this.once, this);
  };

  var _createTaskInProcess = function(process, taskName, func){
    if(process && !process.tasks){
      process.tasks=[];
    }

    var task = find(process.tasks, function(item){
      return item.taskName === taskName;
    });

    if(!task){
      task = _createTask();
      task.taskName = taskName;
      task.func = func;
      process.tasks.push(task);
    }
    return task;
  };

  var _onceAction = function(taskName, func){
    // TODO: What about arguments is a Jumper instance
   if(isFunction(func)){
      var process = this.current();
      if(!process){
        new Error('Once only using in a process');
      }

      var task = _createTaskInProcess.call(this, process, taskName, func);

      if(!(task.disable || task.went)){
        func();
      }
      return task;
    }
    else{
      throw new TypeError;
    }
  };

  var p = Jumper.prototype;

  p.current = function(){
    return this.steps[this.index];
  };

  // Just run once even you back to this step
  p.onceInAll = function(taskName, func) {
    var task = _onceAction.apply(this, arguments);
    task.disable = true;
    return this;
  };

  // Run once every time go to this step
  // it will not run when using action
  p.once = function(taskName, func){

    var task =  _onceAction.apply(this, arguments);
    task.went = true;
    return this;
  };

  // Run this step and keep current process
  p.action =function(){
    var process = this.current();
    if(process){
      process.func.apply(this, arguments);
    }
    return this;
  };

  // Goto next process 
  p.go = function() {
    if(this.index < this.steps.length-1){
      this.index++;
      var process = this.current();
      _reviveProcess(process);
      this.action.apply(this, arguments);
    }

    return this;
  };

  // Back to last process
  p.back = function() {
    if(this.index > 0){
      this.index--;
      var process = this.current();
        _reviveProcess(process);
        this.action.apply(this, arguments);
    }

    return this;
  };

  // Jump to special process with index
  p.jump = function(index){
    index--;
    if(index >= -1 && index < this.steps.length){
      this.index = index;
    }
    return this;
  };
  // Add process 
  p.add = function(func) {
    if(arguments.length >1){
      each(arguments, function(func){
        if(isFunction(func)){
          this.add(func);
        }
        else{
          throw new TypeError;
        }
      }, this);
    }
    else{
      var process = _createProcess(func);
      this.steps.push(process);
    }

    return this;
  };

  return Jumper;
});
