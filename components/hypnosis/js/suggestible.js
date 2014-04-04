(function(exports) {
  var sid = 0, sigs = {};
  function strToFn(str) {
     return new Function("return ("+str+");").call();
  }

  function Suggestible(options) {
    var _this = this;
    this.sid = ++sid;

    sigs[this.sid] = Math.floor(new Date().getTime()/Math.random());

    this.env = options.env || {};

    this.channel = new Channel({
      window: options.window,
      namespace: '_hypnosis',
      origin: options.origin
    });

    this.channel.on('eval', function(data) {
      if (data.fn) {
        var args = data.args || [];
        fn = strToFn(data.fn);
        return fn.apply(_this.env, args);
      } else {
        return false;
      }
    })
  }

  function listen_to_top_frame() {
    new Suggestible({window: window.top})
  }

  function listen_to_iframe(iframe) {
    var win;

    if (iframe.contentWindow) {
      win = iframe.contentWindow;
    } else {
      iframe = document.getElementById(iframe);

      if (iframe) {
        win = iframe.contentWindow;
      }
    }

    if (!win) throw("no content window passed or determined");

    var sug = new Suggestible({window: win});
    sug.env.iframe = iframe;
  }

  exports.Suggestible = {
    listen_to_iframe: listen_to_iframe,
    listen_to_top_frame: listen_to_top_frame
  };
})(window);
