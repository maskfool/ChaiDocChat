// src/api/client.js
import axios from "axios"
import { useAuth } from "@clerk/clerk-react"

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE || "http://localhost:5001") + "/api/v1",
  headers: { "Content-Type": "application/json" },
  timeout: 30000, // 30 second timeout
})

// Request interceptor for authentication and logging
api.interceptors.request.use(
  async (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    
    // Get the auth token from Clerk
    const token = await window.Clerk?.session?.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API] Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default api
