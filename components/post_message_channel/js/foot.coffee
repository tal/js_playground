iframe = document.getElementById 'my_iframe'

run = ->
  window.channel = new Channel(namespace: 'test');

  channel2 = new Channel(namespace: 'test2');

  channel2.listen_to 'test', ->
    console.log 'hearing test2', arguments
    return {resp: 'response2'}

  channel.on_connection ->
    console.log('parent on on_connection');
    channel.listen_to 'test', ->
      console.log 'hearing test', arguments

      # console.log 'hearing origin', this.origin

      return {resp: 'response'}

setTimeout run, 0