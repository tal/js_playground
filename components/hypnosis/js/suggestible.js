(function() {
  var sid = 0, sigs = {};
  function strToFn(str) {
     return new Function("return ("+str+");").call();
  }

  function Suggestible(options) {
    options || (options = {});
    var _this = this;
    this.sid = ++sid;

    sigs[this.sid] = Math.floor(new Date().getTime()/Math.random());

    this.env = options.env || {};

    options.namespace || (options.namespace = '_hypnosis');
    this.channel = new Channel(options);

    this.channel.listen_to('eval', function(data) {
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
    new Suggestible({window: window.top});
  }

  function listen_to_parent_frame() {
    new Suggestible({window: window.parent});
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

    new Suggestible({
      window: win,
      env: {
        iframe: iframe
      }
    });
  }

  this.Suggestible = {
    listen_to_iframe: listen_to_iframe,
    listen_to_top_frame: listen_to_top_frame,
    listen_to_parent_frame: listen_to_parent_frame
  };
}).call(this);
