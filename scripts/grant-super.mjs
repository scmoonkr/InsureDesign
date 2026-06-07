/**
 * 사용법: node scripts/grant-super.mjs <email>
 * 예)    node scripts/grant-super.mjs admin@example.com
 */
import { getMongoDb } from '../api-server/mongo.mjs'
import { loadEnv } from '../api-server/config.mjs'

loadEnv()

const email = process.argv[2]
if (!email) { console.error('Usage: node scripts/grant-super.mjs <email>'); process.exit(1) }

const db   = await getMongoDb()
const user = await db.collection('users').findOne({ email })

if (!user) { console.error(`User not found: ${email}`); process.exit(1) }

const roles    = (user.roles || []).filter(r => r.role !== 'super')
const newRoles = [...roles, { role: 'super', siteId: '*' }]

await db.collection('users').updateOne({ email }, { $set: { roles: newRoles } })

console.log(`✓ super role granted to ${email}`)
console.log('  roles:', JSON.stringify(newRoles))
process.exit(0)
