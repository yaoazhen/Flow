// ## Multiple environment support
;(function(name, definition){
	var Jumper = definition(this),
	hasDefine = typeof define === 'function' && define.amd,
	hasExports = typeof moudule !== 'undefined' && moudule.exports;

	if(hasDefine){/*AMD Module*/
		define(Jumper);
	}
	else if(hasExports){/*Node.js Module*/
		moudule.exports = Jumper;
	}
	else{
		/*Assign to common namespaces or simply the global object (window)*/
		this.Jumper = Jumper;
	}
})('Jumper', function(global, undef){
	"use strict";

	var ver = '0.0.1'
	, slice = Array.prototype.slice
	, nativeBind = Function.prototype.bind
	, noop
	, bind
	, isFunction;
	

	if(global.jQuery){
		noop = global.jQuery.noop;
	}
	else{
		noop = function(){};
	}

	if(global._){
		bind = _.bind;
		isFunction = _.isFunction;
	}
	else if(global.jQuery){
		bind = jQuery.proxy;
		isFunction = global.jQuery.isFunction;
	}
	else{
		isFunction = function(obj) {
		    return toString.call(obj) == '[object Function]';
		};
		bind = function(func, context){
			var bound, args;

			if(func.bind === nativeBind && nativeBind){
				return nativeBind.apply(func, slice.call(arguments, 1))
			}

			if(!isFunction(func)){
				throw new TypeError;
			}

			args = slice.call(arguments, 2);
			return bound = function() {
				if(this instanceof bound) {
					noop.prototype = func.prototype;
					var self = new noop();
					var result = func.apply(self, args.concat(slice.call(arguments)));

					if (Object(result) === result){
						return result;
					}
					return self;
				}
				return func.apply(context, args.concat(slice.call(arguments)));
			}
		};
	}

	var Jumper = function(){

	};
});
