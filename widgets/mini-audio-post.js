var h = require('../lib/h')
var when = require('@mmckegg/mutant/when')
var computed = require('@mmckegg/mutant/computed')
var contextMenu = require('../lib/context-menu')

module.exports = function (context, item) {
  var likeCount = computed(item.likes, x => x.length)

  var url = computed(item.artworkSrc, context.api.getBlobUrl)

  return h('MiniAudioPost', {
    'ev-click': (ev) => context.actions.viewPost(item.id),
    'ev-contextmenu': contextMenu.bind(null, context, item),
    'tab-index': 0,
    classList: [
      computed(item.state, (s) => s ? `-${s}` : null)
    ],
    style: {
      cursor: 'pointer'
    }
  }, [
    h('div.image', {
      style: {
        'background-image': computed(url, url => url ? `url('${url}')` : '')
      }
    }, [
      h('a.play', {
        'ev-click': (ev) => {
          ev.stopPropagation()
          context.player.togglePlay(item)
        },
        href: '#'
      })
    ]),
    h('div.main', [
      h('div.displayName', { title: item.author.displayName }, [ item.author.displayName ]),
      h('div.title', { title: item.title }, [ item.title ]),
      h('div.info', [
        when(likeCount, h('span', [
          h('strong', [likeCount]), ' likes'
        ]))
      ])
    ])
  ])
}
