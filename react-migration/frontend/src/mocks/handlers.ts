import { http, HttpResponse } from 'msw'
import {
  getCurrentUser,
  setCurrentUser,
  findUserByEmail,
  addUser,
  type User,
} from '../utils/storage'

// API 엔드포인트
const API_BASE = '/api'

export const handlers = [
  // 로그인
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const { email, password } = await request.json() as { email: string; password: string }

    const user = findUserByEmail(email)

    if (!user || user.password !== password) {
      return HttpResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    // 비밀번호를 제외한 사용자 정보 반환
    const { password: _, ...userWithoutPassword } = user
    setCurrentUser(user)

    return HttpResponse.json({
      user: userWithoutPassword,
      token: `mock-token-${user.id}`,
    })
  }),

  // 회원가입
  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    const { email, password, name } = await request.json() as {
      email: string
      password: string
      name: string
    }

    const existingUser = findUserByEmail(email)
    if (existingUser) {
      return HttpResponse.json(
        { error: '이미 사용 중인 이메일입니다.' },
        { status: 400 }
      )
    }

    const newUser: User = {
      id: Date.now().toString(),
      email,
      password,
      name,
      role: 'student',
      createdAt: new Date().toISOString(),
    }

    addUser(newUser)
    const { password: _, ...userWithoutPassword } = newUser
    setCurrentUser(newUser)

    return HttpResponse.json({
      user: userWithoutPassword,
      token: `mock-token-${newUser.id}`,
    })
  }),

  // 로그아웃
  http.post(`${API_BASE}/auth/logout`, () => {
    setCurrentUser(null)
    return HttpResponse.json({ message: '로그아웃되었습니다.' })
  }),

  // 현재 사용자 정보
  http.get(`${API_BASE}/auth/me`, () => {
    const user = getCurrentUser()

    if (!user) {
      return HttpResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      )
    }

    const { password: _, ...userWithoutPassword } = user
    return HttpResponse.json({ user: userWithoutPassword })
  }),

  // 학습 진행 상황 조회
  http.get(`${API_BASE}/learning/progress`, () => {
    return HttpResponse.json({
      totalLessons: 10,
      completedLessons: 0,
      currentLesson: 1,
      progress: 0,
    })
  }),

  // 과제 목록 조회
  http.get(`${API_BASE}/assignments`, () => {
    return HttpResponse.json({
      assignments: [
        {
          id: '1',
          title: 'Python 기초 - 변수와 자료형',
          description: '변수 선언과 기본 자료형을 학습합니다.',
          dueDate: '2025-10-30',
          status: 'pending',
        },
        {
          id: '2',
          title: 'Python 기초 - 조건문',
          description: 'if, elif, else를 사용한 조건 분기를 학습합니다.',
          dueDate: '2025-11-05',
          status: 'pending',
        },
      ],
    })
  }),

  // 리포트 조회
  http.get(`${API_BASE}/reports`, () => {
    return HttpResponse.json({
      weeklyReport: {
        studyTime: 0,
        completedTasks: 0,
        accuracy: 0,
      },
      monthlyReport: {
        studyTime: 0,
        completedTasks: 0,
        accuracy: 0,
      },
    })
  }),
]
