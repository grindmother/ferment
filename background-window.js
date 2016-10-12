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
var convert = require('./lib/convert')

console.log = electron.remote.getGlobal('console').log
process.exit = electron.remote.app.quit
// redirect errors to stderr
window.addEventListener('error', function (e) {
  e.preventDefault()
  console.error(e.error.stack || 'Uncaught ' + e.error)
})

module.exports = function (client, config) {
  var announce = config.webtorrent.announceList
  var torrentClient = new WebTorrent()
  var mediaPath = config.mediaPath
  var releases = {}
  var prioritizeReleases = []
  var paused = []
  var torrentState = MutantDict()

  setInterval(pollStats, 5000)

  startSeeding()

  torrentClient.on('torrent', function (torrent) {
    var updating = false
    var timer = null

    torrent.releases = [
      watchEvent(torrent, 'download', update),
      watchEvent(torrent, 'upload', update),
      watchEvent(torrent, 'done', update),
      watchEvent(torrent, 'wire', update),
      watchEvent(torrent, 'noPeers', update)
    ]

    update()

    function update () {
      if (!updating) {
        updating = true
        setTimeout(updateNow, 500)
      }
    }

    function updateNow () {
      if (torrentClient.torrents.includes(torrent)) {
        clearTimeout(timer)
        updating = false
        var state = {
          progress: torrent.progress,
          downloadSpeed: torrent.downloadSpeed,
          uploadSpeed: torrent.uploadSpeed,
          numPeers: torrent.numPeers,
          downloaded: torrent.downloaded,
          uploaded: torrent.uploaded,
          loading: false
        }
        broadcastTorrentState(torrent.infoHash, state)
        timer = setTimeout(updateNow, 1000)
      }
    }
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

    function saveFile (id, torrentId, filePath) {
      var torrent = torrentClient.get(torrentId)
      torrent.files[0].createReadStream(0).pipe(convert.export(filePath, (err, info) => {
        ipc.send('bg-response', id, err, info)
        console.log(info)
      }))
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
        broadcastTorrentState(torrentInfo.infoHash, { loading: true })
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
        torrent.announce = announce.slice()
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

  function broadcastTorrentState (infoHash, state) {
    torrentState.put(infoHash, state)
    ipc.send('bg-torrent-status', infoHash, state)
  }

  function pollStats () {
    ipc.send('bg-global-torrent-status', {
      progress: torrentClient.progress,
      down: torrentClient.downloadSpeed,
      up: torrentClient.uploadSpeed
    })
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
    torrent.announce = announce.slice()

    if (torrentClient.get(torrent.infoHash)) {
      cb()
    } else {
      fs.exists(torrentPath, (exists) => {
        torrentClient.add(exists ? torrentPath : torrent, {
          path: getTorrentDataPath(torrent.infoHash),
          announce
        }, function (torrent) {
          console.log('add torrent', torrent.infoHash)
          if (!exists) fs.writeFile(torrentPath, torrent.torrentFile, cb)
          else cb()
        })
      })
    }
  }

  function startSeeding () {
    var i = 0
    var items = []
    fs.readdir(mediaPath, function (err, entries) {
      if (err) throw err
      entries.forEach((name) => {
        if (getExt(name) === '.torrent') {
          items.push(Path.join(mediaPath, name))
        }
      })

      // make sure the same torrents aren't being seeded every time
      shuffle(items)
      next()
    })

    function next () {
      // don't seed all of the torrents at once, roll out slowly to avoid cpu spike
      var item = items[i]
      setTimeout(function () {
        fs.readFile(item, function (err, buffer) {
          if (!err) {
            var torrent = parseTorrent(buffer)
            torrent.announce = announce.slice()
            torrentClient.add(torrent, {
              path: getTorrentDataPath(Path.basename(item, '.torrent'))
            }, function (torrent) {
              console.log('seeding', torrent.infoHash)
              i += 1
              if (i < items.length) next()
            })
          }
        })
        // wait 15 seconds before seeding next file
      }, 15000)
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
        torrentClient.add(torrent, { path: getTorrentDataPath(torrent.infoHash), announce }, (torrent) => {
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
          broadcastTorrentState(torrent.infoHash, {
            paused: true
          })
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
}

function shuffle (array) {
  var currentIndex = array.length
  while (currentIndex !== 0) {
    var randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1
    var temporaryValue = array[currentIndex]
    array[currentIndex] = array[randomIndex]
    array[randomIndex] = temporaryValue
  }
  return array
}
