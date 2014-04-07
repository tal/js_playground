Post Message Channel
====================

A wrapper for `postMessage` which makes communication using postmessage a breeze.

A channel is a namespaced event stream which encodes communication via json and allows
for passing data back and forth between windows.

## Usage

To initialize a channel both sides need to create a channel object:

```js
childChannel = new Channel({window: window.top, namespace: 'special', origin: 'http://parent.dev'});
```

You can also pass an iframe which will automatically set the origin to the iframe's src.

```js
parentChannel = new Channel({iframe: document.getElementById('my_iframe'), namespace: 'special'});
```

You don't have to even specify a window or an iframe if you want a channel to only listen.
Such a channel will be unable to spend any messages but will be able to listen to events from
whatever origin is specified and reply.

### Listening

With the channel object you specify methods you want to listen for

```js
var iframe = document.getElementById('my_iframe');
channel.on('resize_iframe', function(width, height) {
  iframe.style.width = width;
  iframe.style.height = height;
});
```

If you want to use iframes to sandbox data you can still pass data back as the response to a
method.

```js
channel.on('get_user_name', function(user_id) {
  var user = Users.get(user_id);

  if (user) {
    return user.name;
  }
});
```

The return of a method gets passed back to the promise created by the event trigger
(explained further later);

### Sending

There are two wasy to send data via a channel:

```js
channel.trigger('resize_iframe', 120, 180);
// is equvalent to
var resize_iframe = channel.method('resize_iframe');
resize_iframe(120,180);
```

The communication can return a result. This result is passed via a promise.

```js
var get_user_name = channel.method('get_user_name');
get_user_name(123).then(function(ev, resp) {
  alert("The user's name is "+resp);
});
```

The promise is passed two arguments, the first is the event object that went along with
the `postMessage`, the second is the response from the method called on the other side.

#### Race conditions

Often if you're dealing with different frames you don't know when the target frame is ready
to listen to messages. Since the channel makes no requirement that a connection is made it
can send messages with no reciever. It's usually a good practice to wrap method calls in the
`on_connection` event.

```js
var channel = new Channel({iframe: my_slow_loading_iframe});

channel.on_connection(function(connection) {
  connection.trigger('resize_iframe', 123, 808);
});
```

If you want you can see if the channel is connected by checking the `connected` parameter on
the connection instance.


TODO
======

* Make a parameter on the channel that forces the channel to wait for a connection to send
any messages