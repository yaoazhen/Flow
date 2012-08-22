// ## Multiple environment support
;(function(name, factory){
	
	var hasDefine = typeof define === 'function' && define.amd,
	hasExports = typeof module !== 'undefined' && module.exports;

	if(hasDefine){/*AMD Module*/
		define(['underscore'], factory);
	}
	else if(hasExports){/*Node.js Module*/
		// Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
		module.exports = factory(require('underscore'));
	}
	else{
		/*Assign to common namespaces or simply the global object (window)*/
		(this._ && this)[name] = factory(this._);
	}
})('Jumper', function(_, undef){
	"use strict";

	var ver = '0.0.1'
	, slice = Array.prototype.slice;

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
		_.each(process.tasks, function(task){
			task.went = false;
		});
	};

	var Jumper = function() {
		this.index = -1;
		this.steps=[];

		this.add.apply(this, arguments);
		this.go = _.bind(this.go, this);
		this.back = _.bind(this.back, this);
		this.action = _.bind(this.action, this);
		this.jump = _.bind(this.jump, this);
		this.onceInAll = _.bind(this.onceInAll, this);
		this.once = _.bind(this.once, this);

	};

	var _createTaskInProcess = function(process, taskName, func){
		if(process && !process.tasks){
			process.tasks=[];
		}

		// var task = _createTask();
		// task.func = func;
		// process.tasks.push(task);

		var task = _.find(process.tasks, function(item){
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
		if(_.isFunction(func)){
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
		if(index >-1 && index < this.steps.length){
			this.index = index;
			this.action.apply(this, slice.call(arguments, 1));
		}
		return this;
	};
	// Add process 
	p.add = function(func) {
		if(arguments.length >1){
			_.each(arguments, function(func){
				if(_.isFunction(func)){
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
	};

	return Jumper;
});
