var electron = require('electron')
var seq = Date.now()
var ipc = electron.ipcRenderer || electron.ipcMain
var Value = require('@mmckegg/mutant/value')
var TorrentStatus = require('./torrent-status')
var MutantDict = require('@mmckegg/mutant/dict')

var callbacks = {}
ipc.on('bg-response', function (ev, id, ...args) {
  var cb = callbacks[id]
  if (cb) {
    delete callbacks[id]
    cb(...args)
  }
})

var torrentLookup = MutantDict()
ipc.on('bg-torrent-status', function (ev, infoHash, status) {
  var target = getTorrentStatus(infoHash)
  target.set(status)
})

function getTorrentStatus (infoHash) {
  var target = torrentLookup.get(infoHash)
  if (!target) {
    target = TorrentStatus(infoHash)
    torrentLookup.put(infoHash, target)
  }
  return target
}

var stats = Value({})
ipc.on('bg-global-torrent-status', function (ev, value) {
  stats.set(value)
})

module.exports = function (config) {
  var self = {
    target: ipc,
    stats,

    stream (torrentId, cb) {
      var id = seq++
      callbacks[id] = cb
      self.target.send('bg-stream-torrent', id, torrentId)
      return () => {
        self.target.send('bg-release', id)
      }
    },

    seedTorrent (infoHash, cb) {
      var id = seq++
      callbacks[id] = cb
      self.target.send('bg-seed-torrent', id, infoHash)
    },

    checkTorrent (torrentId, cb) {
      var id = seq++
      callbacks[id] = cb
      self.target.send('bg-check-torrent', id, torrentId)
    },

    deleteTorrent (torrentId, cb) {
      var id = seq++
      callbacks[id] = cb
      self.target.send('bg-delete-torrent', id, torrentId)
    },

    getAllTorrentState (cb) {
      var id = seq++
      callbacks[id] = cb
      self.target.send('bg-get-all-torrent-state', id)
    },

    getTorrentStatus
  }

  self.getAllTorrentState((state) => {
    console.log(state)
    Object.keys(state).forEach(key => getTorrentStatus(key).set(state[key]))
  })

  return self
}
