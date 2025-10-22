import { useNavigate } from 'react-router-dom'

export function GrowthPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-pink-900 to-rose-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">성장 지표</h1>
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
          <h2 className="text-3xl font-bold text-white mb-4">역량 성장 추적</h2>
          <p className="text-gray-300 mb-6">
            시간에 따른 역량 성장을 추적하고 분석합니다.
          </p>

          <div className="space-y-6">
            <div className="bg-black/20 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-3">코딩 스킬</h3>
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full" style={{ width: '0%' }}></div>
              </div>
              <p className="text-gray-400 mt-2 text-sm">현재 레벨: 초보자</p>
            </div>

            <div className="bg-black/20 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-3">문제 해결 능력</h3>
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full" style={{ width: '0%' }}></div>
              </div>
              <p className="text-gray-400 mt-2 text-sm">현재 레벨: 초보자</p>
            </div>

            <div className="bg-black/20 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-3">알고리즘 이해도</h3>
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 h-4 rounded-full" style={{ width: '0%' }}></div>
              </div>
              <p className="text-gray-400 mt-2 text-sm">현재 레벨: 초보자</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
