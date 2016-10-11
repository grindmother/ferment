var MutantDict = require('@mmckegg/mutant/dict')
var pull = require('pull-stream')
var Profile = require('../models/profile')
var MutantLookup = require('@mmckegg/mutant/lookup')
var toCollection = require('@mmckegg/mutant/dict-to-collection')
var mlib = require('ssb-msgs')
var computed = require('@mmckegg/mutant/computed')
var MutantMap = require('@mmckegg/mutant/map')
var MutantArray = require('@mmckegg/mutant/array')
var MutantSet = require('@mmckegg/mutant/set')
var Value = require('@mmckegg/mutant/value')
var concat = require('@mmckegg/mutant/concat')
var AudioPost = require('../models/audio-post')
var throttle = require('@mmckegg/mutant/throttle')
var ip = require('ip')

module.exports = function (ssbClient, config) {
  var pubIds = MutantSet()
  var lookup = MutantDict()
  var postLookup = MutantDict()
  var postIds = MutantArray()
  var profileIds = MutantArray()
  var profilesList = toCollection(lookup)
  var lookupByName = MutantLookup(profilesList, 'displayName')
  var sync = Value(false)

  var followingPubs = computed([pubIds, get(ssbClient.id).following], (pubIds, following) => {
    return pubIds.filter(x => following.includes(x))
  })
  var pubFriends = concat(MutantMap(pubIds, (id) => get(id).following))
  var pubFriendPostIds = computed([pubFriends, postIds], (pubFriends, postIds) => {
    return postIds.filter((id) => {
      var authorId = postLookup.get(id).author.id
      return pubFriends.includes(authorId) || authorId === ssbClient.id
    })
  })

  pollPeers()
  setInterval(pollPeers, 5000)

  pull(
    ssbClient.createFeedStream({ live: true }),
    pull.drain((data) => {
      if (data.sync) {
        sync.set(true)
      } else if (data.value.content.type === 'about') {
        mlib.links(data.value.content.about, 'feed').forEach(function (link) {
          const profile = get(link.link)
          profile.updateFrom(data.value.author, data)
        })
      } else if (data.value.content.type === 'contact') {
        const following = data.value.content.following
        const author = get(data.value.author)

        mlib.links(data.value.content.contact, 'feed').forEach(function (link) {
          if (typeof following === 'boolean') {
            if (following) {
              author.following.add(link.link)
              var target = get(link.link)
              target.followers.add(data.value.author)
              if (typeof data.value.content.scope === 'string') {
                target.scopes.add(data.value.content.scope)
              }
            } else {
              author.following.delete(link.link)
              const target = lookup.get(link.link)
              if (target) {
                target.followers.delete(data.value.author)
              }
            }
          }
        })
      } else if (data.value.content.type === 'pub') {
        if (data.value.author === ssbClient.id) {
          if (data.value.content.address && data.value.content.address.key) {
            const id = mlib.link(data.value.content.address.key, 'feed')
            if (id) pubIds.add(id.link)
          }
        }
      } else if (data.value.content.type === 'ferment/audio') {
        const profile = get(data.value.author)
        const post = getPost(data.key)
        profile.postCount.set(profile.postCount() + 1)
        post.set(data.value.content)
        post.author = profile
        profile.posts.add(data.key)
        postIds.push(data.key)
      } else if (data.value.content.type === 'ferment/update') {
        const update = mlib.link(data.value.content.update, 'msg')
        const post = postLookup.get(update.link)
        if (post) {
          post.updateFrom(data)
        }
      } else if (data.value.content.type === 'ferment/like') {
        const profile = get(data.value.author)
        const like = mlib.link(data.value.content.like, 'msg')
        const post = postLookup.get(like.link)

        if (like.value) {
          profile.likes.add(like.link)
          if (post) post.likes.add(data.value.author)
        } else {
          profile.likes.delete(like.link)
          if (post) post.likes.delete(data.value.author)
        }
      }
    })
  )

  return {
    get,
    getPost,
    getSuggested,
    pubFriendPostIds,
    rankProfileIds,
    lookup,
    lookupByName,
    postIds,
    postLookup,
    sync
  }

  function pollPeers () {
    ssbClient.gossip.peers((err, values) => {
      if (err) console.log(err)
      values.forEach((peer) => {
        if (!ip.isPrivate(peer.host)) {
          var profile = get(peer.key)
          if (!profile.isPub()) {
            profile.isPub.set(true)
          }
        }
      })
    })
  }

  function get (id) {
    if (id.id) {
      // already a profile?
      return id
    }

    var profile = lookup.get(id)
    if (!profile) {
      profile = Profile(id, ssbClient.id)
      lookup.put(id, profile)
      profileIds.push(id)
    }

    return profile
  }

  function getPost (id) {
    if (id.id) {
      return id
    }

    var instance = postLookup.get(id)
    if (!instance) {
      instance = AudioPost(id, ssbClient.id)
      postLookup.put(id, instance)
    }

    return instance
  }

  function rankProfileIds (ids, max) {
    return computed(ids, (ids) => {
      var result = []
      ids.forEach((id) => {
        var profile = get(id)
        var displayNameBonus = profile.displayNames.keys().length ? 10 : 0
        var imageBonus = profile.images.keys().length ? 2 : 0
        var postBonus = Math.log(1 + profile.postCount())
        var followerBonus = postBonus ? Math.log(1 + profile.followers.getLength()) : Math.log(profile.followers.getLength() / 100)
        result.push([id, postBonus + followerBonus + displayNameBonus + imageBonus])
      })
      result = result.sort((a, b) => b[1] - a[1]).map(x => x[0])
      if (max) {
        result = result.slice(0, max)
      }
      return result
    })
  }

  function getSuggested (max) {
    var yourProfile = get(ssbClient.id)
    var lastUpdated = 0
    var ids = computed([sync, throttle(profileIds, 2000), throttle(pubFriends, 2000)], (sync, ids) => {
      if (sync) {
        lastUpdated = Date.now()

        var result = []
        ids.forEach((id) => {
          var profile = get(id)
          if ((!config.friends.scope || profile.scopes.has(config.friends.scope)) && !yourProfile.following.has(id) && id !== yourProfile.id && profile.displayNames.keys().length && !profile.isPub()) {
            var postBonus = Math.log(1 + profile.postCount())
            var followerBonus = postBonus ? Math.log(1 + profile.followers.getLength()) : Math.log(profile.followers.getLength() / 100)
            result.push([id, postBonus + followerBonus])
          }
        })

        result = result.sort((a, b) => b[1] - a[1])

        if (max) {
          result = result.slice(0, max)
        }

        return result.map(x => x[0])
      }
    }, { nextTick: true })
    var result = MutantMap(ids, get)
    result.sync = sync
    return result
  }
}
