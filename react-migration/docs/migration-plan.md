# EduVerse 마이그레이션 상세 계획

## 1. 개요

Flask + Vanilla JavaScript 기반 EduVerse를 Spring Boot + React로 전환하는 프로젝트입니다.

---

## 2. 마이그레이션 원칙

### 2.1 기능 동등성 (Feature Parity)
- 기존 모든 기능을 새 스택에서 동일하게 구현
- 사용자 경험 유지

### 2.2 점진적 마이그레이션 (Incremental Migration)
- 모듈별로 단계적 마이그레이션
- 각 단계마다 테스트 및 검증

### 2.3 데이터 일관성 (Data Consistency)
- Firestore 데이터 구조 유지
- 기존 데이터 호환성 보장

### 2.4 성능 개선 (Performance Improvement)
- React Query 캐싱
- 코드 스플리팅
- 번들 크기 최적화

---

## 3. 백엔드 마이그레이션 (Flask → Spring Boot)

### 3.1 프로젝트 구조

#### Spring Boot 패키지 구조
```
com.logicore.eduverse
├── EduverseApplication.java          # 메인 애플리케이션
├── config/                            # 설정
│   ├── FirebaseConfig.java            # Firebase 초기화
│   ├── SecurityConfig.java            # Spring Security
│   ├── CorsConfig.java                # CORS 설정
│   └── WebMvcConfig.java              # Web MVC 설정
├── controller/                        # REST 컨트롤러
│   ├── AuthController.java            # 인증 API
│   ├── ScenarioController.java        # 시나리오 API
│   ├── ProgressController.java        # 진행도 API
│   ├── ClassController.java           # 클래스 관리 API
│   ├── QuestionController.java        # Q&A API
│   └── AnalyticsController.java       # 분석 API
├── service/                           # 비즈니스 로직
│   ├── AuthService.java
│   ├── UserService.java
│   ├── ScenarioService.java
│   ├── ClassService.java
│   ├── QuestionService.java
│   └── AnalyticsService.java
├── model/                             # 도메인 모델
│   ├── User.java
│   ├── Progress.java
│   ├── Scenario.java
│   ├── Class.java
│   ├── Question.java
│   ├── SubmissionLog.java
│   └── Reflection.java
├── dto/                               # Data Transfer Objects
│   ├── request/
│   │   ├── LoginRequest.java
│   │   ├── SignupRequest.java
│   │   ├── CreateClassRequest.java
│   │   └── ...
│   └── response/
│       ├── ApiResponse.java
│       ├── UserResponse.java
│       └── ...
├── repository/                        # 데이터 접근
│   ├── FirestoreRepository.java       # Firestore 추상 레이어
│   ├── UserRepository.java
│   ├── ScenarioRepository.java
│   └── ...
├── security/                          # 보안
│   ├── JwtTokenProvider.java          # JWT 토큰 생성/검증
│   ├── JwtAuthenticationFilter.java   # JWT 필터
│   └── CustomUserDetailsService.java  # 사용자 인증
├── exception/                         # 예외 처리
│   ├── GlobalExceptionHandler.java    # 전역 예외 핸들러
│   ├── CustomException.java
│   ├── UserNotFoundException.java
│   └── ...
└── util/                              # 유틸리티
    ├── PasswordUtil.java
    └── InviteCodeGenerator.java
```

### 3.2 주요 의존성 (pom.xml)

```xml
<dependencies>
    <!-- Spring Boot Starter -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Spring Security + JWT -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.12.3</version>
    </dependency>

    <!-- Firebase Admin SDK -->
    <dependency>
        <groupId>com.google.firebase</groupId>
        <artifactId>firebase-admin</artifactId>
        <version>9.2.0</version>
    </dependency>

    <!-- Validation -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- Lombok -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>

    <!-- Testing -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### 3.3 API 매핑 전략

각 Flask 엔드포인트를 Spring Boot로 1:1 매핑합니다.

**예시: 로그인 API**

**Flask (AS-IS)**:
```python
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data['email']
    password = data['password']
    # ... 로직
    return jsonify({"status": "success", "user": user_data})
