var h = require('../lib/h')
var when = require('@mmckegg/mutant/when')
var send = require('@mmckegg/mutant/send')
var computed = require('@mmckegg/mutant/computed')
var colorHash = require('../lib/color-hash')
var contextMenu = require('../lib/context-menu')

module.exports = function (context, profile) {
  var color = colorHash.hex(profile.id)
  return h('a MiniProfile', {
    href: context.urlFor(profile),
    classList: [
      when(profile.isPub, '-pub')
    ],
    'ev-contextmenu': contextMenu.bind(null, context, profile),
    'ev-click': send(context.actions.viewProfile, profile.id),
    'tab-index': 0,
    style: {
      cursor: 'pointer'
    }
  }, [
    h('div.image', {
      style: {
        'background-image': computed(profile.image, url => url ? `url('${context.api.getBlobUrl(url)}')` : ''),
        'background-color': color
      }
    }),
    h('div.main', [
      h('div.displayName', {
        href: '#'
      }, [ profile.displayName ]),
      h('div.info', [
        when(profile.isPub, [
          'Pub Server'
        ], [
          h('span', [
            h('strong', [profile.postCount]), ' posts'
          ]), ' // ',
          h('span', [
            h('strong', [computed(profile.followers, count)]), ' followers'
          ])
        ])
      ])
    ])
  ])
}

function count (items) {
  return items.length
}
