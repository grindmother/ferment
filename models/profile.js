var Value = require('@mmckegg/mutant/value')
var Struct = require('@mmckegg/mutant/struct')
var MutantDict = require('@mmckegg/mutant/dict')
var MutantArray = require('@mmckegg/mutant/array')
var MutantSet = require('@mmckegg/mutant/set')
var computed = require('@mmckegg/mutant/computed')
var mlib = require('ssb-msgs')
var watch = require('@mmckegg/mutant/watch')

module.exports = function (id, myId) {
  var obj = Struct({
    displayNames: SocialValue(),
    images: SocialValue(),
    descriptions: SocialValue(),
    followers: MutantSet(),
    following: MutantSet(),
    postCount: Value(0),
    scopes: MutantSet(),
    posts: MutantSet(),
    likes: MutantSet(),
    reposts: MutantDict(),
    isPub: Value(false),
    ref: Value()
  })

  obj.id = id
  obj.self = Assigned(obj, id)
  obj.byMe = Assigned(obj, myId)
  obj.description = computed([obj.byMe.description, obj.self.description, obj.descriptions], getSocialValue, { nextTick: true })
  obj.displayName = computed([obj.byMe.displayName, obj.self.displayName, obj.displayNames], getSocialValue, { nextTick: true })
  obj.image = computed([obj.byMe.image, obj.self.image, obj.images], getSocialValue, { nextTick: true })
  obj.updateFrom = updateFrom.bind(null, obj)
  obj._type = 'ferment/profile'

  // hold the line open
  watch(obj.displayName)

  return obj
}

function Assigned (profile, id) {
  return Struct({
    displayName: profile.displayNames.valueBy(id),
    description: profile.descriptions.valueBy(id),
    image: profile.images.valueBy(id)
  })
}

function updateFrom (profile, sourceId, msg) {
  var c = msg.value.content

  // name: a non-empty string
  if (nonEmptyStr(c.name)) {
    var safeName = makeNameSafe(c.name)
    profile.displayNames.assignValue(sourceId, safeName)
  }

  // image: link to image
  if ('image' in c) {
    var imageLink = mlib.link(c.image, 'blob')
    if (imageLink) {
      profile.images.assignValue(sourceId, imageLink.link)
    }
  }

  if ('description' in c) {
    profile.descriptions.assignValue(sourceId, c.description)
  }
}

function getSocialValue (assigned, self, all) {
  return assigned || self || mostPopular(all)
}

function mostPopular (obj) {
  var max = 0
  var value = null

  for (var k in obj) {
    if (obj[k].length > max) {
      max = obj[k].length
      value = obj[k]
    }
  }

  return value
}

function makeNameSafe (str) {
  // TODO: figure out a good white list. Stuff that lets people be
  //       creative, but doesn't destroy the page layout or anything.
  return String(str)
}

function nonEmptyStr (str) {
  return (typeof str === 'string' && !!('' + str).trim())
}

function SocialValue () {
  var result = MutantDict()
  result.assignValue = assignValue.bind(null, result)
  result.valueBy = getValueBy.bind(null, result)
  return result
}

function assignValue (dict, assignerId, value) {
  dict.keys().forEach((v) => {
    var current = dict.get(v)
    current.delete(assignerId)
    if (!current.getLength()) {
      dict.delete(v)
    }
  })

  // add new assignment
  if (!dict.get(value)) {
    dict.put(value, MutantArray())
  }
  dict.get(value).push(assignerId)
}

function getValueBy (dict, assignerId) {
  return computed([dict, assignerId], valueAssignedBy, { nextTick: true })
}

function valueAssignedBy (assignments, id) {
  for (var k in assignments) {
    if (assignments[k].includes(id)) {
      return k
    }
  }
}
