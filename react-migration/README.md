# EduVerse React + Spring Boot 마이그레이션 프로젝트

## 프로젝트 개요

EduVerse의 현재 Flask + Vanilla JS 스택을 **Spring Boot + React**로 마이그레이션하는 프로젝트입니다.

---

## 마이그레이션 전략

### 현재 스택 (AS-IS)
```
┌─────────────────────────────────┐
│   Frontend (Vanilla JS)         │
│   - ES6 Modules                 │
│   - Monaco Editor               │
│   - Pyodide                     │
│   - Firestore SDK (Client)      │
└─────────────────────────────────┘
              │ HTTP/REST
┌─────────────────────────────────┐
│   Backend (Flask/Python)        │
│   - Flask 2.3.3                 │
│   - Firebase Admin SDK          │
│   - Gunicorn                    │
└─────────────────────────────────┘
              │
┌─────────────────────────────────┐
│   Database (Firestore)          │
└─────────────────────────────────┘
```

### 목표 스택 (TO-BE)
```
┌─────────────────────────────────┐
│   Frontend (React)              │
│   - React 18.x                  │
│   - TypeScript                  │
│   - React Query (상태 관리)      │
│   - Monaco Editor               │
│   - Pyodide                     │
│   - Axios (HTTP Client)         │
└─────────────────────────────────┘
              │ HTTP/REST
┌─────────────────────────────────┐
│   Backend (Spring Boot)         │
│   - Spring Boot 3.2.x           │
│   - Java 17                     │
│   - Spring Security             │
│   - Firebase Admin SDK (Java)   │
└─────────────────────────────────┘
              │
┌─────────────────────────────────┐
│   Database (Firestore)          │
└─────────────────────────────────┘
```

---

## 프로젝트 구조

```
react-migration/
├── backend/                    # Spring Boot 백엔드
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com/logicore/eduverse/
│   │   │   │       ├── EduverseApplication.java
│   │   │   │       ├── config/
│   │   │   │       │   ├── FirebaseConfig.java
│   │   │   │       │   ├── SecurityConfig.java
│   │   │   │       │   └── CorsConfig.java
│   │   │   │       ├── controller/
│   │   │   │       │   ├── AuthController.java
│   │   │   │       │   ├── ScenarioController.java
│   │   │   │       │   ├── ProgressController.java
│   │   │   │       │   ├── ClassController.java
│   │   │   │       │   ├── QuestionController.java
│   │   │   │       │   └── AnalyticsController.java
│   │   │   │       ├── service/
│   │   │   │       │   ├── AuthService.java
│   │   │   │       │   ├── UserService.java
│   │   │   │       │   ├── ScenarioService.java
│   │   │   │       │   ├── ClassService.java
│   │   │   │       │   └── AnalyticsService.java
│   │   │   │       ├── model/
│   │   │   │       │   ├── User.java
│   │   │   │       │   ├── Scenario.java
│   │   │   │       │   ├── Class.java
│   │   │   │       │   ├── Question.java
│   │   │   │       │   └── SubmissionLog.java
│   │   │   │       ├── dto/
│   │   │   │       │   ├── LoginRequest.java
│   │   │   │       │   ├── SignupRequest.java
│   │   │   │       │   ├── ApiResponse.java
│   │   │   │       │   └── ...
│   │   │   │       ├── repository/
│   │   │   │       │   └── FirestoreRepository.java
│   │   │   │       └── exception/
│   │   │   │           ├── GlobalExceptionHandler.java
│   │   │   │           └── CustomException.java
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       ├── application-dev.yml
│   │   │       ├── application-prod.yml
│   │   │       └── firebase-service-account.json
│   │   └── test/
│   ├── pom.xml                # Maven 설정
│   ├── Dockerfile
│   └── README.md
│
├── frontend/                   # React 프론트엔드
│   ├── public/
│   │   ├── index.html
│   │   └── images/
│   ├── src/
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── SignupForm.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── StudentDashboard.tsx
│   │   │   │   ├── InstructorDashboard.tsx
│   │   │   │   └── PlannerWidget.tsx
│   │   │   ├── learning/
│   │   │   │   ├── TaskModal.tsx
│   │   │   │   ├── BriefingModal.tsx
│   │   │   │   ├── LectureModal.tsx
│   │   │   │   ├── CodingDashboard.tsx
│   │   │   │   └── ReflectionModal.tsx
│   │   │   ├── editor/
│   │   │   │   ├── MonacoEditor.tsx
│   │   │   │   ├── PyodideRunner.tsx
│   │   │   │   └── Terminal.tsx
│   │   │   ├── monitor/
│   │   │   │   ├── StudentMonitor.tsx
│   │   │   │   └── LiveCodeViewer.tsx
│   │   │   └── common/
│   │   │       ├── Modal.tsx
│   │   │       ├── Button.tsx
│   │   │       └── Loading.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useScenario.ts
│   │   │   ├── usePyodide.ts
│   │   │   └── useFirestore.ts
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── authService.ts
│   │   │   ├── scenarioService.ts
│   │   │   └── firestoreService.ts
│   │   ├── store/
│   │   │   ├── authContext.tsx
│   │   │   ├── learningContext.tsx
│   │   │   └── types.ts
│   │   ├── types/
│   │   │   ├── user.ts
│   │   │   ├── scenario.ts
│   │   │   └── api.ts
│   │   ├── utils/
│   │   │   ├── constants.ts
│   │   │   └── helpers.ts
│   │   └── styles/
│   │       └── tailwind.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── README.md
│
├── docs/
│   ├── migration-plan.md      # 상세 마이그레이션 계획
│   ├── api-mapping.md         # Flask → Spring Boot API 매핑
│   ├── component-mapping.md   # Vanilla JS → React 컴포넌트 매핑
│   └── deployment.md          # 배포 가이드
│
└── README.md                  # 현재 파일
```

