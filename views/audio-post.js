var h = require('../lib/h')
var MutantMap = require('@mmckegg/mutant/map')
var computed = require('@mmckegg/mutant/computed')
var when = require('@mmckegg/mutant/when')
var renderMiniProfile = require('../widgets/mini-profile')
var contextMenu = require('../lib/context-menu')
var magnet = require('magnet-uri')
var prettyBytes = require('prettier-bytes')
var send = require('@mmckegg/mutant/send')
var AudioOverview = require('../widgets/audio-overview')
var markdown = require('../lib/markdown')
var colorHash = require('../lib/color-hash')
var humanTime = require('human-time')

module.exports = AudioPostView

function AudioPostView (context, postId) {
  var post = context.api.getPost(postId)
  var rankedLikedIds = context.api.rankProfileIds(post.likes, 12)
  var likes = MutantMap(rankedLikedIds, id => context.api.getProfile(id))
  var likesCount = computed(post.likes, (list) => list.length)
  var player = context.player
  var torrent = magnet.decode(post.audioSrc())
  var torrentStatus = context.background.getTorrentStatus(torrent.infoHash)
  var profile = context.api.getProfile(context.api.id)
  var liked = computed([profile.likes, postId], (likes, id) => likes.includes(id))
  var isOwner = context.api.id === post.author.id
  var color = colorHash.hex(postId)

  var url = computed(post.artworkSrc, (src) => {
    if (src && src.startsWith('blobstore:')) {
      return `http://localhost:${context.config.blobsPort}/${src.slice(10)}`
    } else {
      return src
    }
  })

  return h('AudioPostView', {
    'ev-contextmenu': contextMenu.bind(null, context, post),
    classList: [
      computed(post.state, (s) => `-${s}`)
    ]
  }, [
    h('header', [
      h('div.main', [
        h('div.title', [
          h('a.play', { 'ev-click': send(player.togglePlay, post), href: '#' }),
          h('header', [
            h('a.feedTitle', {
              href: '#', 'ev-click': send(context.actions.viewProfile, post.author.id)
            }, [post.author.displayName]), h('br'),
            h('span.title', [post.title])
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
      ]),

      h('div.artwork', { style: {
        'background-image': computed(url, (src) => src ? `url("${src}")` : ''),
        'background-color': color
      }})
    ]),
    h('section', [
      h('div.main', [
        markdown(post.description)
      ]),
      h('div.side', [
        when(likesCount, [
          h('h2', ['Liked by ', h('span.sub', [likesCount])]),
          MutantMap(likes, (item) => renderMiniProfile(context, item), { maxTime: 5 })
        ])
      ])
    ])
  ])

  // scoped

  function edit () {
    context.actions.editPost({
      id: post.id,
      item: post()
    })
  }
}

function percent (value) {
  return Math.round(value * 100) + '%'
}

function toggleLike (opts) {
  if (opts.liked()) {
    opts.context.api.unlike(opts.item.id)
  } else {
    opts.context.api.like(opts.item.id)
  }
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
