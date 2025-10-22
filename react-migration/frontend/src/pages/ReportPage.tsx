import { useNavigate } from 'react-router-dom'

export function ReportPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900 to-red-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">리포트</h1>
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
          <h2 className="text-3xl font-bold text-white mb-4">학습 결과 분석</h2>
          <p className="text-gray-300 mb-6">
            학습 결과를 분석하고 리포트를 확인하세요.
          </p>

          <div className="space-y-6">
            <div className="bg-black/20 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-3">주간 리포트</h3>
              <p className="text-gray-400">이번 주 학습 데이터가 표시됩니다</p>
            </div>

            <div className="bg-black/20 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-3">월간 리포트</h3>
              <p className="text-gray-400">이번 달 학습 데이터가 표시됩니다</p>
            </div>

            <div className="bg-black/20 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-3">성과 분석</h3>
              <p className="text-gray-400">학습 성과 분석 차트가 표시됩니다</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
