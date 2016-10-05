var h = require('../lib/h')
var renderAudioPost = require('../widgets/audio-post')
var MutantMap = require('@mmckegg/mutant/map')
var computed = require('@mmckegg/mutant/computed')
var MarkdownHook = require('../lib/markdown-hook')
var FollowButton = require('../widgets/follow-button')
var when = require('@mmckegg/mutant/when')
var renderMiniProfile = require('../widgets/mini-profile')
var renderMiniAudioPost = require('../widgets/mini-audio-post')

module.exports = ProfileView

function ProfileView (context, profileId) {
  var profile = context.api.getProfile(profileId)
  var feed = context.api.getProfileFeed(profileId)
  context.player.currentFeed.set(feed)

  var rankedFollowingIds = context.api.rankProfileIds(profile.following)
  var rankedFollowerIds = context.api.rankProfileIds(profile.followers, 6)
  var uniqueFollowingIds = computed([rankedFollowingIds, rankedFollowerIds, 6], (ids, otherIds) => {
    var result = []
    for (var i = 0; i < ids.length; i++) {
      if (!otherIds.includes(ids[i])) {
        result.push(ids[i])
      }
      if (result.max && result.length > result.max) {
        return
      }
    }
    return result
  })

  var followingProfiles = MutantMap(uniqueFollowingIds, id => context.api.getProfile(id))
  var followerProfiles = MutantMap(rankedFollowerIds, id => context.api.getProfile(id))

  var followingCount = computed(profile.following, (list) => list.length)
  var followerCount = computed(profile.followers, (list) => list.length)

  var likesCount = computed(profile.likes, (list) => list.length)

  return h('Profile', {
    hooks: [ UnlistenHook(feed.destroy) ]
  }, [
    h('header', [
      h('div.image', {
        style: {
          'background-image': computed(profile.image, url => url ? `url('${context.api.getBlobUrl(url)}')` : '')
        }
      }),
      h('div.main', [
        h('h1', [ profile.displayName ]),
        h('div.description', {
          hooks: [ MarkdownHook(profile.description) ]
        })
      ]),
    h('div.controls', [
        FollowButton(context, profileId)
      ])
    ]),
    h('section', [
      h('div.main', [
        h('h2', 'Latest Posts'),
        when(true,
          MutantMap(feed, (item) => renderAudioPost(context, item)),
          h('div.loading')
        )
      ]),
      h('div.side', [
        when(followingCount, [
          h('h2', ['Following ', h('span.sub', [followingCount])]),
          MutantMap(followingProfiles, (item) => renderMiniProfile(context, item))
        ]),

        when(followerCount, [
          h('h2', ['Followed by ', h('span.sub', [followerCount])]),
          MutantMap(followerProfiles, (item) => renderMiniProfile(context, item))
        ]),

        when(likesCount, [
          h('h2', 'Likes'),
          MutantMap(context.api.getLikedFeedFor(profileId), (item) => renderMiniAudioPost(context, item))
        ])
      ])
    ])
  ])
}

function UnlistenHook (cb) {
  return function (element) {
    return cb
  }
}
