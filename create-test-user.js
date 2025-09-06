// Script to create a test user for local testing
// This helps you test the authentication flow without going through Clerk dashboard

import { ClerkAPI } from '@clerk/backend'

const clerk = new ClerkAPI({
  secretKey: process.env.CLERK_SECRET_KEY
})

async function createTestUser() {
  try {
    console.log('🧪 Creating test user for local testing...\n')
    
    const testUser = {
      emailAddress: ['test@chaidoc.local'],
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User',
      skipPasswordChecks: true, // For local testing
      skipPasswordRequirement: true // For local testing
    }
    
    const user = await clerk.users.createUser(testUser)
    
    console.log('✅ Test user created successfully!')
    console.log('📧 Email: test@chaidoc.local')
    console.log('🔑 Password: testpassword123')
    console.log('🆔 User ID:', user.id)
    console.log('\n🎯 You can now use these credentials to sign in at http://localhost:5173')
    
  } catch (error) {
    if (error.errors?.[0]?.code === 'duplicate_record') {
      console.log('ℹ️  Test user already exists')
      console.log('📧 Email: test@chaidoc.local')
      console.log('🔑 Password: testpassword123')
      console.log('\n🎯 You can use these credentials to sign in at http://localhost:5173')
    } else {
      console.error('❌ Error creating test user:', error.message)
      console.log('\n🔧 Alternative: Use any email/password in Clerk test mode')
    }
  }
}

createTestUser()
