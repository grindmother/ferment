var Path = require('path')
var fs = require('fs')
var ssbKeys = require('ssb-keys')
var extend = require('xtend')

module.exports = function (appName, opts) {
  var ssbConfig = require('ssb-config/inject')(appName, extend({
    port: 43761,
    trackerPort: 43770,
    blobsPort: 1024 + (~~(Math.random() * (65536 - 1024))),
    webtorrent: {
      announceList: [
        [ 'udp://tracker.openbittorrent.com:80' ],
        [ 'udp://tracker.internetwarriors.net:1337' ],
        [ 'udp://tracker.leechers-paradise.org:6969' ],
        [ 'udp://tracker.coppersurfer.tk:6969' ],
        [ 'udp://exodus.desync.com:6969' ],
        [ 'wss://tracker.btorrent.xyz' ],
        [ 'wss://tracker.openwebtorrent.com' ],
        [ 'wss://tracker.fastcast.nz' ],
        [ 'ws://pub.ferment.audio:43770' ]
      ]
    },
    friends: {
      scope: 'ferment'
    }
  }, opts))

  ssbConfig.mediaPath = Path.join(ssbConfig.path, 'media')
  ssbConfig.keys = ssbKeys.loadOrCreateSync(Path.join(ssbConfig.path, 'secret'))

  if (!fs.existsSync(ssbConfig.mediaPath)) {
    fs.mkdirSync(ssbConfig.mediaPath)
  }

  return ssbConfig
}
