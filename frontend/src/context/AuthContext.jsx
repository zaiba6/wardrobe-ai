import { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL ?? ''

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Pick up token from Google OAuth redirect (?token=...)
    const params    = new URLSearchParams(window.location.search)
    const urlToken  = params.get('token')
    if (urlToken) {
      localStorage.setItem('wardrobe_token', urlToken)
      window.history.replaceState({}, '', '/')
    }

    // Verify stored token and load user profile
    const token = localStorage.getItem('wardrobe_token')
    if (token) {
      axios
        .get(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('wardrobe_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
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
