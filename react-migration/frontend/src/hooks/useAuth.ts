import { useState, useEffect } from 'react'
import { authService, type AuthUser } from '../services/auth'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await authService.checkAuth()
      setUser(currentUser)
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  return {
    user,
    isAuthenticated: !!user,
    isLoading
  }
}
