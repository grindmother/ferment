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
        if (item.state() !== 'paused') {
          audioElement.pause()
          currentItem.get().state.set('paused')
        } else {
          audioElement.play()
        }
      } else {
        if (currentItem.get()) {
          audioElement.pause()
          currentItem.get().state.set('paused')
        }

        if (viewingFeed.includes(item)) {
          // switch to this feed instead
          currentFeed.set(viewingFeed.get())
        }

        while (itemReleases.length) {
          itemReleases.pop()()
        }

        item.state.set('waiting')

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
          audioElement.onplaying = () => item.state.set('playing')
          audioElement.onpause = () => item.state.set('paused')
          audioElement.onended = () => {
            currentItem.get().position.set(0)
            self.playNext()
          }
          audioElement.currentTime = item.position() || 0
          audioElement.play()
          currentItem.set(item)
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
    }
  }

  return self
}
