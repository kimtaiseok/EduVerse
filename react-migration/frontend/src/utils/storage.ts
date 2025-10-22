/**
 * 로컬 스토리지 유틸리티
 * 개발 단계에서 데이터 영속성을 위해 사용
 */

const STORAGE_KEYS = {
  CURRENT_USER: 'eduverse_current_user',
  USERS: 'eduverse_users',
  LEARNING_PROGRESS: 'eduverse_learning_progress',
  ASSIGNMENTS: 'eduverse_assignments',
  REPORTS: 'eduverse_reports',
} as const

export interface User {
  id: string
  email: string
  password: string
  name: string
  role: 'student' | 'teacher'
  createdAt: string
}

export interface LearningProgress {
  userId: string
  courseId: string
  completedLessons: string[]
  currentLesson: string
  lastAccessedAt: string
}

// 로컬 스토리지에서 데이터 가져오기
export function getStorageItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error)
    return null
  }
}

// 로컬 스토리지에 데이터 저장
export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error)
  }
}

// 로컬 스토리지에서 데이터 삭제
export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error)
  }
}

// 로컬 스토리지 초기화
export function clearStorage(): void {
  try {
    localStorage.clear()
  } catch (error) {
    console.error('Error clearing localStorage:', error)
  }
}

// 사용자 관련 함수들
export function getCurrentUser(): User | null {
  return getStorageItem<User>(STORAGE_KEYS.CURRENT_USER)
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    setStorageItem(STORAGE_KEYS.CURRENT_USER, user)
  } else {
    removeStorageItem(STORAGE_KEYS.CURRENT_USER)
  }
}

export function getAllUsers(): User[] {
  return getStorageItem<User[]>(STORAGE_KEYS.USERS) || []
}

export function addUser(user: User): void {
  const users = getAllUsers()
  users.push(user)
  setStorageItem(STORAGE_KEYS.USERS, users)
}

export function findUserByEmail(email: string): User | undefined {
  const users = getAllUsers()
  return users.find(user => user.email === email)
}

export function updateUser(userId: string, updates: Partial<User>): void {
  const users = getAllUsers()
  const index = users.findIndex(user => user.id === userId)
  if (index !== -1) {
    users[index] = { ...users[index], ...updates }
    setStorageItem(STORAGE_KEYS.USERS, users)
  }
}

// 초기 데이터 설정
export function initializeStorage(): void {
  // 기본 사용자가 없으면 생성
  const users = getAllUsers()
  if (users.length === 0) {
    const defaultUsers: User[] = [
      {
        id: '1',
        email: 'student@eduverse.com',
        password: 'student123',
        name: '학생',
        role: 'student',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        email: 'teacher@eduverse.com',
        password: 'teacher123',
        name: '선생님',
        role: 'teacher',
        createdAt: new Date().toISOString(),
      },
    ]
    setStorageItem(STORAGE_KEYS.USERS, defaultUsers)
    console.log('✅ 기본 사용자가 생성되었습니다:')
    console.log('  학생: student@eduverse.com / student123')
    console.log('  선생님: teacher@eduverse.com / teacher123')
  }
}
