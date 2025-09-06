import { verifyToken } from '@clerk/backend'
import { User } from '../models/User.js'

export async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No authorization token provided' 
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    // Verify the JWT token with Clerk
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY
    })

    if (!payload || !payload.sub) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      })
    }

    // Extract user information from the token
    const clerkUserId = payload.sub
    const email = payload.email_addresses?.[0]?.email_address
    const firstName = payload.first_name
    const lastName = payload.last_name

    // Check if user exists in our database, create if not
    let user = await User.findByClerkId(clerkUserId)
    
    if (!user) {
      // Create new user in our database
      user = await User.create({
        clerkUserId,
        email,
        firstName,
        lastName
      })
      console.log(`✅ New user created: ${email}`)
    } else {
      // Update last active timestamp
      await User.updateLastActive(clerkUserId)
    }

    // Add user information to request object
    req.user = {
      id: user._id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    }

    next()
  } catch (error) {
    console.error('Authentication error:', error)
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication failed' 
    })
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    })
  }
  next()
}
