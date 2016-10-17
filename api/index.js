var MutantMap = require('@mmckegg/mutant/map')
var electron = require('electron')
var Profiles = require('./profiles')
var schemas = require('ssb-msg-schemas')
var Proxy = require('@mmckegg/mutant/proxy')
var computed = require('@mmckegg/mutant/computed')
var mlib = require('ssb-msgs')
var onceTrue = require('../lib/once-true')

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
      return lookupItems(sortedPostIds(profiles.pubFriendPostIds))
    },

    reconnectToPub,

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
      return lookupItems(reverse(profiles.get(id).posts))
    },

    setOwnDisplayName (name, cb) {
      publish({
        type: 'about',
        about: ssbClient.id,
        name: name
      }, cb)
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
      checkProfilesLoaded(() => {
        var profile = profiles.get(id)
        var msg = schemas.follow(id)
        msg.scope = scope
        if (profile.isPub()) {
          msg.pub = true
        }
        publish(msg, cb)
      })
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
      ssbClient.gossip.peers(function (err, data) {
        console.log(err, data)
      })
    },

    unlike (id, cb) {
      var unlikeLink = mlib.link(id)
      unlikeLink.value = false
      publish({
        type: 'ferment/like',
        like: unlikeLink
      }, cb)
    },

    repost (id, cb) {
      var repostLink = mlib.link(id)
      repostLink.value = true
      publish({
        type: 'ferment/repost',
        repost: repostLink
      }, cb)
    },

    unrepost (id, cb) {
      var unrepostLink = mlib.link(id)
      unrepostLink.value = false
      publish({
        type: 'ferment/repost',
        repost: unrepostLink
      }, cb)
    },

    getPost (id) {
      checkProfilesLoaded()
      return profiles.getPost(id)
    },

    addBlob (dataOrPath, cb) {
      var id = `${windowId}-${seq++}`
      callbacks[id] = cb
      electron.ipcRenderer.send('add-blob', id, dataOrPath)
    },

    getBlobUrl (id) {
      var prefix = config.blobsPrefix != null ? config.blobsPrefix : `http://localhost:${config.blobsPort}`
      var link = mlib.link(id, 'blob')
      if (link) {
        return `${prefix}/${encodeURIComponent(link.link)}`
      } else if (typeof id === 'string' && id.startsWith('blobstore:')) {
        // legacy ferment artwork blobs
        return `${prefix}/${encodeURIComponent(id.slice(10))}`
      }
    }
  }

  // scoped

  function sortedPostIds (ids) {
    return computed([ids], function (ids) {
      return ids.map(id => profiles.getPost(id)).sort((a, b) => b.timestamp() - a.timestamp()).map(x => x.id)
    }, { nextTick: true })
  }

  function reverse (ids) {
    return computed([ids], function (ids) {
      var result = []
      ids.forEach((id, i) => {
        result[ids.length - 1 - i] = id
      })
      return result
    })
  }

  function checkProfilesLoaded (cb) {
    if (!profiles) {
      profiles = Profiles(ssbClient, config)
      profilesLoaded.set(profiles.sync)
      if (cb) {
        onceTrue(profiles.sync, cb)
      }
    } else if (cb) {
      cb()
    }
  }

  function publish (message, cb) {
    ssbClient.publish(message, function (err, msg) {
      if (!cb && err) throw err
      if (profiles) {
        reconnectToPub()
      }
      cb && cb(err, msg)
    })
  }

  function reconnectToPub (cb) {
    checkProfilesLoaded()
    onceTrue(profilesLoaded, () => {
      ssbClient.gossip.peers((err, peers) => {
        if (err) return cb && cb(err)
        peers.filter((p) => p.state !== 'connected' && profiles.pubIds.has(p.key)).forEach((peer) => {
          console.log(peer)
          ssbClient.gossip.connect(peer)
        })
        cb && cb()
      })
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
