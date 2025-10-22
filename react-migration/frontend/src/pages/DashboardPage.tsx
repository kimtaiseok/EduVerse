import { useNavigate } from 'react-router-dom'
import { authService } from '../services/auth'

export function DashboardPage() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authService.logout()
      navigate('/login')
      window.location.reload()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const menuItems = [
    { title: '학습하기', path: '/learning', description: '시네마틱 Python 학습', icon: '📚' },
    { title: '실시간 모니터', path: '/monitor', description: '학습 진행 상황 확인', icon: '📊' },
    { title: '리포트', path: '/report', description: '학습 결과 분석', icon: '📈' },
    { title: '성장 지표', path: '/growth', description: '역량 성장 추적', icon: '🌱' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">EduVerse Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">환영합니다!</h2>
          <p className="text-gray-300">시네마틱 Python 학습 서비스에서 코딩을 배워보세요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {menuItems.map((item) => (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl border border-white/20 hover:bg-white/15 cursor-pointer transition-all duration-200 hover:scale-105"
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
              <p className="text-gray-300 text-sm">{item.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