```

**Spring Boot (TO-BE)**:
```java
@RestController
@RequestMapping("/api")
public class AuthController {

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<UserResponse>> login(
        @Valid @RequestBody LoginRequest request
    ) {
        UserResponse user = authService.login(request);
        return ResponseEntity.ok(
            ApiResponse.success("로그인 성공", user)
        );
    }
}
```

### 3.4 인증 방식 변경

**Flask**: 세션 스토리지 + 평문 비밀번호 재전송
**Spring Boot**: JWT 토큰 기반 인증

**JWT 인증 흐름**:
```
1. 사용자 로그인 → 이메일/비밀번호 전송
2. 서버: 비밀번호 검증 → JWT 토큰 발급
3. 클라이언트: 토큰을 localStorage에 저장
4. 이후 요청: Authorization 헤더에 토큰 포함
5. 서버: 토큰 검증 → 사용자 식별
```

---

## 4. 프론트엔드 마이그레이션 (Vanilla JS → React)

### 4.1 프로젝트 구조

```
src/
├── index.tsx                    # 앱 진입점
├── App.tsx                      # 루트 컴포넌트
├── components/                  # UI 컴포넌트
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── AuthLayout.tsx
│   ├── dashboard/
│   │   ├── StudentDashboard.tsx
│   │   ├── InstructorDashboard.tsx
│   │   ├── PlannerWidget.tsx
│   │   └── LearningLog.tsx
│   ├── learning/
│   │   ├── TaskModal.tsx
│   │   ├── BriefingModal.tsx
│   │   ├── LectureModal.tsx
│   │   ├── CodingIntroModal.tsx
│   │   ├── CodingDashboard.tsx
│   │   ├── ReflectionModal.tsx
│   │   └── FeedbackModal.tsx
│   ├── editor/
│   │   ├── MonacoEditor.tsx
│   │   ├── PyodideRunner.ts
│   │   ├── Terminal.tsx
│   │   └── SyntaxReference.tsx
│   ├── class/
│   │   ├── CreateClassModal.tsx
│   │   ├── JoinClassModal.tsx
│   │   └── ClassCard.tsx
│   ├── monitor/
│   │   ├── StudentMonitor.tsx
│   │   ├── LiveCodeViewer.tsx
│   │   └── QuestionList.tsx
│   ├── analytics/
│   │   ├── ClassReport.tsx
│   │   ├── GrowthChart.tsx
│   │   └── ReflectionAnalysis.tsx
│   └── common/
│       ├── Modal.tsx
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Loading.tsx
│       └── Notification.tsx
├── hooks/
│   ├── useAuth.ts               # 인증 훅
│   ├── useScenario.ts           # 시나리오 로딩
│   ├── usePyodide.ts            # Pyodide 초기화
│   ├── useMonaco.ts             # Monaco 에디터
│   ├── useFirestore.ts          # Firestore 실시간 리스너
│   └── useDebounce.ts           # 디바운스 훅
├── services/
│   ├── api.ts                   # Axios 인스턴스
│   ├── authService.ts           # 인증 API
│   ├── scenarioService.ts       # 시나리오 API
│   ├── classService.ts          # 클래스 API
│   ├── questionService.ts       # Q&A API
│   └── firestoreService.ts      # Firestore 직접 접근
├── store/
│   ├── AuthContext.tsx          # 인증 상태
│   ├── LearningContext.tsx      # 학습 상태
│   └── types.ts                 # 전역 타입
├── types/
│   ├── user.ts                  # 사용자 타입
│   ├── scenario.ts              # 시나리오 타입
│   ├── class.ts                 # 클래스 타입
│   └── api.ts                   # API 응답 타입
├── utils/
│   ├── constants.ts             # 상수 (CURRICULUM 등)
│   ├── syntaxMap.ts             # 문법 매핑
│   └── helpers.ts               # 헬퍼 함수
└── styles/
    └── globals.css              # Tailwind + 커스텀 CSS
```

### 4.2 주요 의존성 (package.json)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "react-query": "^3.39.3",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.2",
    "firebase": "^10.7.1",
    "@monaco-editor/react": "^4.6.0",
    "pyodide": "^0.25.1",
    "chart.js": "^4.4.1",
    "react-chartjs-2": "^5.2.0",
    "tailwindcss": "^3.3.6"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.8"
  }
}
```

### 4.3 컴포넌트 매핑

| Vanilla JS 모듈 | React 컴포넌트 | 상태 관리 |
|------------------|----------------|-----------|
| `main.js` | `App.tsx` | React Router |
| `auth.js` | `LoginForm.tsx`, `SignupForm.tsx` | AuthContext |
| `ui.js` | `StudentDashboard.tsx`, `InstructorDashboard.tsx` | - |
| `learningModal.js` | `TaskModal.tsx`, `BriefingModal.tsx`, `LectureModal.tsx` | LearningContext |
| `codeEditor.js` | `MonacoEditor.tsx`, `PyodideRunner.ts` | usePyodide, useMonaco |
| `firebase.js` | `firestoreService.ts`, `useFirestore.ts` | - |
| `state.js` | `AuthContext.tsx`, `LearningContext.tsx` | React Context |
| `config.js` | `utils/constants.ts` | - |

### 4.4 상태 관리 전략

#### 전역 상태: React Context API

