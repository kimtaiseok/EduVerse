# EduVerse Frontend (React + TypeScript)

EduVerse 학습 플랫폼의 React 기반 프론트엔드 애플리케이션입니다.

## 기술 스택

- **React**: 18.2.0
- **TypeScript**: 5.2.2
- **Vite**: 5.0.8 (빌드 도구)
- **React Router**: 6.21.0 (라우팅)
- **TanStack Query**: 5.17.0 (서버 상태 관리)
- **Zustand**: 4.4.7 (클라이언트 상태 관리)
- **Tailwind CSS**: 3.4.0 (스타일링)
- **Monaco Editor**: 4.6.0 (코드 에디터)
- **Pyodide**: 0.25.1 (브라우저 Python 런타임)
- **Firebase**: 10.7.1 (실시간 DB)
- **Chart.js**: 4.4.1 (데이터 시각화)

## 시작하기

### 사전 요구사항

- Node.js 18 이상
- npm 또는 yarn

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

개발 서버가 `http://localhost:3000`에서 실행됩니다.

### 환경 변수 설정

`.env` 파일을 생성하고 다음 변수를 설정하세요:

```env
VITE_API_URL=http://localhost:8080
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_PROJECT_ID=my-python-65210-65c44
VITE_FIREBASE_AUTH_DOMAIN=my-python-65210-65c44.firebaseapp.com
```

## 프로젝트 구조

```
src/
├── components/           # React 컴포넌트
│   ├── auth/            # 인증 관련
│   ├── dashboard/       # 대시보드
│   ├── learning/        # 학습 모달
│   ├── editor/          # 코드 에디터
│   ├── monitor/         # 실시간 모니터링
│   ├── analytics/       # 분석 리포트
│   └── common/          # 공통 컴포넌트
├── hooks/               # Custom Hooks
│   ├── useAuth.ts
│   ├── usePyodide.ts
│   └── useFirestore.ts
├── services/            # API 서비스
│   ├── api.ts
│   ├── authService.ts
│   └── scenarioService.ts
├── store/               # 전역 상태
│   ├── authStore.ts
│   └── learningStore.ts
├── types/               # TypeScript 타입
│   ├── user.ts
│   ├── scenario.ts
│   └── api.ts
├── utils/               # 유틸리티
│   ├── constants.ts
│   └── helpers.ts
└── styles/              # 스타일
    └── globals.css
```

## 주요 기능

### 1. 인증
- JWT 기반 로그인/회원가입
- 자동 로그인 (토큰 기반)
- 역할 기반 접근 제어 (학습자/교수자)

### 2. 학습 시스템
- 주차별 시나리오 로딩
- Task → Briefing → Lecture → Coding 흐름
- Monaco Editor 코드 편집
- Pyodide 브라우저 Python 실행
- 실시간 코드 제출 및 피드백

### 3. 실시간 모니터링
- Firestore 리스너 기반 실시간 업데이트
- 학습자 코드 라이브 뷰
- Q&A 알림

### 4. 분석 및 리포팅
- 클래스 성과 분석
- 개인 성장 트래킹
- Chart.js 데이터 시각화

## 빌드 및 배포

### 프로덕션 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 디렉토리에 생성됩니다.

### Docker 빌드

```bash
docker build -t eduverse-frontend .
docker run -p 3000:80 eduverse-frontend
```

## 개발 가이드

### 컴포넌트 작성 규칙

1. **함수형 컴포넌트** 사용
2. **TypeScript Props** 타입 정의
3. **Custom Hook**으로 로직 분리
4. **Tailwind CSS** 클래스 사용

### 예시

```typescript
// src/components/common/Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false
}: ButtonProps) {
  const baseClasses = 'px-4 py-2 rounded-md font-bold';
  const variantClasses = variant === 'primary'
    ? 'bg-indigo-600 hover:bg-indigo-700'
    : 'bg-gray-600 hover:bg-gray-700';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${disabled ? 'opacity-50' : ''}`}
    >
      {children}
    </button>
  );
}
```

## 테스트

```bash
# 유닛 테스트 실행 (Jest)
npm run test

# E2E 테스트 실행 (Playwright)
npm run test:e2e
```

## 라이선스

EduVerse 원본 프로젝트와 동일한 라이선스 적용
