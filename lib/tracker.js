var TorrentTracker = require('bittorrent-tracker/server')
var magnet = require('magnet-uri')
var pull = require('pull-stream')

module.exports = function (sbot, config) {
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

  tracker.address = `ws://${config.host || 'localhost'}:${config.trackerPort}`

  // only allow tracking torrents added by contacts
  pull(
    sbot.createLogStream({ live: true }),
    ofType(['ferment/audio', 'ferment/update']),
    pull.drain((item) => {
      if (item.sync) {
        tracker.listen(config.trackerPort, config.host, (err) => {
          if (err) console.log('Cannot start tracker')
          else console.log(`Tracker started at ${tracker.address}`)
        })
      } else if (item.value && typeof item.value.content.audioSrc === 'string') {
        var torrent = magnet.decode(item.value.content.audioSrc)
        if (torrent.infoHash) {
          torrentWhiteList.add(torrent.infoHash)
        }
      }
    })
  )

  return tracker
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
