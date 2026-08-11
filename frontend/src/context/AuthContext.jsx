import { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { registerAuthDeepLink } from '../lib/nativeAuth'

const API = import.meta.env.VITE_API_URL ?? ''

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

  // Store a token and load the matching profile. Used by both the web
  // redirect (?token=) and the native app's deep link (wardrobeai://auth?token=).
  const applyToken = token => {
    localStorage.setItem('wardrobe_token', token)
    return axios
      .get(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUser(res.data))
      .catch(() => localStorage.removeItem('wardrobe_token'))
  }

  useEffect(() => {
    // Native app: catch the token deep-linked back after Google sign-in.
    const cleanup = registerAuthDeepLink(token => applyToken(token))

    // Web: pick up token from the OAuth redirect (?token=...)
    const params   = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      localStorage.setItem('wardrobe_token', urlToken)
      window.history.replaceState({}, '', '/')
    }

    // Verify any stored token and load the user profile
    const token = localStorage.getItem('wardrobe_token')
    if (token) {
      applyToken(token).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }

    return cleanup
  }, [])

  // Global axios interceptor — inject Bearer token on every request
  useEffect(() => {
    const id = axios.interceptors.request.use(config => {
      const token = localStorage.getItem('wardrobe_token')
      if (token) config.headers = { ...config.headers, Authorization: `Bearer ${token}` }
      return config
    })
    return () => axios.interceptors.request.eject(id)
  }, [])

  const logout = () => {
    localStorage.removeItem('wardrobe_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
export { API }
