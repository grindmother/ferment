process.on('uncaughtException', function (err) {
  console.log(err)

  if (err.code !== 'ENOTFOUND') {
    process.exit()
  }
})

var fs = require('fs')
var Path = require('path')
var createSbot = require('../lib/ssb-server')
var electron = require('electron')
var openWindow = require('../lib/window')

var ssbConfig = require('../lib/ssb-config')('ferment')
var backgroundProcess = require('../models/background-remote')(ssbConfig)

var windows = {}
var context = {
  sbot: createSbot(ssbConfig),
  config: ssbConfig
}

console.log('address:', context.sbot.getAddress())

ssbConfig.manifest = context.sbot.getManifest()
fs.writeFileSync(Path.join(ssbConfig.path, 'manifest.json'), JSON.stringify(ssbConfig.manifest))

electron.app.on('ready', function () {
  windows.background = openWindow(context, Path.join(__dirname, '..', 'background-window.js'), {
    center: true,
    fullscreen: false,
    fullscreenable: false,
    height: 150,
    maximizable: false,
    minimizable: false,
    resizable: false,
    show: true,
    skipTaskbar: true,
    title: 'ferment-background-window',
    useContentSize: true,
    width: 150
  })
  backgroundProcess.target = windows.background
})

// torrent tracker (with whitelist)
