var h = require('../lib/h')
var renderAudioPost = require('../widgets/audio-post')
var MutantMap = require('@mmckegg/mutant/map')
var when = require('@mmckegg/mutant/when')
var renderMiniProfile = require('../widgets/mini-profile')
var computed = require('@mmckegg/mutant/computed')
var send = require('@mmckegg/mutant/send')
var Path = require('path')

module.exports = DiscoveryFeed

function DiscoveryFeed (context) {
  context.player.currentFeed.set(context.discoveryFeed)

  var suggestedProfiles = context.suggestedProfiles
  var suggestedProfilesCount = computed(suggestedProfiles, x => x.length)
  var postCount = computed(context.discoveryFeed, x => x.length)
  var localProfiles = context.api.getLocalProfiles()
  var localCount = computed(localProfiles, x => x.length)

  return h('Feed', [
    h('div.main', [
      h('h1', 'Discovery Feed'),
      when(context.discoveryFeed.sync,
        when(postCount,
          MutantMap(context.discoveryFeed, (item) => renderAudioPost(context, item), {
            maxTime: 5
          }),
          h('div', { style: { 'font-size': '120%' } }, [
            h('strong', `There's nothing to see here yet.`),
            h('p', [
              `You can start adding music to `,
              h('a', { href: '#', 'ev-click': send(context.actions.viewProfile, context.api.id) }, `your profile`),
              `, or `,
              h('a', { href: '#', 'ev-click': context.actions.openJoinPubWindow }, `join a pub server`),
              ` to really get things going! 🍻`
            ]),
            h('img', {
              src: `file://${Path.join(__dirname, '..', 'ferment-logo.png')}`,
              style: {
                display: 'block',
                width: 200,
                margin: '60px auto'
              }
            })
          ])
        ),
        h('Loading -large')
      )
    ]),

    h('div.side', [

      when(localCount, [
        h('h2', 'Local'),
        MutantMap(localProfiles, (item) => renderMiniProfile(context, item), {
          maxTime: 5,
          nextTick: true
        })
      ]),

      h('h2', 'Who to follow'),
      when(suggestedProfiles.sync, [
        when(suggestedProfilesCount,
          MutantMap(suggestedProfiles, (item) => renderMiniProfile(context, item), {
            maxTime: 5,
            nextTick: true
          }),
          h('div', [
            h('p', `Sorry, there's no one here right now 😞`),
            h('p', h('a', {
              href: '#',
              'ev-click': send(context.actions.openJoinPubWindow)
            }, `Maybe try joining a pub?`))
          ]),
          h('button -full -pub', {href: '#', 'ev-click': context.actions.openJoinPubWindow}, ['+ Join Pub'])
        )
      ], [
        h('Loading')
      ])
    ])
  ])
}
