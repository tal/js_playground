(function($) {
    var __slice = [].slice, cid=0, promises = {}, channels = [], listening = false;

    function getDeferred() {
        var dfd = new $.Deferred();

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
        var _this = this;
        eventer(messageEvent, function(ev) {
            var data;
            if (typeof ev.data !== 'string') return;

            try {
                data = JSON.parse(ev.data);
            } catch(e) {}

            if (data) {
                for (var i = channels.length - 1; i >= 0; i--) {
                    channels[i].messageCallback(ev, data);
                }
            }
        },false);
    })();

    function Channel(opts) {
        if (!(window.JSON && window.JSON.stringify && window.JSON.parse)) {
            throw('Must have JSON parsing and stringify');
        }

        this.window = opts.window;

        if (this.window === window) {
            throw('Cannot send messages to ones self');
        }

        this.namespace = opts.namespace || '';
        this.origin = opts.origin || '*';

        this.responders = {
            '_method_callback': this._method_callback
        };

        channels.push(this);
    }

    Channel.prototype.messageCallback = function(ev, data) {
        var method;

        if (data.method) {
            if (data.method.slice(0, this.namespace.length) === this.namespace) {
                method = data.method.slice(this.namespace.length, data.method.length);
            }
        }

        if (method && (method in this.responders)) {
            var args = data.args || [];
            var method = this.responders[method];

            var ret = method.apply(ev, args);

            if (method !== '_method_callback' && data.cid && typeof ret !== "undefined") {
                this.trigger('_method_callback', {
                    cid_response: data.cid,
                    response: ret
                });
            }
        }
    };

    // Since this is being triggerd by messageCallback 'this' should be the event;
    Channel.prototype._method_callback = function(data) {
        var ev = this;
        if (data.cid_response && (data.cid_response in promises)) {
            var promise = promises[data.cid_response];

            promise.resolve.call(ev, ev, data.response);
        }
    };

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
        var args, method_name;
        method_name = arguments[0];
        args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];

        var dfd = getDeferred();

        var data = JSON.stringify({
            method: this.namespace + method_name,
            args: args,
            cid: dfd.cid
        });

        this.window.postMessage(data, this.origin);

        return dfd.promise();
    };

    Channel.prototype.on = function(method_name, cb) {
        if (method_name in this.responders) console.warn(method_name+' is already in the responders object, you\'re overriding');
        this.responders[method_name] = cb;
    };

    Channel.prototype.off = function(method_name) {
        delete this.responders[method_name];
    }

    window.Channel = Channel;
})(jQuery);
