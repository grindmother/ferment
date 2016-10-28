var h = require('../lib/h')
var Proxy = require('@mmckegg/mutant/proxy')
var ProxyCollection = require('@mmckegg/mutant/proxy-collection')

module.exports = Player

function Player (context) {
  var currentItem = Proxy()
  var currentFeed = ProxyCollection()
  var viewingFeed = ProxyCollection()
  var audioElement = h('audio', { controls: true })
  var itemReleases = []

  var self = {
    context,
    currentItem,
    currentFeed,
    audioElement,
    viewingFeed,

    togglePlay (item) {
      if (currentItem.get() === item || !item) {
        if (currentItem.get().state() !== 'paused') {
          audioElement.pause()
          currentItem.get().state.set('paused')
        } else {
          audioElement.play()
        }
      } else {
        if (currentItem.get()) {
          currentItem.get().state.set('paused')
          audioElement.pause()
        }

        if (viewingFeed.includes(item)) {
          // switch to this feed instead
          currentFeed.set(viewingFeed.get())
        }

        currentItem.set(item)

        while (itemReleases.length) {
          itemReleases.pop()()
        }

        item.state.set('waiting')

        var giveUpTimer = setTimeout(function () {
          if (item.state() === 'waiting' && currentItem.get() === item) {
            self.playNext()
          }
        }, 30 * 1000)

        itemReleases.push(context.background.stream(item.audioSrc(), (err, url) => {
          if (err) throw err
          var cuedNext = false
          audioElement.src = url
          audioElement.ontimeupdate = function (e) {
            item.position.set(e.target.currentTime)
            if (!cuedNext && e.target.duration > 0 && e.target.currentTime > e.target.duration / 2) {
              self.cueNext()
            }
          }
          audioElement.onwaiting = () => item.state.set('waiting')
          audioElement.onplaying = () => {
            clearTimeout(giveUpTimer)
            item.state.set('playing')
          }
          audioElement.onpause = () => item.state.set('paused')
          audioElement.onended = () => {
            currentItem.get().position.set(0)
            self.playNext()
          }
          audioElement.currentTime = item.position() || 0
          audioElement.play()
        }))
      }
    },

    playNext () {
      var next = self.getNext()
      if (next) {
        next.position.set(0)
        self.togglePlay(next)
      }
    },

    cueNext () {
      var next = self.getNext()
      if (next) {
        context.background.checkTorrent(next.audioSrc())
      }
    },

    getNext () {
      // check viewing feed for the current song. If it's there, play from this feed instead
      var index = viewingFeed.indexOf(currentItem.get())
      var next = index >= 0 ? viewingFeed.get(index + 1) : null
      if (!next) {
        // otherwise fallback to main feed
        index = currentFeed.indexOf(currentItem.get())
        next = index >= 0 ? currentFeed.get(index + 1) : null
      }
      return next
    },

    playPrevious () {
      var previous = self.getPrevious()
      if (previous) {
        previous.position.set(0)
        self.togglePlay(previous)
      }
    },

    cuePrevious () {
      var previous = self.getPrevious()
      if (previous) {
        context.background.checkTorrent(previous.audioSrc())
      }
    },

    getPrevious () {
      // check viewing feed for the current song. If it's there, play from this feed instead
      var index = viewingFeed.indexOf(currentItem.get())
      var previous = index > 0 ? viewingFeed.get(index - 1) : null
      if (!previous) {
        // otherwise fallback to main feed
        index = currentFeed.indexOf(currentItem.get())
        previous = index > 0 ? currentFeed.get(index - 1) : null
      }
      return previous
    }
  }

  return self
}
