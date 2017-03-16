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
  var hp = 1
  var lastTime = Date.now()

  window.addEventListener('devicemotion', function (e) {
    var gamma = e.rotationRate.gamma
    if (gamma > 10) {
      runtime.setButton(runtime.ccw)
      hp = 1
    } else if (gamma < -10) {
      runtime.setButton(runtime.cw)
      hp = 1
    } else if (Math.abs(gamma) < 3 && hp < 0.9) {
      runtime.setButton(null)
    }
    var now = Date.now()
    hp *= Math.exp((now - lastTime) * -1e-3)
    lastTime = now
  })
}
