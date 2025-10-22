/**
 * 인증 서비스 (Firebase 대체)
 * MSW와 로컬 스토리지를 사용한 모킹 인증
 */

import { getCurrentUser, setCurrentUser, initializeStorage } from '../utils/storage'

const API_BASE = '/api'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'student' | 'teacher'
  createdAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
}

class AuthService {
  constructor() {
    // 로컬 스토리지 초기화
    initializeStorage()
  }

  async login(credentials: LoginCredentials): Promise<AuthUser> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '로그인에 실패했습니다.')
    }

    const data = await response.json()
    return data.user
  }

  async register(data: RegisterData): Promise<AuthUser> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '회원가입에 실패했습니다.')
    }

    const result = await response.json()
    return result.user
  }

  async logout(): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
    })
    setCurrentUser(null)
  }

  getCurrentUser(): AuthUser | null {
    const user = getCurrentUser()
    if (!user) return null

    const { password: _, ...authUser } = user
    return authUser as AuthUser
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null
  }

  async checkAuth(): Promise<AuthUser | null> {
    const user = getCurrentUser()
    if (!user) return null

    try {
      const response = await fetch(`${API_BASE}/auth/me`)
      if (!response.ok) {
        setCurrentUser(null)
        return null
      }

      const data = await response.json()
      return data.user
    } catch (error) {
      console.error('Auth check failed:', error)
      return null
    }
  }
}

export const authService = new AuthService()