**AuthContext** (인증 상태):
```typescript
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (data: SignupData) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

**LearningContext** (학습 상태):
```typescript
interface LearningContextType {
  currentWeek: number;
  currentCycle: number;
  weekData: Scenario | null;
  loadScenario: (week: number) => Promise<void>;
  advanceCycle: () => void;
}
```

#### 서버 상태: React Query

```typescript
// 시나리오 조회
const { data, isLoading } = useQuery({
  queryKey: ['scenario', week],
  queryFn: () => scenarioService.getScenario(week),
  staleTime: Infinity, // 시나리오는 변경되지 않음
});

// 진행도 업데이트
const mutation = useMutation({
  mutationFn: (progress: Progress) =>
    progressService.updateProgress(progress),
  onSuccess: () => {
    queryClient.invalidateQueries(['user']);
  },
});
```

### 4.5 Monaco Editor 통합

```typescript
import Editor from '@monaco-editor/react';

function MonacoEditor({ value, onChange, onMount }: Props) {
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    onMount?.(editor);

    // Live Code 전송 (debounced)
    editor.onDidChangeModelContent(() => {
      debouncedSendLiveCode(editor.getValue());
    });
  };

  return (
    <Editor
      height="400px"
      language="python"
      theme="vs-dark"
      value={value}
      onChange={onChange}
      onMount={handleEditorDidMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
      }}
    />
  );
}
```

### 4.6 Pyodide 통합

```typescript
import { loadPyodide } from 'pyodide';

export function usePyodide() {
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPyodide().then(py => {
      setPyodide(py);
      setLoading(false);
    });
  }, []);

  const runCode = async (code: string) => {
    if (!pyodide) throw new Error('Pyodide not loaded');

    // stdout/stderr 리디렉션
    await pyodide.runPythonAsync(`
      import sys, io
      sys.stdout = io.StringIO()
      sys.stderr = io.StringIO()
    `);

    try {
      await pyodide.runPythonAsync(code);
      const stdout = await pyodide.runPythonAsync('sys.stdout.getvalue()');
      return { success: stdout };
    } catch (error) {
      const stderr = await pyodide.runPythonAsync('sys.stderr.getvalue()');
      return { error: stderr || error.message };
    }
  };

  return { pyodide, loading, runCode };
}
```

---

## 5. 마이그레이션 단계별 체크리스트

### Phase 1: 환경 설정 ✅
- [x] Spring Boot 프로젝트 생성
- [x] React + TypeScript 프로젝트 생성
- [x] Firebase 설정
- [x] 개발 환경 구성

### Phase 2: 백엔드 코어 기능
- [ ] Firebase 연동
- [ ] 인증 API (JWT)
- [ ] 사용자 관리 API
- [ ] 시나리오 API
- [ ] 예외 처리

### Phase 3: 백엔드 주요 기능
- [ ] 진행도 관리 API
- [ ] 클래스 관리 API
- [ ] Q&A API
- [ ] 로깅 API
- [ ] 분석 API

### Phase 4: 프론트엔드 인증 및 대시보드
- [ ] 인증 UI
- [ ] 학습자 대시보드
- [ ] 교수자 대시보드
- [ ] 라우팅 설정

### Phase 5: 학습 시스템
- [ ] Task/Briefing/Lecture 모달
- [ ] Monaco Editor 통합
- [ ] Pyodide 통합
- [ ] 코딩 대시보드
- [ ] 제출 및 피드백

### Phase 6: 부가 기능
- [ ] 실시간 모니터링
- [ ] Q&A 시스템
- [ ] 회고 시스템
- [ ] 분석 리포트

### Phase 7: 테스트 및 최적화
- [ ] 단위 테스트 (Jest, JUnit)
- [ ] 통합 테스트
- [ ] E2E 테스트 (Playwright)
- [ ] 성능 최적화
- [ ] 번들 크기 최적화

### Phase 8: 배포
- [ ] Docker 이미지 빌드
- [ ] GCP 배포
- [ ] CI/CD 파이프라인
- [ ] 모니터링 설정

---

## 6. 마이그레이션 리스크 및 대응

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|----------|
| Pyodide 초기 로딩 시간 | 중 | Service Worker 캐싱, 프리로딩 |
| Firebase 실시간 리스너 복잡도 | 중 | Custom Hook으로 추상화 |
| 대용량 시나리오 데이터 | 중 | 페이지네이션, 캐싱 |
| 타입 정의 누락 | 중 | 점진적 타입 추가 |
| 기존 사용자 데이터 마이그레이션 | 높음 | 무중단 마이그레이션 스크립트 |

---

## 7. 성공 기준

1. **기능 완전성**: 기존 모든 기능 100% 구현
2. **성능**: 초기 로딩 시간 < 3초
3. **타입 안정성**: TypeScript 커버리지 > 90%
4. **테스트 커버리지**: 코어 로직 > 80%
5. **사용자 경험**: 기존과 동등하거나 개선

---

## 다음 단계

→ [API 매핑 가이드](./api-mapping.md)
