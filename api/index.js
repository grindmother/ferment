var MutantMap = require('@mmckegg/mutant/map')
var electron = require('electron')
var Profiles = require('./profiles')
var schemas = require('ssb-msg-schemas')
var Proxy = require('@mmckegg/mutant/proxy')
var computed = require('@mmckegg/mutant/computed')
var mlib = require('ssb-msgs')

var callbacks = {}
electron.ipcRenderer.on('response', (ev, id, ...args) => {
  var cb = callbacks[id]
  if (cb) {
    delete callbacks[id]
    cb(...args)
  }
})

module.exports = function (ssbClient, config) {
  var windowId = Date.now()
  var seq = 0
  var profiles = null
  var profilesLoaded = Proxy()
  var scope = (config.friends || {}).scope

  return {
    id: ssbClient.id,
    getDiscoveryFeed (cb) {
      checkProfilesLoaded()
      return lookupItems(sortedPostIds(profiles.postIds))
    },

    getFollowingFeed (cb) {
      checkProfilesLoaded()
      var profile = profiles.get(ssbClient.id)
      var postIds = computed([profile.following, profiles.lookup], (following, profiles) => {
        var result = []
        following.forEach((id) => {
          var otherProfile = profiles[id]
          if (otherProfile) {
            otherProfile.posts.forEach(x => result.push(x))
          }
        })
        return result
      }, { nextTick: true })

      return lookupItems(sortedPostIds(postIds))
    },

    getProfileFeed (id, cb) {
      checkProfilesLoaded()
      return lookupItems(sortedPostIds(profiles.get(id).posts))
    },

    setOwnDisplayName (name, cb) {
      ssbClient.publish({
        type: 'about',
        about: ssbClient.id,
        name: name
      }, (err) => cb && cb(err))
    },

    getLikedFeedFor (id) {
      checkProfilesLoaded()
      var likes = profiles.get(id).likes
      return lookupItems(likes)
    },

    profilesLoaded,

    getProfile (id) {
      checkProfilesLoaded()
      return profiles.get(id)
    },

    rankProfileIds (ids, max) {
      checkProfilesLoaded()
      return profiles.rankProfileIds(ids, max)
    },

    getOwnProfile () {
      checkProfilesLoaded()
      return profiles.get(ssbClient.id)
    },

    getSuggestedProfiles (max) {
      checkProfilesLoaded()
      return profiles.getSuggested(max)
    },

    publish,

    follow (id, cb) {
      var msg = schemas.follow(id)
      msg.scope = scope
      publish(msg, cb)
    },

    unfollow (id, cb) {
      publish(schemas.unfollow(id), cb)
    },

    like (id, cb) {
      var likeLink = mlib.link(id)
      likeLink.value = true
      publish({
        type: 'ferment/like',
        like: likeLink
      }, cb)
    },

    getLikesFor (id) {
      checkProfilesLoaded()
      return profiles.getLikesFor(id)
    },

    unlike (id, cb) {
      var unlikeLink = mlib.link(id)
      unlikeLink.value = false
      publish({
        type: 'ferment/like',
        like: unlikeLink
      }, cb)
    },

    addBlob (path, cb) {
      var id = `${windowId}-${seq++}`
      callbacks[id] = cb
      electron.ipcRenderer.send('add-blob', id, path)
    },

    getBlobUrl (hash) {
      return `http://localhost:${config.blobsPort}/${hash}`
    }
  }

  // scoped

  function sortedPostIds (ids) {
    return computed([ids, profiles.postIds], function (ids, postIds) {
      return postIds.filter(x => ids.includes(x)).reverse()
    }, { nextTick: true })
  }

  function checkProfilesLoaded () {
    if (!profiles) {
      profiles = Profiles(ssbClient, config)
      profilesLoaded.set(profiles.sync)
    }
  }

  function publish (message, cb) {
    ssbClient.publish(message, function (err, msg) {
      if (!cb && err) throw err
      cb && cb(err, msg)
    })
  }

  function lookupItems (ids) {
    var result = MutantMap(ids, (id) => {
      return profiles.postLookup.get(id)
    })

    result.sync = profiles.sync
    return result
  }
}
