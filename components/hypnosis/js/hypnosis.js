(function() {
  'use strict';
  var __slice = [].slice;

  function Hypnosis(options) {
    options || (options = {});
    options.namespace || (options.namespace = '_hypnosis');

    this.channel = new Channel(options);
  }

  Hypnosis.prototype.remote_eval = function(/* args..., fn */) {
    var args, fn, _i;
    args = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), fn = arguments[_i++];

    return this.channel.trigger('eval', {
      fn: fn.toString(),
      args: args
    });
  };

  Hypnosis.prototype.remote_function = function(fn) {
    var _this = this;

    function remote_function() {
      var args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      args.push(fn);
      return _this.remote_eval.apply(_this, args);
    }

    return remote_function;
  };

  window.Hypnosis = Hypnosis;
})();
