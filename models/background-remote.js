var electron = require('electron')
var seq = Date.now()
var ipc = electron.ipcRenderer || electron.ipcMain

var callbacks = {}
ipc.on('bg-response', function (ev, id, ...args) {
  var cb = callbacks[id]
  if (cb) {
    delete callbacks[id]
    cb(...args)
  }
})

var listeners = {}
ipc.on('bg-multi-response', function (ev, id, ...args) {
  var listener = listeners[id]
  if (listener) {
    listener(...args)
  }
})

module.exports = function (config) {
  var self = {
    target: ipc,

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

    subscribeProgress (torrentId, listener) {
      var id = seq++
      listeners[id] = listener
      self.target.send('bg-subscribe-progress', id, torrentId)
      return () => {
        delete listeners[id]
        self.target.send('bg-release', id)
      }
    }
  }

  return self
}
