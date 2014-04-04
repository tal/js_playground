iframe = document.getElementById 'my_iframe'

window.channel = new Channel(namespace: 'test');

channel.on 'test', ->
  console.log 'hearing test', arguments

  console.log 'hearing origin', this.origin

  return {resp: 'response'}
