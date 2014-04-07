(function() {
    'use strict';

    var __slice = [].slice, __push = [].push, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

    function log() {
        // return;
        if (arguments.length == 1) {
            console.log(window.location.hostname+' - ', arguments[0])
        } else if (arguments.length == 2) {
            console.log(window.location.hostname+' - ', arguments[0], arguments[1])
        } else if (arguments.length === 3) {
            console.log(window.location.hostname+' - ', arguments[0], arguments[1], arguments[2])
        }
    }

    function Event() {
        this.length = 0;
    }

    Event.prototype = {
        slice: __slice,
        indexOf: Array.prototype.indexOf
    }

    Event.prototype.push = function() {
        if (this.triggered) {
            var args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];

            for (var i = 0; i < args.length; i+=1) {
                args[i].apply(null, this.triggered);
            }
        }

        return __push.apply(this, arguments);
    };

    Event.prototype.trigger = function() {
        var args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];

        var len = this.length;

        this.triggered = args;

        for (var i = 0; i < len; i += 1) {
            this[i].apply(null, this.triggered);
        }

        return this;
    }

    function Deferred() {
        this._on_resolved = new Event();
        this._on_rejected = new Event();

        this.then = __bind(this.then, this);
        this.fail = __bind(this.fail, this);
        this.resolve = __bind(this.resolve, this);
        this.reject = __bind(this.reject, this);
    }

    Deferred.prototype.then = function() {
        this._on_resolved.push.apply(this._on_resolved, arguments);
        return this;
    };

    Deferred.prototype.success = Deferred.prototype.then;

    Deferred.prototype.fail = function() {
        this._on_resolved.push.apply(this._on_rejected, arguments);
        return this;
    };

    Deferred.prototype.resolve = function() {
        this._on_resolved.trigger.apply(this._on_resolved, arguments);
        return this;
    };

    Deferred.prototype.reject = function() {
        this._on_rejected.trigger.apply(this._on_rejected, arguments);
        return this;
    };

    Deferred.prototype.promise = function() {
        var _this = this, promise;

        function Promise() {
            this.fail = function fail() {
                _this.fail.apply(_this, arguments);
                return promise;
            }

            this.then = function then() {
                _this.then.apply(_this,arguments);
                return promise;
            }

            this.success = this.then;
        }

        return new Promise();
    };

    var cid=0, promises = {}, channels = [], listening = false;

    function getDeferred() {
        var dfd = new Deferred();

        dfd.cid = ++cid;
        promises[dfd.cid] = dfd;

        return dfd;
    }

    (function() {
        // http://davidwalsh.name/window-iframe
        // Create IE + others compatible event handler
        var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
        var eventer = window[eventMethod];
        var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";
        // Listen to message from child window
        eventer(messageEvent, function(ev) {
            var data;
            if (typeof ev.data !== 'string') return;

            try {
                data = JSON.parse(ev.data);
            } catch(e) {}

            if (data) {
                // log('got data on: ', data);
                for (var i = channels.length - 1; i >= 0; i--) {
                    channels[i].message_callback(ev, data);
                }
            }
        },false);
    })();


    /**
     * [Channel description]
     * @param {[type]} opts [description]
     */
    function Channel(opts) {
        var _this = this;
        opts || (opts = {});

        if (!(window.JSON && window.JSON.stringify && window.JSON.parse)) {
            throw('Must have JSON parsing and stringify');
        }

        if (opts.iframe) {
            opts.window = opts.iframe.contentWindow;

            if (!opts.origin) {
                var src = opts.iframe.src;

                var match = src.match(/^(http(?:s)?:\/\/[\w_\-\.]+(?::\d+)?)\/?/);

                if (match) {
                  opts.origin = match[1];
                }
            }
        }

        this.window = opts.window;

        if (this.window && this.window === window) {
            throw('Cannot send messages to one\'s self');
        }

        this.namespace = opts.namespace ? opts.namespace+':' : '';
        this.origin = opts.origin || '*';

        this.responders = {
            '_method_callback_responder': this._method_callback_responder,
            '_syn': this._syn
        };

        this._on_connected = new Event();
        this._unanswered_calls = {};

        channels.push(this);

        var ack_promise = this.trigger('_syn');

        ack_promise.then(function(ev, resp) {
            if (resp === 'ack') _this._is_connected();
        });
    }

    Channel.prototype.match_origin = function(other_origin) {
        if (this.origin === '*') {
            return true;
        } else {
            return this.origin === other_origin;
        }
    };

    Channel.prototype.message_callback = function(ev, data) {
        var method_name;

        // If a window is defined only listen on that window
        if (this.window && (ev.source !== this.window)) return;
        // If an origin is defined only listen if the origin matches
        if (!this.match_origin(ev.origin)) return;

        // De-namespace the method and make sure it exists
        if (data.method) {
            if (data.method.slice(0, this.namespace.length) === this.namespace) {
                method_name = data.method.slice(this.namespace.length, data.method.length);
            }
        }

        this.call_responder(method_name, ev.source, data);
    };

    Channel.prototype.call_responder = function(method_name, ev, data) {
        var ret, method;
        if (!method_name) return;

        data.args || (data.args = []);

        method = this.responders[method_name];

        if (!method) {
            this._unanswered_calls[method_name] || (this._unanswered_calls[method_name] = []);
            this._unanswered_calls[method_name].push(arguments);
            return;
        }

        if (method_name === '_syn') {
            ret = this._syn();
        } else {
            ret = method.apply(ev, data.args);
        }

        if (data.cid && method_name !== '_method_callback_responder') {
            this.trigger_on_window(this.window || ev.source, '_method_callback_responder', {
                cid_response: data.cid,
                response: ret
            });
        }
    };

    // Since this is being triggerd by message_callback 'this' should be the event;
    Channel.prototype._method_callback_responder = function(data) {
        var ev = this;
        if (data.cid_response && (data.cid_response in promises)) {
            var promise = promises[data.cid_response];

            promise.resolve.call(null, ev, data.response);
        }
    };

    Channel.prototype._syn = function() {
        this._is_connected();
        return 'ack';
    };

    Channel.prototype._is_connected = function() {
        if (this._connected) return;
        this._connected = true;
        this._on_connected.trigger(this);
    };

    Channel.prototype.on_connection = function(cb /*, cb, cb ... */) {
        this._on_connected.push.apply(this._on_connected,arguments);
        return this;
    }

    Channel.prototype.method = function method(method_name) {
        var _this = this;

        var method = function method(/*args*/) {
            var args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];

            args.unshift(method_name);
            return _this.trigger.apply(_this, args);
        }

        return method;
    };

    Channel.prototype.trigger = function trigger(/* method_name, args */) {
        var args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        args.unshift(this.window);
        return this.trigger_on_window.apply(this,args);
    };

    Channel.prototype.trigger_on_window = function trigger_on_window(/* window, method_name, args */) {
        var args, method_name, win;

        win = arguments[0];
        method_name = arguments[1];
        args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];

        var dfd = getDeferred();

        try {
            var data = JSON.stringify({
                method: this.namespace + method_name,
                args: args,
                cid: dfd.cid
            });

            win.postMessage(data, this.origin);
        } catch(e) {
            dfd.reject(e);
        }

        return dfd.promise();
    };

    Channel.prototype.listening_to = function(method_name) {
        return (method_name in this.responders);
    };

    Channel.prototype.on = function(method_name, cb) {
        if (method_name in this.responders) throw('already listening to this method, turn it off first');
        this.responders[method_name] = cb;

        if (this._unanswered_calls[method_name]) {
            var calls = this._unanswered_calls[method_name],
                call;
            delete this._unanswered_calls[method_name];

            for (var i = calls.length - 1; i >= 0; i--) {
                call = calls[i]
                this.call_responder.apply(this, call)
            }
        }
    };

    Channel.prototype.off = function(method_name) {
        if (method_name == '_method_callback_responder') throw('cannot disable the method callback responder');
        delete this.responders[method_name];
    }

    window.Channel = Channel;
})();
