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
var TorrentTracker = require('bittorrent-tracker/server')
var magnet = require('magnet-uri')
var pull = require('pull-stream')

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
var torrentWhiteList = new Set()
var tracker = TorrentTracker({
  udp: true,
  http: false,
  stats: false,
  ws: true,
  filter (infoHash, params, cb) {
    cb(torrentWhiteList.has(infoHash))
  }
})

// only allow tracking torrents added by contacts
electron.ipcMain.once('ipcBackgroundReady', (e) => {
  pull(
    context.sbot.createLogStream({ live: true }),
    ofType(['ferment/audio', 'ferment/update']),
    pull.drain((item) => {
      if (item.sync) {
        tracker.listen(ssbConfig.trackerPort, ssbConfig.host, (err) => {
          if (err) console.log('Cannot start tracker')
          else console.log(`Tracker started at ws://${ssbConfig.host || 'localhost'}:${ssbConfig.trackerPort}`)
        })
      } else if (item.value && typeof item.value.content.audioSrc === 'string') {
        var torrent = magnet.decode(item.value.content.audioSrc)
        if (torrent.infoHash) {
          torrentWhiteList.add(torrent.infoHash)
        }
      }
    })
  )
})

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
