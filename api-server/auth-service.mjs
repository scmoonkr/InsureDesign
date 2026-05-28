import { getMongoDb } from './mongo.mjs'
import { ObjectId } from 'mongodb'

function toPublicUser(user) {
  if (!user) {
    return null
  }

  return {
    id: String(user._id),
    provider: user.provider,
    providerId: user.providerId,
    name: user.name,
    nickname: user.nickname,
    email: user.email,
    avatarUrl: user.avatarUrl,
    gender: user.gender,
    dob: user.dob,
    status: user.status,
    roles: user.roles || [],
  }
}

export async function upsertSocialUser(input) {
  const db = await getMongoDb()
  const users = db.collection('users')
  const now = new Date()
  const setFields = {
    provider: input.provider,
    providerId: input.providerId,
    name: input.name,
    nickname: input.nickname,
    email: input.email,
    avatarUrl: input.avatarUrl,
    gender: input.gender,
    status: 'active',
    lastLoginAt: now,
    updatedAt: now,
  }

  if (input.dob) {
    setFields.dob = input.dob
  }

  const result = await users.findOneAndUpdate(
    {
      provider: input.provider,
      providerId: input.providerId,
    },
    {
      $set: setFields,
      $setOnInsert: {
        roles: [],
        createdAt: now,
        isDeleted: false,
        deletedAt: null,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
    },
  )

  if (!result) {
    throw new Error('Failed to upsert social user')
  }

  return result
}

export async function getUserById(userId) {
  if (!ObjectId.isValid(userId)) {
    return null
  }

  const db = await getMongoDb()
  const user = await db.collection('users').findOne({
    _id: new ObjectId(userId),
    isDeleted: { $ne: true },
  })

  return toPublicUser(user)
}

export async function listUsers({ limit = 100 } = {}) {
  const db = await getMongoDb()
  const users = await db.collection('users')
    .find({ isDeleted: { $ne: true } })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(limit)
    .toArray()

  return users.map(toPublicUser)
}

export async function updateUserProfile(userId, input) {
  if (!ObjectId.isValid(userId)) {
    return null
  }

  const db = await getMongoDb()
  const now = new Date()
  const setFields = {
    name: input.name,
    nickname: input.nickname || null,
    gender: input.gender || null,
    updatedAt: now,
  }

  if ('status' in input) {
    setFields.status = input.status || 'pending'
  }

  if ('dob' in input) {
    setFields.dob = input.dob || null
  }

  if ('avatarUrl' in input) {
    setFields.avatarUrl = input.avatarUrl || null
  }

  const user = await db.collection('users').findOneAndUpdate(
    {
      _id: new ObjectId(userId),
      isDeleted: { $ne: true },
    },
    { $set: setFields },
    { returnDocument: 'after' },
  )

  return toPublicUser(user)
}

export async function deleteUserById(userId) {
  if (!ObjectId.isValid(userId)) {
    return false
  }

  const db = await getMongoDb()
  const now = new Date()
  const result = await db.collection('users').updateOne(
    {
      _id: new ObjectId(userId),
      isDeleted: { $ne: true },
    },
    {
      $set: {
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      },
    },
  )

  return result.modifiedCount > 0
}
