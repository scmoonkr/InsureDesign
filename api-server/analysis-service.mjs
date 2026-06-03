import { ObjectId } from 'mongodb'
import { getMongoDb } from './mongo.mjs'

const COL = 'insurancePlanning'

async function col() {
  const db = await getMongoDb()
  return db.collection(COL)
}

function toDoc(raw) {
  if (!raw) return null
  const { _id, ...rest } = raw
  return { id: String(_id), ...rest }
}

export async function listAnalysisDocs() {
  const c = await col()
  const rows = await c.aggregate([
    { $sort: { createdAt: -1 } },
    {
      $project: {
        title: 1, customerName: 1, agentName: 1,
        existingInsurancePdf: 1, proposalPdfs: 1, note: 1,
        createdAt: 1, updatedAt: 1,
        hasAnalysis: { $cond: [{ $ne: ['$analysisResult', null] }, true, false] },
        hasProposal: { $cond: [{ $ne: ['$proposalData', null] }, true, false] },
      },
    },
  ]).toArray()
  return rows.map(toDoc)
}

export async function getAnalysisDoc(id) {
  const c = await col()
  const raw = await c.findOne({ _id: new ObjectId(id) })
  return toDoc(raw)
}

export async function createAnalysisDoc(data) {
  const c = await col()
  const now = new Date()
  const doc = {
    title: data.title || '',
    customerName: data.customerName || '',
    agentName: data.agentName || '',
    existingInsurancePdf: data.existingInsurancePdf || null,
    proposalPdfs: Array.isArray(data.proposalPdfs) ? data.proposalPdfs.slice(0, 4) : [],
    note: data.note || '',
    analysisResult: null,
    proposalData: null,
    createdAt: now,
    updatedAt: now,
  }
  const result = await c.insertOne(doc)
  return toDoc({ ...doc, _id: result.insertedId })
}

export async function updateAnalysisDoc(id, data) {
  const c = await col()
  const set = { updatedAt: new Date() }
  const allowed = ['title', 'customerName', 'agentName', 'existingInsurancePdf',
    'proposalPdfs', 'note', 'analysisResult', 'proposalData']
  for (const f of allowed) {
    if (data[f] !== undefined) set[f] = data[f]
  }
  const result = await c.updateOne({ _id: new ObjectId(id) }, { $set: set })
  return result.matchedCount > 0
}

export async function deleteAnalysisDoc(id) {
  const c = await col()
  const result = await c.deleteOne({ _id: new ObjectId(id) })
  return result.deletedCount > 0
}
