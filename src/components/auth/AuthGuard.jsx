import React, { useState } from "react"
import { useUser, useAuth } from "@clerk/clerk-react"
import LoginPage from "./LoginPage"
import SignUpPage from "./SignUpPage"

const AuthGuard = ({ children }) => {
  const { isSignedIn, isLoaded } = useUser()
  const { signOut } = useAuth()
  const [isLoginMode, setIsLoginMode] = useState(true)

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#f97315] to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  // Show auth pages if user is not signed in
  if (!isSignedIn) {
    return isLoginMode ? (
      <LoginPage onSwitchToSignUp={() => setIsLoginMode(false)} />
    ) : (
      <SignUpPage onSwitchToLogin={() => setIsLoginMode(true)} />
    )
  }

  // Show main app if user is signed in
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      {children}
    </div>
  )
}

export default AuthGuard
