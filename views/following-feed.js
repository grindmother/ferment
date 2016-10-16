var h = require('../lib/h')
var renderAudioPost = require('../widgets/audio-post')
var MutantMap = require('@mmckegg/mutant/map')
var computed = require('@mmckegg/mutant/computed')
var when = require('@mmckegg/mutant/when')
var renderMiniProfile = require('../widgets/mini-profile')

module.exports = FollowingFeed

function FollowingFeed (context) {
  var profile = context.api.getProfile(context.api.id)
  var followingCount = computed(profile.following, (list) => list.length)

  if (context.player) {
    context.player.viewingFeed.set(context.followingFeed)
  }

  return h('Feed', [
    h('div.main', [
      h('h1', [
        h('strong', 'Latest Posts'),
        ' from people you follow'
      ]),
      when(context.followingFeed.sync,
        when(followingCount,
          MutantMap(context.followingFeed, (item) => renderAudioPost(context, item), {
            maxTime: 5
          }),
          h('div.info', [
            `You're not following anyone 😞 ... once you do, you'll start seeing their latest posts on this page!`
          ])
        ),
        h('Loading')
      )
    ]),
    h('div.side', [
      h('h2', ['Following ', h('span.sub', [followingCount])]),
      h('button -full -pub', {href: '#', 'ev-click': context.actions.openJoinPubWindow}, ['+ Join Pub']),
      MutantMap(context.following, (item) => renderMiniProfile(context, item), {
        maxTime: 1000 / 30
      })
    ])
  ])
}
