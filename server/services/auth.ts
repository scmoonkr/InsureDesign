import { getMongoDb } from '../utils/mongo'

type SocialUserInput = {
  provider: 'naver' | 'kakao'
  providerId: string
  name: string
  nickname?: string
  email?: string
  avatarUrl?: string
  gender?: string
  dob?: string
}

export async function upsertSocialUser(input: SocialUserInput) {
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
    ...(input.dob ? { dob: input.dob } : {}),
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
