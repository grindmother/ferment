var h = require('../lib/h')
var send = require('@mmckegg/mutant/send')
var computed = require('@mmckegg/mutant/computed')
var when = require('@mmckegg/mutant/when')
var AudioOverview = require('./audio-overview')
var prettyBytes = require('prettier-bytes')
var contextMenu = require('../lib/context-menu')
var magnet = require('magnet-uri')
var electron = require('electron')
var colorHash = require('../lib/color-hash')

module.exports = function (context, item) {
  var player = context.player
  var torrent = magnet.decode(item.audioSrc())
  var torrentStatus = context.background.getTorrentStatus(torrent.infoHash)
  var profile = context.api.getProfile(context.api.id)
  var likeCount = computed(item.likes, x => x.length)
  var liked = computed([profile.likes, item.id], (likes, id) => likes.includes(id))
  var isOwner = context.api.id === item.author.id
  var color = colorHash.hex(item.id)

  var url = computed(item.artworkSrc, (src) => {
    if (src && src.startsWith('blobstore:')) {
      return `http://localhost:${context.config.blobsPort}/${src.slice(10)}`
    } else {
      return src
    }
  })

  return h('AudioPost', {
    'ev-contextmenu': contextMenu.bind(null, context, item),
    classList: [
      computed(item.state, (s) => `-${s}`)
    ]
  }, [
    h('div.artwork', {
      style: {
        'background-image': computed(url, (src) => src ? `url("${src}")` : ''),
        'background-color': color,
        'cursor': 'pointer'
      },
      'ev-click': send(context.actions.viewPost, item.id)
    }),
    h('div.main', [
      h('div.title', [
        h('a.play', { 'ev-click': send(player.togglePlay, item), href: '#' }),
        h('header', [
          h('a.feedTitle', {
            href: '#', 'ev-click': send(context.actions.viewProfile, item.author.id)
          }, [item.author.displayName]),
          h('a.title', {
            href: '#', 'ev-click': send(context.actions.viewPost, item.id)
          }, [item.title])
        ])
      ]),
      h('div.display', {
        hooks: [
          SetPositionHook(context, item)
        ]
      }, [
        AudioOverview(item.overview, 600, 100),
        h('div.progress', {
          style: {
            width: computed([item.position, item.duration], (pos, dur) => Math.round(pos / dur * 1000) / 10 + '%')
          }
        }),
        when(item.position, h('span.position', computed(item.position, formatTime))),
        h('span.duration', computed(item.duration, formatTime))
      ]),
      h('div.options', [
        h('a.like', {
          href: '#',
          'ev-click': send(toggleLike, { liked, context, item }),
          classList: [
            when(liked, '-active')
          ]
        }, [
          '💚 ', when(likeCount, likeCount, 'Like')
        ]),
        h('a.repost', { href: '#', 'ev-click': repost }, '📡 Repost'),
        h('a.save', { href: '#', 'ev-click': save }, '💾 Save'),
        when(isOwner,
          h('a.edit', { href: '#', 'ev-click': edit }, '✨ Edit')
        ),
        h('div.status', [
          when(torrentStatus.active, [
            when(torrentStatus.isDownloading,
              h('span', [computed(torrentStatus.progress, percent)])
            ),

            when(torrentStatus.downloadSpeed, [
              h('span', [ computed(torrentStatus.downloadSpeed, value => `${prettyBytes(value)}/s 🔽`) ])
            ]),

            when(torrentStatus.uploadSpeed, [
              h('span', [ computed(torrentStatus.uploadSpeed, value => `${prettyBytes(value)}/s 🔼`) ])
            ]),

            when(torrentStatus.numPeers, [
              h('span -peers', [h('strong', torrentStatus.numPeers), ' 🍻'])
            ])
          ])
        ])
      ])
    ])
  ])

  function save () {
    showDialog({
      message: `This button doesn't do anything yet, but when it does, you'll be able to save this file to somewhere on your computer!`,
      buttons: ['Okay, hurry up and add it!']
    })
  }

  function repost () {
    showDialog({
      message: `This button doesn't do anything yet, but when it does, you'll be able to repost content from other peoples feed to your own!`,
      buttons: ['Okay, hurry up and add it!']
    })
  }

  function edit () {
    context.actions.editPost({
      id: item.id,
      item: item()
    })
  }
}

function toggleLike (opts) {
  if (opts.liked()) {
    opts.context.api.unlike(opts.item.id)
  } else {
    opts.context.api.like(opts.item.id)
  }
}

function percent (value) {
  return Math.round(value * 100) + '%'
}

function SetPositionHook (context, item) {
  return function (element) {
    element.onmousemove = element.onmousedown = function (ev) {
      if (ev.buttons && ev.button === 0) {
        var box = ev.currentTarget.getBoundingClientRect()
        var x = ev.clientX - box.left
        if (x < 5) {
          x = 0
        }
        setPosition(x / box.width * item.duration())
      }
    }
  }

  function setPosition (position) {
    if (context.player.currentItem.get() === item) {
      context.player.audioElement.currentTime = position
    }
    item.position.set(position)
  }
}

function formatTime (value) {
  var minutes = Math.floor(value / 60)
  var seconds = Math.floor(value % 60)
  return minutes + ':' + ('0' + seconds).slice(-2)
}

function showDialog (opts) {
  electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), opts)
}
