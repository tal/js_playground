iframe = document.getElementById 'parent_if'

hyp = new Hypnosis(iframe: iframe)

window.hyp = hyp

window.test = hyp.remote_function (color) ->
  title = document.getElementById('title')
  console.log('setting color:', color);
  title.style.color = color

  if this.last_call_at
    console.log('time since last run', new Date() - this.last_call_at);
  else
    console.log('first run')

  this.last_call_at = new Date();
  # title.innerText = "I just set you #{(new Date()).toString()}";
  return new Date().getTime();

test('red')
test('blue').then (ev, ran_at) ->
  console.log "blue was set at", ran_at

hyp.on_hypnotized ->
  setTimeout ->
    test('purple')
  , 1000