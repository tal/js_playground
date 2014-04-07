run = ->
  window.channel = new Channel(window: window.top, namespace: 'test');

  channel2 = new Channel(window: window.top, namespace: 'test2');

  p = channel2.trigger 'test', 4,5
  p.then (ev, resp) ->
    console.log 'promise2', resp

  channel.on_connection ->
    console.log('child on on_connection');
    p = channel.trigger 'test', 1, 2

    p.then (ev, resp) ->
      console.log 'promise', resp
      # console.log 'promise origin', ev.origin

setTimeout run, 0