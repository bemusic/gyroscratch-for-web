function setStatus (text) {
  document.getElementById('status').textContent = text
}

setStatus('Requesting MIDI access')
navigator.requestMIDIAccess({ sysex: false }).then(function (access) {
  ok(access)
}, function () {
  setStatus('No MIDI! :(')
})

function ok (access) {
  var outputPort
  var currentButton = null
  var currentButtonInstance = null

  setStatus('Touch to select MIDI output')
  document.getElementById('status').onclick = click

  function getPorts () {
    var outputs = []
    for (
      var it = access.outputs.keys(), val = it.next();
      !val.done;
      val = it.next()
    ) {
      outputs.push(val.value)
    }
    return outputs.map(function (key) {
      var port = access.outputs.get(key)
      return { key: key, name: port.name, port: port }
    })
  }

  function click (e) {
    e.preventDefault()
    var ports = getPorts()
    var index = (function () {
      for (var i = 0; i < ports.length; i++) {
        if (ports[i].port === outputPort) return (i + 1) % ports.length
      }
      return 0
    })()
    var selectedPort = ports[index]
    if (!selectedPort) return
    var port = selectedPort.port
    setStatus(
      'Use port [' + (1 + index) + '/' + ports.length + '] ' + port.name
    )
    outputPort = port
  }

  function setButton (button) {
    if (button !== currentButton) {
      if (currentButtonInstance) currentButtonInstance.release()
      currentButton = button
      currentButtonInstance = currentButton && currentButton.press(outputPort)
    }
  }

  return appDelegate({
    setButton: setButton,
    ccw: createButton(48, 'red'),
    cw: createButton(47, 'blue')
  })
}

function createButton (note, bg) {
  return {
    press: function (outputPort) {
      var output = outputPort
      document.body.style.background = bg
      if (output) {
        output.send([0x90, note, 127])
      }
      return {
        release: function () {
          document.body.style.background = 'black'
          if (output) {
            output.send([0x80, note, 127])
          }
        }
      }
    }
  }
}

function appDelegate (runtime) {
  var lastAlpha = null
  var value = 0

  window.addEventListener('deviceorientation', function (e) {
    var alpha = e.alpha
    if (lastAlpha == null) {
      lastAlpha = alpha
    }
    var delta = alpha - lastAlpha
    for (var i = 0; i < 10; i++) {
      if (Math.abs(delta - 180) < Math.abs(delta)) delta -= 180
      else if (Math.abs(delta + 180) < Math.abs(delta)) delta += 180
      else break
    }
    value += delta
    lastAlpha = alpha
  })

  var lastTime = 0
  setInterval(
    function () {
      if (value > 1) {
        runtime.setButton(runtime.ccw)
      } else if (value < -1) {
        runtime.setButton(runtime.cw)
      } else {
        runtime.setButton(null)
      }
      var now = Date.now()
      value *= Math.exp((lastTime - now) * 0.01)
      lastTime = now
    },
    1000 / 60
  )
}
