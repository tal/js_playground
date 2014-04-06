run = ->
  window.channel = new Channel(window: window.top, namespace: 'test');

  channel.on_connection ->
    console.log('child on on_connection');
    p = channel.trigger 'test', 1, 2

    p.then (ev, resp) ->
      console.log 'promise', resp
      console.log 'promise origin', ev.origin

# setTimeout run, 1000
run()