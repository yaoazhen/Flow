var buster = require("buster"),
  Jumper   = require("../jumper");


var assert = buster.assert;
// Expose describe and it functions globally
buster.spec.expose();

describe("Jumper is a constructor", function(){
  before(function(){
    this.jumper = new Jumper();
  });

  it('should be a function', function(){
    assert.isFunction(Jumper);
  });

  it('should be instantiatable', function(){
    assert.isObject(this.jumper);
    assert(this.jumper instanceof(Jumper));
  });
});