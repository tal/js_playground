iframe = document.getElementById 'my_iframe'

window.channel = new Channel(window: iframe.contentWindow);

channel.on 'test', ->
  console.log 'hearing test', arguments

  console.log 'hearing origin', this.origin

  return {resp: 'response'}
