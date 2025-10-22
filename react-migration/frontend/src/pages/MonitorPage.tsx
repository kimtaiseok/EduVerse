import { useNavigate } from 'react-router-dom'

export function MonitorPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">실시간 모니터</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            대시보드로
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/20">
          <h2 className="text-3xl font-bold text-white mb-4">학습 진행 상황</h2>
          <p className="text-gray-300 mb-6">
            실시간으로 학습 진행 상황을 모니터링합니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black/20 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-2">진행 중인 과제</h3>
              <p className="text-3xl font-bold text-green-400">0</p>
            </div>

            <div className="bg-black/20 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-2">완료한 과제</h3>
              <p className="text-3xl font-bold text-blue-400">0</p>
            </div>

            <div className="bg-black/20 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-2">학습 시간</h3>
              <p className="text-3xl font-bold text-purple-400">0h</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
