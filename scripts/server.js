var fs = require('fs')
var Path = require('path')
var createSbot = require('../lib/ssb-server')
var electron = require('electron')
var openWindow = require('../lib/window')
var TorrentTracker = require('bittorrent-tracker/server')
var magnet = require('magnet-uri')
var pull = require('pull-stream')

var ssbConfig = require('../lib/ssb-config')('ferment', {
  host: process.argv[2] || 'localhost',
  trackerPort: 43770
})

var windows = {}
var context = {
  sbot: createSbot(ssbConfig),
  config: ssbConfig
}

ssbConfig.manifest = context.sbot.getManifest()
fs.writeFileSync(Path.join(ssbConfig.path, 'manifest.json'), JSON.stringify(ssbConfig.manifest))

electron.app.on('ready', function () {
  startBackgroundProcess()
})

// torrent tracker (with whitelist)
var torrentWhiteList = new Set()
var tracker = TorrentTracker({
  udp: false,
  http: false,
  stats: false,
  ws: true,
  filter: function (infoHash, params, cb) {
    cb(torrentWhiteList.has(infoHash))
  }
})

pull(
  context.sbot.createLogStream({ live: true }),
  ofType('ferment/audio'),
  pull.drain((item) => {
    if (item.sync) {
      tracker.listen(ssbConfig.trackerPort, ssbConfig.host, (err) => {
        if (err) console.log('Cannot start tracker')
        else console.log(`Tracker started at ws://${ssbConfig.host}:${ssbConfig.trackerPort}`)
      })
    } else if (item.value && typeof item.value.content.audioSrc === 'string') {
      var torrent = magnet.decode(item.value.content.audioSrc)
      if (torrent.infoHash) {
        torrentWhiteList.add(torrent.infoHash)
      }
    }
  })
)

function startBackgroundProcess () {
  windows.background = openWindow(context, Path.join(__dirname, '..', 'background-window.js'), {
    center: true,
    fullscreen: false,
    fullscreenable: false,
    height: 150,
    maximizable: false,
    minimizable: false,
    resizable: false,
    show: false,
    skipTaskbar: true,
    title: 'ferment-background-window',
    useContentSize: true,
    width: 150
  })
}

function ofType (types) {
  types = Array.isArray(types) ? types : [types]
  return pull.filter((item) => {
    if (item.value) {
      return types.includes(item.value.content.type)
    } else {
      return true
    }
  })
}
