var ProfileView = require('../views/profile')
var h = require('../lib/h')
var http = require('http')
var styles = require('../styles')
var URL = require('url')
var extend = require('xtend')
var when = require('@mmckegg/mutant/when')
var ServeBlobs = require('../lib/serve-blobs')
var computed = require('@mmckegg/mutant/computed')
var toCollection = require('@mmckegg/mutant/dict-to-collection')
var lookup = require('@mmckegg/mutant/lookup')
var resolve = require('@mmckegg/mutant/resolve')
var ServeWebSeeds = require('./serve-web-seeds')

module.exports = function (client, config) {
  config = extend(config, {
    blobsPrefix: '/~blobs'
  })

  var api = require('../api')(client, config)
  var profile = api.getOwnProfile()

  var context = {
    actions: {},
    urlFor (item) {
      if (item._type === 'ferment/profile') {
        return computed([item.id, item.ref], function (id, ref) {
          return `/${encodeURIComponent(ref)}`
        }, {nextTick: true})
      } else if (item._type === 'ferment/audio') {
        return computed([item.id, item.author.ref], function (id, profileRef) {
          return `/${encodeURIComponent(profileRef)}/${encodeURIComponent(id.slice(1, 8))}`
        }, {nextTick: true})
      } else {
        return '#'
      }
    },
    config,
    api
  }

  var profileIds = computed([profile.following], (following) => {
    return following.concat([profile.id])
  }, { nextTick: true })

  var profileViews = lookup(profileIds, (id) => {
    var item = api.getProfile(id)
    var view = ProfileView(context, item)
    var element = h('div.main', {
      'data-title': item.displayName
    }, [
      when(api.profilesLoaded, view)
    ])
    return [context.urlFor(item), element]
  })

  h('div', { sink: true }, when(api.profilesLoaded, [
    toCollection.values(profileViews)
  ]))

  var serveWebSeed = ServeWebSeeds(client, config)
  var server = http.createServer(function (req, res) {
    var url = URL.parse(req.url, true)
    if (url.pathname.startsWith('/~blobs/')) {
      var id = decodeURIComponent(url.pathname.slice(8))
      serveBlob(id, res)
    } else if (url.pathname.startsWith('/~seeds/')) {
      serveWebSeed(req, res)
    } else if (profileViews.has(url.pathname)) {
      var element = resolve(profileViews.get(url.pathname))
      var content = url.query.inner ? element.outerHTML : wrap(element.outerHTML, `${element.dataset.title} | Ferment`)
      res.writeHead(200, {
        'transfer-encoding': 'chunked',
        'content-type': 'text/html; charset=utf-8'
      })
      res.end(content)
    } else {
      res.writeHead(404)
      res.end('Not found')
    }
  })

  server.listen(config.webPort)

  return []

  // scoped

  function serveBlob (id, res) {
    client.blobs.size(id, function (_, size) {
      // HACK: don't serve blobs that are bigger than 500 kb
      if (size && size < 500 * 1024) {
        ServeBlobs.serve(client, id, res)
      } else {
        res.writeHead(404)
        res.end('File not found')
      }
    })
  }
}

