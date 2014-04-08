/**
 *
 *  Upon creation of the channel it will send a syn request to the other side of the channel.
 *  In this case there's no other channel listening yet so no response has been given.
 * ⌈------------------⌉
 * |      Parent      |     syn
 * |      Channel     |  --------->
 * ⌊------------------⌋
 *
 *  If no connection has been made the channel queues up any messages to be sent waiting
 *  for a connection.
 *
 *  When a channel is made in the child frame it will send a syn of its own.
 *  Once a syn is heard an ack is sent back and both sides mark themselves as
 *  connected any queued messages will be sent.
 *
 * ⌈------------------⌉            ⌈------------------⌉
 * |      Parent      |   syn      |       Child      |
 * |      Channel     | ---------> |      Channel     |
 * |                  |      ack   |                  |
 * |                  | <--------- |                  |
 * |                  |   msg      |                  |
 * |                  | ---------> |                  |
 * |                  |   msg      |                  |
 * |                  | ---------> |                  |
 * |                  |       rsp  |                  |
 * |                  | <--------- |                  |
 * |                  |       rsp  |                  |
 * |                  | <--------- |                  |
 * |                  |            |                  |
 * ⌊------------------⌋            ⌊------------------⌋
 */

(function() {
    'use strict';

    var JSON = window.JSON;

    /**
     * If not apropriate json object then try to get JSON from a clean window
     * built from an iframe.
     *
     * Some old frameworks include their own incompatible JSON libraries, lookin
     * at you mootools.
     */
    if (!(JSON && JSON.stringify)) {
        var iframe = document.createElement('iframe');
        document.body.appendChild(iframe);

        JSON = iframe.contentWindow.JSON;

        document.body.removeChild(iframe);
    }

    var __slice = [].slice, __push = [].push, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

    function log() {
        // return;
        if (arguments.length == 1) {
            console.log(window.location.hostname+' - ', arguments[0])
        } else if (arguments.length == 2) {
            console.log(window.location.hostname+' - ', arguments[0], arguments[1])
        } else if (arguments.length === 3) {
            console.log(window.location.hostname+' - ', arguments[0], arguments[1], arguments[2])
        } else if (arguments.length === 4) {
            console.log(window.location.hostname+' - ', arguments[0], arguments[1], arguments[2], arguments[3])
        }
    }

    /**
     * A single fire event. Just an array which when you trigger will pass all
     * arguments to any functions added into the array. If the event has already
     * been triggered any new functions added will also be run immediatly upon
     * being added.
     *
     * @constructor
     */
    function Event() {
        this.length = 0;
    }

    Event.prototype = {
        slice: __slice,
        indexOf: Array.prototype.indexOf
    }

    Event.prototype.push = function() {
        if (this.triggered_with) {
            var args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];

            for (var i = 0; i < args.length; i+=1) {
                args[i].apply(null, this.triggered_with);
            }
        }

        return __push.apply(this, arguments);
    };

    Event.prototype.trigger = function() {
        var args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];

        var len = this.length;

        this.triggered_with = args;

        for (var i = 0; i < len; i += 1) {
            this[i].apply(null, this.triggered_with);
        }

        return this;
    }


    /**
     * Special deferred object which behaves somewhat similar to jQuery's
     * deferred object.
     *
     * It's limitations are that it doesn't allow chaining like most deferred.
     *
     * Basically it just has fail/resolved events that one of which can be triggered.
     *
     * @constructor
     */
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
        if (this.resolved || this.rejected) return;
        this._on_resolved.trigger.apply(this._on_resolved, arguments);
        this.resolved = true;
        return this;
    };

    Deferred.prototype.reject = function() {
        if (this.resolved || this.rejected) return;
        this._on_rejected.trigger.apply(this._on_rejected, arguments);
        this.rejected = true;
        return this;
    };

    Deferred.prototype.reject_timeout = function() {
        var args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        var time = args.shift();

        setTimeout(__bind(function() {
            this.reject.apply(this,args);
        }, this), time);

        return this;
    }

    Deferred.prototype.promise = function() {
        var _this = this;

        function Promise() {
            var promise = this;

            this.fail = function fail() {
                _this.fail.apply(_this, arguments);
                return promise;
            }

            this.then = function then() {
                _this.then.apply(_this,arguments);
                return promise;
            }

            this.success = this.then;

            this.reject_timeout = function reject_timeout() {
                _this.reject_timeout.apply(_this, arguments);
                return promise;
            }

            this.cid = _this.cid;
        }

        return new Promise();
    };

    /**
     * Running index for promises to keep them unique.
     * Short for callback id
     * @type {Number}
     */
    var cid=0;

    /**
     * All the promises for responses indexed by cid
     * @type {Object}
     */

    var promises = {};
    /**
     * An array of all channels generated so the postMessage can send to all
     * @type {Array}
     */
    var channels = [];

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
                // log('got data on: ', data, channels.length);
                for (var i = channels.length - 1; i >= 0; i--) {
                    channels[i].message_callback(ev, data);
                }
            }
        },false);
    })();

    /**
     * @constructor
     *
     * @param {Object} opts
     * @param {Window} opts.window    Window to send and recieve messages. If not
     *                                set the channel can only respond.
     *
     *                                Be careful if no window is set a syn is not sent
     *                                so if the channel with no window is opened last
     *                                it can't ack and no automatic connection will be
     *                                made.
     * @param {String} opts.namespace Namespace for methods sent and recieved
     * @param {iframe} opts.iframe    If you pass an iframe object it will set
     *                                the window and origin parameter based on the iframe
     * @param {String} otps.origin    Domain to send and recieve messages from eg "https://foo.bar"
     */
    function Channel(opts) {
        opts || (opts = {});

        if (!(JSON && JSON.stringify && JSON.parse)) {
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

        this.namespace = opts.namespace ? opts.namespace+':' : '';
        this.origin = opts.origin || '*';

        this.responders = {
            '_method_callback_responder': _method_callback_responder,
            '_syn': __bind(this._syn, this)
        };

        this._on_connected = new Event();

        // Used to store any messgaes sent to channel but haven't yet
        // had a response bound to them.
        this._unanswered_calls = {};

        // After we've connected makes all post messages send to the other window
        this.on_connection(__bind(this.enable_sending_post_message, this));

        channels.push(this);

        if (this.window) {
            var ack_promise = this.send('_syn');

            ack_promise.then(__bind(function(ev, resp) {
                if (resp === 'ack') this._is_connected();
            }, this));
        }
    }

    /**
     * @param  {String} other_origin
     * @return {Boolean}
     */
    Channel.prototype.match_origin = function(other_origin) {
        if (this.origin === '*') {
            return true;
        } else {
            return this.origin === other_origin;
        }
    };

    /**
     * Handles incoming postMessage, does security checks to make sure that this
     * channel should handle the response. All postmessages to this window
     * get routed though this method.
     *
     * @param  {Event}  ev   postMessage Event
     * @param  {Object} data Data passed from other window
     */
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

        this.call_responder(method_name, ev, data);
    };

    /**
     * handles invoking responders or deferring the call until a responder is bound
     * @param  {String} method_name
     * @param  {Event}  ev          postMessage event
     * @param  {Object} data        Data passed from other window
     */
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

        ret = method.apply(ev, data.args);

        if (data.cid && method_name !== '_method_callback_responder') {
            this.send_to_window(ev.source, '_method_callback_responder', {
                cid_response: data.cid,
                response: ret
            });
        }
    };

    // Since this is being triggerd by message_callback 'this' should be the event;
    /**
     * Method resposible for handling response from a message to other window.
     * Recieves the callback id that was passed and finds that promise and resolves
     * it with the response given.
     *
     * @param  {Object} data
     */
    function _method_callback_responder(data) {
        var ev = this;
        if (data.cid_response && (data.cid_response in promises)) {
            var promise = promises[data.cid_response];

            promise.resolve.call(null, ev, data.response);
        }
    };

    /**
     * Method for handling what the syn method should do, unlike most responders
     * is bound to channel.
     *
     * @return {[type]} [description]
     */
    Channel.prototype._syn = function() {
        this._is_connected();
        return 'ack';
    };

    /**
     * Sets the channel to be connected and fires the callbacks associated with
     * that action
     *
     * @private
     */
    Channel.prototype._is_connected = function() {
        if (this.connected) return;
        this.connected = true;
        this._on_connected.trigger(this);
    };

    /**
     * Add a callback to the connection event. Fired when a connection has been
     * confirmed.
     *
     * @param  {Function} cb [description]
     * @return {Connection}
     */
    Channel.prototype.on_connection = function(cb /*, cb, cb ... */) {
        this._on_connected.push.apply(this._on_connected,arguments);
        return this;
    };

    /**
     * Builds a function which will call the method across the channel.
     * The returned function can be invoked and all arguments passed will
     * be sent to the responder on the other window.
     *
     * When invoked the returned function returns a promise that will resolve
     * with the result of the invocation on the other window.
     *
     * @param  {String} method_name [description]
     * @return {Function}
     */
    Channel.prototype.method = function method(method_name) {
        var _this = this;

        var method = function method(/*args*/) {
            var args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];

            args.unshift(method_name);
            return _this.send.apply(_this, args);
        }

        return method;
    };

    /**
     * Sends a message to the window specified on the channel.
     *
     * @throws If the channel has no window
     *
     * @param {Window} win         window to send the messages to
     * @param {String} method_name the method name to attempt to invoke on the other side
     *                             of the channel
     * @param {Object} args...     Arguments to pass to the invocation of the method on
     *                             the other side of the channel
     *
     * @return {Promise} A promise that will be completed upon the return of the message
     *                     from the channel
     */
    Channel.prototype.send = function send(/* method_name, args */) {
        if (!this.window) throw('no window specified on channel');
        var args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        args.unshift(this.window);
        return this.send_to_window.apply(this,args);
    };

    /**
     * Sends a message to a specific window
     *
     * @param {Window} win         window to send the messages to
     * @param {String} method_name the method name to attempt to invoke on the other side
     *                             of the channel
     * @param {Object} args...     Arguments to pass to the invocation of the method on
     *                             the other side of the channel
     * @return {Promise} A promise that will be completed upon the return of the message
     *                     from the channel
     */
    Channel.prototype.send_to_window = function send_to_window(/* window, method_name, args */) {
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

            // If it is one of the system methods always send it along regardless
            if (method_name === '_syn' || method_name === '_method_callback_responder') {
                send_post_message.call(this, win, data);
            } else {
                this.send_post_message(win,data);
            }
        } catch(e) {
            dfd.reject(e);
        }

        return dfd.promise();
    };

    /**
     * The message actually for sending the post message to the other window
     * this is not set by default because by default until the connection is made
     * all sent messages get queued up to be sent once connection is made.
     *
     * @param  {Window} win    window to send the messages to
     * @param  {String} data   stringified data to be sent
     * @param  {String} origin hostname to send the data to, defaults to this.origin
     */
    function send_post_message(win, data, origin) {
        origin || (origin = this.origin);

        win.postMessage(data, origin);
    }

    /**
     * Actually responsible for sending post messages, initially set up to be a queue
     * for messages that can't be sent until connection is made
     *
     * @param  {Window} win    window to send the messages to
     * @param  {String} data   stringified data to be sent
     * @param  {String} origin hostname to send the data to, defaults to this.origin
     */
    Channel.prototype.send_post_message = function delay_sending_post_message(/* win, data, origin */) {
        this._delayed_sent_messages || (this._delayed_sent_messages = []);

        this._delayed_sent_messages.push(arguments);
    };

    /**
     * Upon initialization the channel won't send any messages until a connection
     * is confirmed, upon connection this method is invoked allowing future postMessagse
     * to be sent and then invoking all queued messages.
     *
     * Call this method manually to force messages to be sent regardless of connection state
     */
    Channel.prototype.enable_sending_post_message = function() {
        this.send_post_message = send_post_message;

        if (this._delayed_sent_messages) {
            for (var i = 0; i < this._delayed_sent_messages.length; i+=1) {
                send_post_message.apply(this, this._delayed_sent_messages[i]);
            }

            delete this._delayed_sent_messages;
        }
    };

    /**
     * Is this channel listening to this method
     *
     * @param  {String} method_name the method name to check
     * @return {Bool}
     */
    Channel.prototype.listening_to = function(method_name) {
        return (method_name in this.responders);
    };

    /**
     * Bind a method to handle a particular message being sent. Only one function can
     * be bound to any given method name at any given time.
     *
     * The function for handling the method can return any object that can be JSON
     * stringified.
     *
     * @param  {String}   method_name
     * @param  {Function} cb
     */
    Channel.prototype.listen_to = function(method_name, cb) {

        if (!cb) {
            var events = method_name;
            for (method_name in events) {
                if (events.hasOwnProperty(method_name)) {
                    this.listen_to(method_name, events[method_name]);
                }
            }
            return;
        }

        if (method_name in this.responders) throw('already listening to this method, turn it off first');
        this.responders[method_name] = cb;

        if (this._unanswered_calls[method_name]) {
            var calls = this._unanswered_calls[method_name],
                call;
            delete this._unanswered_calls[method_name];

            for (var i = 0; i < calls.length; i+=1) {
                call = calls[i]
                this.call_responder.apply(this, call);
            }
        }
    };

    /**
     * Stops the channel from responding to a particular method from this moment on. Any
     * messages sent to this method will be queued and run once the method is listened
     * to again.
     *
     * @param  {String} method_name
     */
    Channel.prototype.stop_listen_to = function(method_name) {
        if (method_name == '_method_callback_responder') throw('cannot disable the method callback responder');
        delete this.responders[method_name];
    }

    window.Channel = Channel;
})();
