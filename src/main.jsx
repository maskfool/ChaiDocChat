import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  console.error('❌ Missing Clerk Publishable Key!')
  console.error('Please add VITE_CLERK_PUBLISHABLE_KEY to your environment variables')
  console.error('Current env:', import.meta.env)
  throw new Error('Missing Clerk Publishable Key. Please check your environment variables.')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </StrictMode>,
)
