iframe = document.getElementById 'my_iframe'

run = ->
  window.channel = new Channel(namespace: 'test', iframe: iframe);

  channel.on_connection ->
    console.log('parent on on_connection');
    channel.on 'test', ->
      console.log 'hearing test', arguments

      # console.log 'hearing origin', this.origin

      return {resp: 'response'}

setTimeout run, 0
# run()