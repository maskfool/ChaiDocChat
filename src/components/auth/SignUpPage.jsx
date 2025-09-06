import React, { useState } from "react"
import { FileText, Upload, MessageCircle, TrendingUp, Shield, Star, Eye, EyeOff, Mail, Lock, Bot, User } from "lucide-react"
import { useSignUp, useSignIn } from "@clerk/clerk-react"

const SignUpPage = ({ onSwitchToLogin }) => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const { signUp, setActive } = useSignUp()
  const { signIn } = useSignIn()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const result = await signUp.create({
        emailAddress: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
      })

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId })
      } else {
        setError("Sign up failed. Please try again.")
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || "An error occurred during sign up")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true)
      setError("")
      
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/",
        redirectUrlComplete: "/"
      })
    } catch (err) {
      setError(err.errors?.[0]?.message || "Google sign-up failed")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden text-white">
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24px,rgba(249,115,21,0.1)_25px,rgba(249,115,21,0.1)_26px,transparent_27px),linear-gradient(rgba(249,115,21,0.1)_24px,transparent_25px,transparent_26px,rgba(249,115,21,0.1)_27px)] bg-[length:25px_25px] animate-pulse"></div>
      </div>

      <header className="relative z-10 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#f97315] to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">DocChat AI</h1>
              <p className="text-xs text-gray-400">Intelligent Document Assistant</p>
            </div>
          </div>
          {/* <button className="rounded-xl text-white border border-[#f97315] hover:border-[#f97315] hover:bg-[#f97315] hover:text-white transition-all duration-300 bg-transparent px-3 py-1 text-sm">
            <Star className="w-3 h-3 mr-1 inline" />
            Go Pro
          </button> */}
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-120px)]">
            <div className="flex flex-col justify-center space-y-8 animate-fade-in">
              <div className="space-y-6">
                <div className="bg-[#f97315] text-white px-4 py-2 rounded-xl font-medium animate-bounce-subtle inline-flex items-center w-fit shadow-lg shadow-orange-500/25">
                  <Bot className="w-4 h-4 mr-2" />
                  AI-Powered Document Chat
                </div>

                <div className="space-y-4">
                  <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight text-white">
                    Start Your <span className="text-[#f97315] animate-pulse">Document Journey</span> Today
                  </h2>

                  <p className="text-lg lg:text-xl text-gray-400 leading-relaxed max-w-lg">
                    Join thousands of users who are already chatting with their documents using AI.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-lg">
                {[
                  { icon: Upload, title: "Multi-Format", desc: "PDF, DOCX, URLs" },
                  { icon: MessageCircle, title: "Smart Chat", desc: "Natural AI" },
                  { icon: TrendingUp, title: "Instant Insights", desc: "Real-time" },
                  { icon: Shield, title: "Secure", desc: "Protected" },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-900/30 hover:border hover:border-[#f97315]/30 transition-all duration-300 animate-slide-up group"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-[#f97315] to-orange-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 group-hover:shadow-orange-500/25 transition-all duration-300">
                      <feature.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-white text-sm group-hover:text-[#f97315] transition-colors duration-300">
                        {feature.title}
                      </h4>
                      <p className="text-xs text-gray-400">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center lg:justify-end animate-slide-in-right">
              <div className="w-full max-w-md bg-gray-900/95 backdrop-blur-md border-0 shadow-2xl rounded-2xl relative overflow-hidden group hover:shadow-[#f97315]/20 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-[#f97315] via-orange-400 to-amber-500 rounded-2xl opacity-75 animate-pulse"></div>
                <div className="absolute inset-[1px] bg-gray-900/95 rounded-2xl backdrop-blur-md"></div>

                <div className="relative z-10">
                  <div className="text-center space-y-4 pb-6 pt-8">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#f97315] to-orange-600 rounded-xl flex items-center justify-center mx-auto animate-float shadow-lg shadow-[#f97315]/25">
                      <FileText className="w-7 h-7 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-white">Create Account</h2>
                      <p className="text-gray-400 text-sm">Sign up to start chatting with your documents</p>
                    </div>
                  </div>

                  <div className="space-y-6 px-6 pb-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                      {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                          {error}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label htmlFor="firstName" className="text-gray-300 text-sm font-medium">
                            First Name
                          </label>
                          <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#f97315] transition-colors" />
                            <input
                              id="firstName"
                              type="text"
                              placeholder="John"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              required
                              className="w-full pl-10 h-12 bg-black/50 border border-gray-600 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-[#f97315]/50 focus:border-[#f97315]/50 transition-all duration-300"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="lastName" className="text-gray-300 text-sm font-medium">
                            Last Name
                          </label>
                          <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#f97315] transition-colors" />
                            <input
                              id="lastName"
                              type="text"
                              placeholder="Doe"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              required
                              className="w-full pl-10 h-12 bg-black/50 border border-gray-600 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-[#f97315]/50 focus:border-[#f97315]/50 transition-all duration-300"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="email" className="text-gray-300 text-sm font-medium">
                          Email Address
                        </label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#f97315] transition-colors" />
                          <input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full pl-10 h-12 bg-black/50 border border-gray-600 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-[#f97315]/50 focus:border-[#f97315]/50 transition-all duration-300"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="password" className="text-gray-300 text-sm font-medium">
                          Password
                        </label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#f97315] transition-colors" />
                          <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full pl-10 pr-12 h-12 bg-black/50 border border-gray-600 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-[#f97315]/50 focus:border-[#f97315]/50 transition-all duration-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#f97315] transition-colors duration-200"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="confirmPassword" className="text-gray-300 text-sm font-medium">
                          Confirm Password
                        </label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#f97315] transition-colors" />
                          <input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full pl-10 pr-12 h-12 bg-black/50 border border-gray-600 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-[#f97315]/50 focus:border-[#f97315]/50 transition-all duration-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#f97315] transition-colors duration-200"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 bg-gradient-to-r from-[#f97315] to-orange-600 text-white font-semibold rounded-xl hover:from-orange-400 hover:to-orange-500 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#f97315]/25 hover:shadow-[#f97315]/40 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? "Creating Account..." : "Create Account"}
                      </button>
                    </form>

                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-600"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-gray-900 text-gray-400">Or continue with</span>
                      </div>
                    </div>

                    <button
                      onClick={handleGoogleSignUp}
                      disabled={isLoading}
                      className="w-full h-12 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </button>

                    <div className="text-center pt-2">
                      <p className="text-gray-400 text-sm">
                        Already have an account?{" "}
                        <button 
                          onClick={onSwitchToLogin}
                          className="text-[#f97315] hover:text-orange-400 transition-colors"
                        >
                          Sign in instead
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        .animate-fade-in { animation: fade-in 0.8s ease-out; }
        .animate-slide-in-right { animation: slide-in-right 0.8s ease-out; }
        .animate-slide-up { animation: slide-up 0.6s ease-out forwards; opacity: 0; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

export default SignUpPage