function wrap (content, title) {
  return `
    <!doctype html>
    <html>
      <title>${escapeHTML(title)}</title>
      <style>${styles}</style>
    </html>
    <body>
      <div class='MainWindow -web'>
        ${content}
        <div class='.bottom'>
          <audio controls />
        </div>
      </div>
      <script src="https://cdn.jsdelivr.net/webtorrent/latest/webtorrent.min.js"></script>
      <script>
        var torrentClient = WebTorrent()
        var rootUrl = window.location.protocol + '//' + window.location.host

        var player = document.querySelector('.MainWindow > div.\\\\.bottom > audio')
        var torrentWatchers = []

        window.onpopstate = function(event) {
          if (event.state) {
            setView(event.state)
          }
        }

        if (player) {
          player.playingElement = null
          bindInner(document.querySelector('div.\\\\.main'))
        }

        function bindInner (container) {
          if (container.querySelectorAll) {
            forEach(container.querySelectorAll('.AudioPost'), bindPost)
            if (window.history.pushState) {
              forEach(container.querySelectorAll('a'), function (element) {
                if (element.getAttribute('href').charAt(0) === '/') {
                  element.addEventListener('click', function (e) {
                    e.preventDefault()
                    navigate(this.href)
                  }, false)
                } else if (element.getAttribute('href') === '#') {
                  element.addEventListener('click', handleNotAvailable, false)
                }
              })
            }
          }
        }

        function handleNotAvailable (e) {
          e.preventDefault()
          alert('COMPUTER SAYS NO')
        }

        function bindPost(element) {
          element.querySelector('a.\\\\.play').addEventListener('click', {
            handleEvent: handlePlay,
            element: element
          }, false)
          var display = element.querySelector('div.\\\\.display')
          var handler = {
            handleEvent: handleMove,
            element: element
          }
          display.addEventListener('mousemove', handler, false)
          display.addEventListener('mousedown', handler, false)

          element.classList.remove('-waiting')
          element.classList.remove('-paused')
          element.classList.remove('-playing')

          if (player.playingElement && player.playingElement.dataset.infoHash === element.dataset.infoHash) {
            bindPlayer(element)
          }
        }

        function handleMove (ev) {
          if (ev.buttons && ev.button === 0) {
            var box = ev.currentTarget.getBoundingClientRect()
            var x = ev.clientX - box.left
            if (x < 5) {
              x = 0
            }
            setPosition(this.element, x / box.width * parseFloat(this.element.dataset.duration))
          }
        }

        function handlePlay (ev) {
          ev.preventDefault()
          ev.stopPropagation()
          if (this.element.classList.contains('-playing') || this.element.classList.contains('-waiting')) {
            pause(this.element)
          } else {
            play(this.element)
          }
        }

        function play (element) {
          if (player.playingElement) {
            pause(player.playingElement)
          }

          bindPlayer(element)
          setState(element, 'waiting')
          refreshTorrentStatus(element)
          player.load()

          var progressElement = element.querySelector('div.\\\\.progress')

          var infoHash = element.dataset.infoHash
          var torrent = torrentClient.get(infoHash)
          if (torrent) {
            next(torrent)
          } else {
            addTorrent(element, infoHash, next)
          }

          function next (torrent) {
            if (element.classList.contains('-waiting')) {
              var file = player.canPlayType('audio/webm') ? torrent.files[0] : torrent.files[1]
              file.getBlobURL(function (err, url) {
                if (err) throw err
                player.src = url
                player.currentTime = parseFloat(element.dataset.pos) || 0
                player.play()
              })
            }
          }
        }

        function bindTorrentStatus (element, torrent) {
          refreshTorrentStatus(element)
          torrentWatchers.push(setInterval(function () {
            refreshTorrentStatus(element)
          }, 500))
        }

        function bindPlayer (element) {
          var cuedNext = false
          clearInterval(player.boundTorrentStatusTimer)

          if (player.playingElement) {
            setState(element, null)
          }

          if (!player.paused) {
            setState(element, 'playing')
          }

          player.playingElement = element

          player.onplaying = function () {
            setState(element, 'playing')
          }
          player.onwaiting = function () {
            setState(element, 'waiting')
          }
          player.ontimeupdate = function (e) {
            element.dataset.pos = player.currentTime
            refreshPosition(element)
            if (!cuedNext && player.duration > 0 && player.duration - player.currentTime < 10) {
              cuedNext = true
              cueNext()
            }
          }
          player.onended = function () {
            element.dataset.pos = 0
            refreshPosition(element)
            playNext()
          }
        }

        function refreshTorrentStatus (element) {
          var status = element.querySelector('.\\\\.status')
          var torrent = torrentClient.get(element.dataset.infoHash)
          var html = ''

          if (torrent && !torrent.files[1] && !player.canPlayType('audio/webm')) {
            html += 'Not available for this platform.'
          } else {
            if (torrent && torrent.downloadSpeed) {
              html += '<span>' + prettierBytes(torrent.downloadSpeed) + '/s 🔽</span>'
            }

            if (torrent && torrent.numPeers) {
              html += '<span class="-peers"><strong>' + torrent.numPeers + '</strong> 🍻</span>'
            } else {
              html += '<span>Finding peers...</span>'
            }
          }

          if (status.innerHTML !== html) {
            status.innerHTML = html
          }
        }

        function playNext () {
          if (player.playingElement && player.playingElement.nextElementSibling) {
            play(player.playingElement.nextElementSibling)
          }
        }

        function cueNext () {
          if (player.playingElement && player.playingElement.nextElementSibling) {
            var element = player.playingElement.nextElementSibling
            var infoHash = element.dataset.infoHash
            if (infoHash) {
              var torrent = torrentClient.get(infoHash)
              if (!torrent) {
                addTorrent(element, infoHash)
              }
            }
          }
        }

        function setPosition (element, pos) {
          element.dataset.pos = pos
          if (player.playingElement === element) {
            player.currentTime = pos
          } else {
            refreshPosition(element)
          }
        }

        function addTorrent (element, infoHash, cb) {
          torrentClient.add(rootUrl + '/~seeds/' + infoHash + '.torrent', function (torrent) {
            if (!player.canPlayType('audio/webm')) {
              torrent.files[0].deselect()
            }
            torrent.addWebSeed(rootUrl + '/~seeds/' + torrent.infoHash)
            bindTorrentStatus(element, torrent)
            cb && cb(torrent)
          })
        }

        function setState (element, state) {
          element.classList.remove('-waiting')
          element.classList.remove('-paused')
          element.classList.remove('-playing')
          if (state) {
            element.classList.add('-' + state)
          }
        }

        function refreshPosition (element) {
          var pos = parseFloat(element.dataset.pos)
          var duration = parseFloat(element.dataset.duration)
          var progressElement = element.querySelector('div.\\\\.progress')
          progressElement.style.width = Math.round(pos / duration * 1000) / 10 + '%'
        }

        function pause (element) {
          setState(element, 'paused')
          player.pause()
        }

        function navigate (url) {
          var req = new XMLHttpRequest();
          req.addEventListener("load", function () {
            var main = document.querySelector('div.\\\\.main')
            window.history.replaceState({html: main.outerHTML, scrollTop: main.scrollTop}, main.dataset.title)

            var element = setView({html: this.responseText, url: url})
            window.history.pushState({html: this.responseText}, element.dataset.title, url)
          });
          req.open("GET", url + '?inner=true');
          req.send();
        }

        function setView (state) {
          forEach(torrentWatchers, function (id) {
            clearInterval(id)
          })
          torrentWatchers.length = 0

          var main = document.querySelector('div.\\\\.main')
          var container = document.createElement('div')
          container.innerHTML = state.html
          var element = container.childNodes[0]
          main.parentNode.replaceChild(element, main)
          element.scrollTop = state.scrollTop || 0
          bindInner(element)
          return element
        }

        function forEach (elements, fn) {
          for (var i = 0; i < elements.length; i++) {
            fn(elements[i], i)
          }
        }

        function prettierBytes (num) {
          if (typeof num !== 'number' || Number.isNaN(num)) {
            throw new TypeError('Expected a number, got ' + typeof num)
          }

          var neg = num < 0
          var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

          if (neg) {
            num = -num
          }

          if (num < 1) {
            return (neg ? '-' : '') + num + ' B'
          }

          var exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
          num = Number(num / Math.pow(1000, exponent))
          var unit = units[exponent]

          if (num >= 10 || num % 1 === 0) {
            // Do not show decimals when the number is two-digit, or if the number has no
            // decimal component.
            return (neg ? '-' : '') + num.toFixed(0) + ' ' + unit
          } else {
            return (neg ? '-' : '') + num.toFixed(1) + ' ' + unit
          }
        }
      </script>
    </body>
  `
}

function escapeHTML (s, type) {
  if (type !== false) {
    var result = String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (type === 'attr') {
      result = result.replace(/"/g, '&quot;')
    }
    return result
  } else {
    return s
  }
}
