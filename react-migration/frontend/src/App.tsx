import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { LearningPage } from './pages/LearningPage'
import { MonitorPage } from './pages/MonitorPage'
import { ReportPage } from './pages/ReportPage'
import { GrowthPage } from './pages/GrowthPage'

function App() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">로딩 중...</div>
      </div>
    )
  }

  return (
    <Routes>
      {/* 공개 라우트 */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />}
      />

      {/* 보호된 라우트 */}
      <Route
        path="/dashboard"
        element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/learning"
        element={isAuthenticated ? <LearningPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/monitor"
        element={isAuthenticated ? <MonitorPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/report"
        element={isAuthenticated ? <ReportPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/growth"
        element={isAuthenticated ? <GrowthPage /> : <Navigate to="/login" />}
      />

      {/* 기본 리다이렉트 */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />}
      />
    </Routes>
  )
}

export default App