---

## 마이그레이션 로드맵

### Phase 1: 프로젝트 초기 설정 (1주)
- [x] Spring Boot 프로젝트 생성
- [x] React + TypeScript 프로젝트 생성
- [x] Firebase 설정 및 연동
- [x] 기본 인프라 구성

### Phase 2: 백엔드 API 마이그레이션 (2-3주)
- [ ] 인증 API (로그인, 회원가입)
- [ ] 시나리오 API
- [ ] 진행도 관리 API
- [ ] 클래스 관리 API
- [ ] Q&A API
- [ ] 분석/리포팅 API

### Phase 3: 프론트엔드 컴포넌트 마이그레이션 (3-4주)
- [ ] 인증 UI (로그인/회원가입)
- [ ] 대시보드 (학습자/교수자)
- [ ] 학습 모달 (Task, Briefing, Lecture)
- [ ] 코딩 에디터 (Monaco + Pyodide)
- [ ] 실시간 모니터링
- [ ] 분석 리포트

### Phase 4: 통합 테스트 및 최적화 (1-2주)
- [ ] 단위 테스트 작성
- [ ] 통합 테스트
- [ ] 성능 최적화
- [ ] 보안 강화

### Phase 5: 배포 및 마이그레이션 (1주)
- [ ] 스테이징 환경 배포
- [ ] 프로덕션 배포
- [ ] 기존 시스템에서 데이터 마이그레이션
- [ ] 모니터링 설정

---

## 주요 기술 스택

### 백엔드
- **Java 17**
- **Spring Boot 3.2.x**
- **Spring Data JPA** (필요 시)
- **Spring Security** (JWT 인증)
- **Firebase Admin SDK** (Firestore 연동)
- **Lombok** (보일러플레이트 코드 감소)
- **Maven** (빌드 도구)

### 프론트엔드
- **React 18.x**
- **TypeScript 5.x**
- **React Query** (서버 상태 관리)
- **React Context API** (전역 상태)
- **React Router v6** (라우팅)
- **Axios** (HTTP 클라이언트)
- **Tailwind CSS** (스타일링)
- **Monaco Editor** (코드 에디터)
- **Pyodide** (브라우저 Python 런타임)
- **Firebase JS SDK** (실시간 리스너)
- **Vite** (빌드 도구)

---

## 주요 개선사항

### 1. 타입 안정성
- TypeScript 도입으로 컴파일 타임 에러 방지
- Java 강타입 시스템으로 런타임 에러 감소

### 2. 보안 강화
- Spring Security + JWT 기반 인증
- CORS 정책 명확화
- 입력 검증 강화 (Bean Validation)

### 3. 성능 최적화
- React Query 캐싱으로 불필요한 API 호출 감소
- 컴포넌트 최적화 (React.memo, useMemo)
- 코드 스플리팅

### 4. 유지보수성
- 모듈화된 컴포넌트 구조
- 명확한 관심사 분리 (MVC 패턴)
- 테스트 코드 작성

### 5. 개발 경험
- Hot Module Replacement (HMR)
- TypeScript IntelliSense
- 자동화된 테스트

---

## 마이그레이션 시 주의사항

### 1. Firebase 실시간 리스너
- 클라이언트에서 직접 Firestore 리스너 사용 (교수자 모니터링, Q&A 알림)
- 백엔드는 CRUD 작업만 담당

### 2. Pyodide 통합
- 기존과 동일하게 브라우저에서 Python 실행
- 초기 로딩 최적화 필요

### 3. Monaco Editor
- React 컴포넌트로 래핑
- 메모리 누수 방지 (cleanup)

### 4. 상태 관리
- 전역 상태: React Context API
- 서버 상태: React Query
- 로컬 상태: useState

---

## 시작하기

### 백엔드 실행
```bash
cd backend
mvn spring-boot:run
```

### 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
```

---

## 문서 링크

- [마이그레이션 상세 계획](./docs/migration-plan.md)
- [API 매핑 가이드](./docs/api-mapping.md)
- [컴포넌트 매핑 가이드](./docs/component-mapping.md)
- [배포 가이드](./docs/deployment.md)

---

## 기여자

- **Original Project**: EduVerse (Flask + Vanilla JS)
- **Migration Team**: React + Spring Boot 마이그레이션 팀

---

## 라이선스

EduVerse 원본 프로젝트와 동일한 라이선스 적용
