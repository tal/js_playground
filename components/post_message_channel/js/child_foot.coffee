channel = new Channel(window: window.top);

p = channel.trigger 'test', 1, 2

p.then (ev, resp) ->
  console.log 'promise', resp
  console.log 'promise origin', ev.origin
