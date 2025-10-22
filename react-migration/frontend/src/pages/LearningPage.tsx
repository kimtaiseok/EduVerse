import { useNavigate } from 'react-router-dom'

export function LearningPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-cyan-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">학습하기</h1>
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
          <h2 className="text-3xl font-bold text-white mb-4">시네마틱 Python 학습</h2>
          <p className="text-gray-300 mb-6">
            코드 작성과 실행을 통해 Python을 학습하세요.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/20 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-3">코드 에디터</h3>
              <p className="text-gray-400 text-sm">여기에 Monaco Editor가 들어갑니다</p>
            </div>

            <div className="bg-black/20 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-3">실행 결과</h3>
              <p className="text-gray-400 text-sm">코드 실행 결과가 표시됩니다</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
