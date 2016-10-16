var h = require('../lib/h')
var send = require('@mmckegg/mutant/send')
var computed = require('@mmckegg/mutant/computed')
var when = require('@mmckegg/mutant/when')
var AudioOverview = require('./audio-overview')
var prettyBytes = require('prettier-bytes')
var contextMenu = require('../lib/context-menu')
var magnet = require('magnet-uri')
var colorHash = require('../lib/color-hash')
var humanTime = require('human-time')

module.exports = function (context, post) {
  var player = context.player
  var torrent = magnet.decode(post.audioSrc())
  var torrentStatus = context.background.getTorrentStatus(torrent.infoHash)
  var profile = context.api.getProfile(context.api.id)
  var likesCount = computed(post.likes, x => x.length)
  var repostsCount = computed(post.reposters, (list) => list.length)
  var reposted = computed([profile.posts, post.id], (posts, id) => posts.includes(id))
  var liked = computed([profile.likes, post.id], (likes, id) => likes.includes(id))
  var isOwner = context.api.id === post.author.id
  var color = colorHash.hex(post.id)

  var url = computed(post.artworkSrc, context.api.getBlobUrl)

  return h('AudioPost', {
    'ev-contextmenu': contextMenu.bind(null, context, post),
    classList: [
      computed(post.state, (s) => `-${s}`)
    ]
  }, [
    h('div.artwork', {
      style: {
        'background-image': computed(url, (src) => src ? `url("${src}")` : ''),
        'background-color': color,
        'cursor': 'pointer'
      },
      'ev-click': send(context.actions.viewPost, post.id)
    }),
    h('div.main', [
      h('div.title', [
        h('a.play', { 'ev-click': send(player.togglePlay, post), href: '#' }),
        h('header', [
          h('a.feedTitle', {
            href: '#', 'ev-click': send(context.actions.viewProfile, post.author.id)
          }, [post.author.displayName]),
          h('a.title', {
            href: '#', 'ev-click': send(context.actions.viewPost, post.id)
          }, [post.title])
        ]),
        h('div.timestamp', [
          humanTime(Date.now() / 1000 - post.timestamp() / 1000)
        ])
      ]),
      h('div.display', {
        hooks: [
          SetPositionHook(context, post)
        ]
      }, [
        AudioOverview(post.overview, 600, 100),
        h('div.progress', {
          style: {
            width: computed([post.position, post.duration], (pos, dur) => Math.round(pos / dur * 1000) / 10 + '%')
          }
        }),
        when(post.position, h('span.position', computed(post.position, formatTime))),
        h('span.duration', computed(post.duration, formatTime))
      ]),
      h('div.options', [
        h('a.like', {
          href: '#',
          'ev-click': send(toggleLike, { liked, context, post }),
          classList: [
            when(liked, '-active')
          ]
        }, [
          '💚 ', when(likesCount, likesCount, 'Like')
        ]),
        when(isOwner,
          h('a.repost -disabled', [
            '📡 ', when(repostsCount, repostsCount, 'Repost')
          ]),
          h('a.repost', {
            href: '#',
            'ev-click': send(toggleRepost, { reposted, context, post }),
            classList: [
              when(reposted, '-active')
            ]
          }, [
            '📡 ', when(repostsCount, repostsCount, 'Repost')
          ])
        ),
        when(isOwner,
          h('a.edit', { href: '#', 'ev-click': edit }, '✨ Edit')
        ),
        h('a.save', { href: '#', 'ev-click': send(context.actions.saveFile, post) }, '💾 Save'),
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

  function edit () {
    context.actions.editPost({
      id: post.id,
      item: post()
    })
  }
}

function toggleRepost (opts) {
  if (opts.reposted()) {
    opts.context.api.unrepost(opts.post.id)
  } else {
    opts.context.api.repost(opts.post.id)
  }
}

function toggleLike (opts) {
  if (opts.liked()) {
    opts.context.api.unlike(opts.post.id)
  } else {
    opts.context.api.like(opts.post.id)
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
