import { getDatabase } from './database.js'

export class User {
  constructor(data) {
    this.clerkUserId = data.clerkUserId
    this.email = data.email
    this.firstName = data.firstName
    this.lastName = data.lastName
    this.createdAt = data.createdAt || new Date()
    this.lastActive = data.lastActive || new Date()
  }

  static async create(userData) {
    const db = await getDatabase()
    const users = db.collection('users')
    
    const user = new User({
      clerkUserId: userData.clerkUserId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      createdAt: new Date(),
      lastActive: new Date()
    })

    const result = await users.insertOne(user)
    return { ...user, _id: result.insertedId }
  }

  static async findByClerkId(clerkUserId) {
    const db = await getDatabase()
    const users = db.collection('users')
    return await users.findOne({ clerkUserId })
  }

  static async updateLastActive(clerkUserId) {
    const db = await getDatabase()
    const users = db.collection('users')
    return await users.updateOne(
      { clerkUserId },
      { $set: { lastActive: new Date() } }
    )
  }

  static async deleteUser(clerkUserId) {
    const db = await getDatabase()
    const users = db.collection('users')
    return await users.deleteOne({ clerkUserId })
  }
}
