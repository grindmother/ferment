var WebTorrent = require('webtorrent')
var electron = require('electron')
var parseTorrent = require('parse-torrent')
var Path = require('path')
var getExt = require('path').extname
var fs = require('fs')
var ipc = electron.ipcRenderer
var watchEvent = require('./lib/watch-event')
var rimraf = require('rimraf')
var MutantDict = require('@mmckegg/mutant/dict')
var MutantStruct = require('@mmckegg/mutant/struct')
var convert = require('./lib/convert')
var TorrentStatus = require('./models/torrent-status')
var Tracker = require('bittorrent-tracker')
var magnet = require('magnet-uri')
var pull = require('pull-stream')
var TrackerServer = require('./lib/tracker')

console.log = electron.remote.getGlobal('console').log
process.exit = electron.remote.app.quit
// redirect errors to stderr
window.addEventListener('error', function (e) {
  e.preventDefault()
  console.error(e.error.stack || 'Uncaught ' + e.error)
})

module.exports = function (client, config) {
  var seedWhiteList = new Set(config.seedWhiteList ? [].concat(config.seedWhiteList) : [client.id])
  var maxSeed = config.maxSeed == null ? 15 : parseInt(config.maxSeed, 10)
  var seedInterval = config.seedInterval == null ? 15 : parseInt(config.seedInterval, 10)

  var tracker = TrackerServer(client, config)
  var announce = new Set()
  announce.add(tracker.address)

  var torrentClient = new WebTorrent()
  var mediaPath = config.mediaPath
  var releases = {}
  var prioritizeReleases = []
  var paused = []

  var allTorrentStats = MutantStruct({
    downloadSpeed: 0,
    uploadSpeed: 0
  }, {nextTick: true})

  var torrentState = MutantDict()

  setInterval(pollStats, 0.5 * 1000)
  setInterval(scrapeInfo, 30 * 1000)
  setInterval(seedRarest, 30 * 60 * 1000)

  seedRarest()
  startAutoSeed()
  findPeers()

  torrentClient.on('torrent', function (torrent) {
    watchTorrent(torrent.infoHash)
  })

  ipc.on('bg-release', function (ev, id) {
    if (releases[id]) {
      var release = releases[id]
      releases[id] = null
      release()
    }
  })

  ipc.on('bg-stream-torrent', (ev, id, torrentId) => {
    unprioritize(true, () => {
      var torrent = torrentClient.get(torrentId)
      if (torrent) {
        streamTorrent(id, torrentId)
      } else {
        addTorrent(torrentId, () => {
          streamTorrent(id, torrentId)
        })
      }
    })

    function streamTorrent (id, torrentId) {
      var torrent = torrentClient.get(torrentId)
      var server = torrent.createServer()
      prioritize(torrentId)
      server.listen(0, function (err) {
        if (err) return ipc.send('bg-response', id, err)
        var port = server.address().port
        var url = 'http://localhost:' + port + '/0'
        ipc.send('bg-response', id, null, url)
      })
      releases[id] = () => {
        server.close()
      }
    }
  })

  ipc.on('bg-export-torrent', (ev, id, torrentId, filePath) => {
    unprioritize(true, () => {
      var torrent = torrentClient.get(torrentId)
      if (torrent) {
        saveFile(id, torrentId, filePath)
      } else {
        addTorrent(torrentId, () => {
          saveFile(id, torrentId, filePath)
        })
      }
    })

    function saveFile (id, torrentId, exportPath) {
      var torrent = torrentClient.get(torrentId)
      torrentState.get(torrent.infoHash).saving.set(true)
      if (torrent.progress === 1) {
        done()
      } else {
        torrent.once('done', done)
      }

      function done () {
        var originalPath = Path.join(getTorrentDataPath(torrent.infoHash), torrent.files[0].path)
        convert.export(originalPath, exportPath, (err, info) => {
          torrentState.get(torrent.infoHash).saving.set(false)
          ipc.send('bg-response', id, err, info)
          console.log(info.toString())
        })
      }
    }
  })

  ipc.on('bg-check-torrent', (ev, id, torrentId) => {
    var torrent = torrentClient.get(torrentId)
    if (torrent) {
      ipc.send('bg-response', id, null)
    } else {
      addTorrent(torrentId, (err) => {
        ipc.send('bg-response', id, err)
      })
    }
  })

  ipc.on('bg-get-all-torrent-state', (ev, id) => {
    ipc.send('bg-response', id, torrentState())
  })

  ipc.on('bg-delete-torrent', (ev, id, torrentId) => {
    var torrentInfo = parseTorrent(torrentId)
    var torrent = torrentClient.get(torrentInfo.infoHash)
    if (torrent) {
      torrent.destroy()
    }

    fs.unlink(getTorrentPath(torrentInfo.infoHash), function () {
      rimraf(getTorrentDataPath(torrentInfo.infoHash), function () {
        console.log('Deleted torrent', torrentInfo.infoHash)
        ipc.send('bg-response', id)
      })
    })
  })

  ipc.on('bg-seed-torrent', (ev, id, infoHash) => {
    var torrent = torrentClient.get(infoHash)
    if (torrent) {
      ipc.send('bg-response', id, null, torrent.magnetURI)
    } else {
      fs.readFile(getTorrentPath(infoHash), function (err, buffer) {
        if (err) return ipc.send('bg-response', id, err)
        var torrent = parseTorrent(buffer)
        torrent.announce = Array.from(announce)
        torrentClient.add(torrent, {
          path: getTorrentDataPath(infoHash)
        }, function (torrent) {
          ipc.send('bg-response', id, null, torrent.magnetURI)
        })
      })
    }
  })

  ipc.send('ipcBackgroundReady', true)

  // scoped

  function watchTorrent (infoHash) {
    if (!torrentState.has(infoHash)) {
      var state = TorrentStatus(infoHash)
      torrentState.put(infoHash, state)
      state(function (value) {
        ipc.send('bg-torrent-status', infoHash, value)
      })
    }
  }

  function scrapeInfo () {
    var keys = torrentState.keys()
    getTorrentInfo(keys, (err, info) => {
      if (err) return console.log(err)
      Object.keys(info).forEach((key) => {
        var state = torrentState.get(key)
        if (state) {
          state.complete.set(info[key].complete)
        }
      })
    })
  }

  function scrapeInfoFor (infoHash) {
    getTorrentInfo(infoHash, (err, info) => {
      if (err) return console.log(err)
      var state = torrentState.get(infoHash)
      if (state && info) {
        state.complete.set(info.complete)
      }
    })
  }

  function pollStats () {
    torrentState.keys().forEach(refreshTorrentState)
    allTorrentStats.downloadSpeed.set(torrentClient.downloadSpeed)
    allTorrentStats.uploadSpeed.set(torrentClient.uploadSpeed)
  }

  function refreshTorrentState (infoHash) {
    var torrent = torrentClient.get(infoHash)
    var state = torrentState.get(infoHash)
    if (torrent) {
      state.progress.set(torrent.progress)
      state.downloadSpeed.set(torrent.downloadSpeed)
      state.uploadSpeed.set(torrent.uploadSpeed)
      state.uploaded.set(torrent.uploaded)
      state.downloaded.set(torrent.downloaded)
      state.numPeers.set(torrent.numPeers)
      state.seeding.set(true)
      state.loading.set(false)
    } else {
      state.seeding.set(false)
    }
  }

  function getTorrentPath (infoHash) {
    return `${getTorrentDataPath(infoHash)}.torrent`
  }

  function getTorrentDataPath (infoHash) {
    return Path.join(mediaPath, `${infoHash}`)
  }

  function addTorrent (torrentId, cb) {
    var torrent = parseTorrent(torrentId)
    var torrentPath = getTorrentPath(torrent.infoHash)
    torrent.announce = Array.from(announce)

    watchTorrent(torrent.infoHash)

    if (torrentClient.get(torrent.infoHash)) {
      cb()
    } else {
      torrentState.get(torrent.infoHash).loading.set(true)
      fs.exists(torrentPath, (exists) => {
        torrentClient.add(exists ? torrentPath : torrent, {
          path: getTorrentDataPath(torrent.infoHash),
          announce: Array.from(announce)
        }, function (torrent) {
          scrapeInfoFor(torrent.infoHash)
          console.log('add torrent', torrent.infoHash)
          if (!exists) fs.writeFile(torrentPath, torrent.torrentFile, cb)
          else cb()
        })
      })
    }
  }

  function getTorrentInfo (infoHashes, cb) {
    if (infoHashes && infoHashes.length) {
      Tracker.scrape({
        announce: config.webtorrent.announceList[0],
        infoHash: infoHashes
      }, function (err, info) {
        if (err) return cb(err)
        if (Array.isArray(infoHashes) && infoHashes.length === 1) info = {[info.infoHash]: info}
        cb(null, info)
      })
    } else {
      cb(null, {})
    }
  }

  function startAutoSeed () {
    client.friends.all((err, graph) => {
      if (err) throw err

      var extendedList = new Set(seedWhiteList)
      Array.from(seedWhiteList).forEach((id) => {
        var moreIds = graph[id]
        if (moreIds) {
          Object.keys(moreIds).forEach(x => extendedList.add(x))
        }
      })

      console.log(`Seeding torrents from: \n - ${Array.from(extendedList).join('\n - ')}`)

      pull(
        client.createLogStream({ live: true, gt: Date.now() }),
        ofType(['ferment/audio', 'ferment/update']),
        pull.drain((item) => {
          if (item.value && typeof item.value.content.audioSrc === 'string') {
            var torrent = magnet.decode(item.value.content.audioSrc)
            if (torrent.infoHash) {
              if (extendedList.has(item.value.author)) {
                fs.exists(Path.join(config.mediaPath, torrent.infoHash + '.torrent'), (exists) => {
                  if (!exists) {
                    if (!torrentClient.get(torrent.infoHash)) {
                      addTorrent(torrent)
                      console.log(`Auto seeding torrent ${torrent.infoHash}`)
                    }
                  }
                })
              }
            }
          }
        })
      )
    })
  }

  function seedRarest () {
    var i = 0
    var items = []
    var localTorrents = []
    fs.readdir(mediaPath, function (err, entries) {
      if (err) throw err
      entries.forEach((name) => {
        if (getExt(name) === '.torrent') {
          localTorrents.push(Path.basename(name, '.torrent'))
        }
      })

      // seed rarest torrents first
      getTorrentInfo(localTorrents, (err, info) => {
        console.log(info)
        if (err) return console.log(err)
        localTorrents.map(infoHash => [infoHash, info[infoHash] && info[infoHash].complete || 0]).sort((a, b) => {
          return (a[1] + Math.random()) - (b[1] + Math.random())
        }).slice(0, maxSeed).forEach((item) => {
          watchTorrent(item[0])
          torrentState.get(item[0]).complete.set(item[1])
          items.push(Path.join(mediaPath, `${item[0]}.torrent`))
        })
        if (items.length) {
          next()
        }
      })
    })

    function next () {
      // don't seed all of the torrents at once, roll out slowly to avoid cpu spike
      var item = items[i]
      setTimeout(function () {
        fs.readFile(item, function (err, buffer) {
          if (!err) {
            var torrent = parseTorrent(buffer)
            if (!torrentClient.get(torrent.infoHash)) {
              torrent.announce = Array.from(announce)
              torrentClient.add(torrent, {
                path: getTorrentDataPath(Path.basename(item, '.torrent'))
              }, function (torrent) {
                console.log('seeding', torrent.infoHash)
                i += 1
                if (i < items.length) next()
              })
            } else {
              next()
            }
          }
        })
        // wait before seeding next file
      }, seedInterval * 1000)
    }
  }

  function unprioritize (restart, cb) {
    while (prioritizeReleases.length) {
      prioritizeReleases.pop()()
    }

    if (paused.length && restart) {
      var remaining = paused.length
      console.log(`restarting ${paused.length} torrent(s)`)
      while (paused.length) {
        var torrentFile = paused.pop()
        var torrent = parseTorrent(torrentFile)
        torrentClient.add(torrent, { path: getTorrentDataPath(torrent.infoHash), announce: Array.from(announce) }, (torrent) => {
          remaining -= 1
          if (remaining === 0) {
            cb && cb()
          }
        })
      }
    } else {
      cb && cb()
    }
  }

  function prioritize (torrentId) {
    var torrent = torrentClient.get(torrentId)
    torrent.critical(0, Math.floor(torrent.pieces.length / 8))
    if (torrent.progress < 0.5) {
      torrentClient.torrents.forEach(function (t) {
        if (t !== torrent && t.progress < 0.9) {
          paused.push(t.torrentFile)
          t.destroy()
        }
      })

      console.log(`pausing ${paused.length} torrent(s)`)

      prioritizeReleases.push(watchEvent(torrent, 'download', () => {
        if (torrent.progress > 0.8) {
          unprioritize(true)
        }
      }))
    }
  }

  function findPeers () {
    setInterval(() => {
      client.gossip.peers((err, peers) => {
        if (err) return console.error(err)
        peers.filter(x => x.state === 'connected').forEach(function (peer) {
          if (peer.port === config.port && peer.host === '10.0.1.9') {
            announce.add(`ws://${peer.host}:${config.trackerPort}`)
          }
        })
      })
    }, 5000)
  }
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
