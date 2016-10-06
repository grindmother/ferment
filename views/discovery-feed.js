var h = require('../lib/h')
var renderAudioPost = require('../widgets/audio-post')
var MutantMap = require('@mmckegg/mutant/map')
var when = require('@mmckegg/mutant/when')
var renderMiniProfile = require('../widgets/mini-profile')
var computed = require('@mmckegg/mutant/computed')
var send = require('@mmckegg/mutant/send')

module.exports = DiscoveryFeed

function DiscoveryFeed (context) {
  context.player.currentFeed.set(context.discoveryFeed)

  var suggestedProfiles = context.api.getSuggestedProfiles(15)
  var suggestedProfilesCount = computed(suggestedProfiles, x => x.length)

  return h('Feed', [
    h('div.main', [
      h('h1', 'Discovery Feed'),
      when(context.discoveryFeed.sync,
        MutantMap(context.discoveryFeed, (item) => renderAudioPost(context, item), {
          maxTime: 5
        }),
        h('div.loading')
      )
    ]),

    h('div.side', [
      h('h2', 'Who to follow'),
      when(suggestedProfilesCount,
        MutantMap(suggestedProfiles, (item) => renderMiniProfile(context, item), {
          maxTime: 5
        }),
        h('div', [
          h('p', `Sorry, there's no one here right now 😞`),
          h('p', h('a', {
            href: '#',
            'ev-click': send(context.actions.openJoinPubWindow)
          }, `Maybe try joining a pub?`))
        ])
      ),
      h('button -full -pub', {href: '#', 'ev-click': context.actions.openJoinPubWindow}, ['+ Join Pub'])
    ])
  ])
}
