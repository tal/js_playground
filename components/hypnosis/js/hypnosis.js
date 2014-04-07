(function() {
  'use strict';
  var __slice = [].slice;

  function Hypnosis(options) {
    options || (options = {});
    options.namespace || (options.namespace = '_hypnosis');

    this.channel = new Channel(options);

    this._eval_send = this.channel.method('eval');
  }

  Hypnosis.prototype.remote_eval = function(/* args..., fn */) {
    var args, fn;
    args = __slice.call(arguments, 0);
    fn = args.pop();

    return this._eval_send({
      fn: fn.toString(),
      args: args
    });
  };

  Hypnosis.prototype.remote_function = function(fn) {
    var _this = this;

    function remote_function() {
      var args = __slice.call(arguments, 0);
      args.push(fn);
      return _this.remote_eval.apply(_this, args);
    }

    return remote_function;
  };

  window.Hypnosis = Hypnosis;
})();
