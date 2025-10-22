# 컴포넌트 매핑 가이드: Vanilla JS → React

이 문서는 기존 Vanilla JavaScript 모듈을 React 컴포넌트로 변환하는 방법을 상세히 설명합니다.

---

## 1. 전역 상태 관리

### AS-IS: state.js (Vanilla JS)

```javascript
// static/state.js
export let state = {
  currentUser: null,
  currentWeek: 1,
  currentCycleIndex: 0,
  weekData: null,
  monacoEditor: null,
};
```

### TO-BE: React Context API

```typescript
// src/store/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const AuthProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 자동 로그인 시도
    const token = localStorage.getItem('token');
    if (token) {
      authService.verifyToken(token)
        .then(userData => setUser(userData))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setUser(response.user);
    localStorage.setItem('token', response.token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// src/store/LearningContext.tsx
interface LearningContextType {
  currentWeek: number;
  currentCycle: number;
  weekData: Scenario | null;
  loadScenario: (week: number) => Promise<void>;
  advanceCycle: () => void;
}

export const LearningProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [weekData, setWeekData] = useState<Scenario | null>(null);

  const loadScenario = async (week: number) => {
    const data = await scenarioService.getScenario(week);
    setWeekData(data);
    setCurrentWeek(week);
  };

  const advanceCycle = () => {
    if (weekData && currentCycle < weekData.cycles.length - 1) {
      setCurrentCycle(prev => prev + 1);
    }
  };

  return (
    <LearningContext.Provider value={{
      currentWeek,
      currentCycle,
      weekData,
      loadScenario,
      advanceCycle
    }}>
      {children}
    </LearningContext.Provider>
  );
};
```

---

## 2. 인증 컴포넌트

### AS-IS: auth.js + index.html

```javascript
// static/auth.js
export async function handleLoginSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const response = await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({
      email: formData.get('email'),
      password: formData.get('password')
    })
  });
  const result = await response.json();
  if (result.status === 'success') {
    state.currentUser = result.user;
    sessionStorage.setItem('currentUser', JSON.stringify(result.user));
  }
}
```

### TO-BE: React Component

```typescript
// src/components/auth/LoginForm.tsx
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="text-sm font-bold text-gray-400">
          이메일
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mt-2 p-3 bg-gray-700 rounded-md text-white"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-bold text-gray-400">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mt-2 p-3 bg-gray-700 rounded-md text-white"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <button
        type="submit"
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-bold"
      >
        로그인
      </button>
    </form>
  );
}

// src/hooks/useAuth.ts
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## 3. 학습 모달 컴포넌트

### AS-IS: learningModal.js

```javascript
// static/learningModal.js
export function showModal(modalType) {
  const cycleData = state.weekData.cycles[state.currentCycleIndex];

  switch (modalType) {
    case "task":
      renderTaskModal(cycleData.task);
      break;
    case "briefing":
      renderBriefingModal(cycleData.briefing);
      break;
    // ...
  }
}

function renderTaskModal(taskData) {
  const modal = document.getElementById('task-modal');
  modal.innerHTML = `
    <img src="${IMAGE_URLS.alex}" />
    <h3>${taskData.title}</h3>
    <div>${taskData.content}</div>
    <button id="task-next-btn">다음</button>
  `;
  modal.classList.remove('hidden');
}
```

### TO-BE: React Components

```typescript
// src/components/learning/TaskModal.tsx
interface TaskModalProps {
  task: Task;
  onNext: () => void;
}

export function TaskModal({ task, onNext }: TaskModalProps) {
  return (
    <Modal
      isOpen
      title="업무 지시"
      onClose={() => {}}
      size="large"
    >
      <div className="flex flex-col items-center space-y-6">
        <img
          src="/images/alex.png"
          alt="Alex"
          className="w-32 h-32 rounded-full"
        />

        <div className="text-center">
          <h3 className="text-2xl font-bold text-yellow-300">
            {task.title}
          </h3>
          <p className="text-sm text-gray-400 mt-2">
            {task.subtitle}
          </p>
        </div>

        <div
          className="task-body prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: task.content }}
        />

        <button
          onClick={onNext}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-bold"
        >
          다음
        </button>
      </div>
    </Modal>
  );
}

// src/components/learning/BriefingModal.tsx
interface BriefingModalProps {
  briefing: Briefing;
  onPrevious: () => void;
  onNext: () => void;
}

export function BriefingModal({ briefing, onPrevious, onNext }: BriefingModalProps) {
  return (
    <Modal
      isOpen
      title="실무 팁"
      onClose={() => {}}
      size="large"
    >
      <div className="flex flex-col items-center space-y-6">
        <img src="/images/sena.png" alt="Sena" className="w-32 h-32 rounded-full" />

        <div className="text-center">
          <h3 className="text-2xl font-bold text-teal-300">
            {briefing.title}
          </h3>
          <p className="text-sm text-gray-400 mt-2">
            {briefing.subtitle}
          </p>
        </div>

        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: briefing.content }}
        />

        <div className="flex space-x-4">
          <button
            onClick={onPrevious}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-md text-white"
          >
            이전
          </button>
          <button
            onClick={onNext}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-bold"
          >
            다음
          </button>
        </div>
      </div>
    </Modal>
  );
}

// src/components/learning/LectureModal.tsx
interface LectureModalProps {
  lecture: Lecture;
  onPrevious: () => void;
  onStartCoding: () => void;
}

export function LectureModal({ lecture, onPrevious, onStartCoding }: LectureModalProps) {
  return (
    <Modal
      isOpen
      title="교수님의 쪽지"
      onClose={() => {}}
      size="xlarge"
    >
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <img src="/images/prof-kim.png" alt="Prof. Kim" className="w-24 h-24 rounded-full" />
          <div>
            <h3 className="text-2xl font-bold text-purple-300">{lecture.title}</h3>
            <p className="text-sm text-gray-400 mt-1">핵심 요약: {lecture.keyTakeaway}</p>
          </div>
        </div>

        {lecture.sections.map((section, index) => (
          <LectureSection key={index} section={section} index={index} />
        ))}

        <div className="flex space-x-4 pt-6">
          <button
            onClick={onPrevious}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-md text-white"
          >
            이전
          </button>
          <button
            onClick={onStartCoding}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-md text-white font-bold"
          >
            코딩 시작
          </button>
        </div>
      </div>
    </Modal>
  );
}

// src/components/learning/LectureSection.tsx
interface LectureSectionProps {
  section: LectureSection;
  index: number;
}

export function LectureSection({ section, index }: LectureSectionProps) {
  const [output, setOutput] = useState('');
  const { runCode } = usePyodide();

  const handleRunCode = async () => {
    if (!section.code) return;
    const result = await runCode(section.code);
    setOutput(result.success || result.error || '');
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h4 className="text-lg font-bold text-yellow-300 mb-4">
        {section.heading}
      </h4>

      <TypedText text={section.text} />

      {section.code && (
        <div className="mt-4">
          <pre className="bg-gray-900 p-4 rounded-md overflow-x-auto">
            <code className="language-python">{section.code}</code>
          </pre>

          <button
            onClick={handleRunCode}
            className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            실행해보기
          </button>

          {output && (
            <pre className="mt-2 bg-black p-4 rounded-md text-green-400">
              {output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// src/components/common/TypedText.tsx
interface TypedTextProps {
  text: string;
  typeSpeed?: number;
}

export function TypedText({ text, typeSpeed = 30 }: TypedTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, typeSpeed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, typeSpeed]);

  return <p className="text-gray-300">{displayedText}</p>;
}
```

---

## 4. 코드 에디터 컴포넌트

### AS-IS: codeEditor.js

```javascript
// static/codeEditor.js
export async function setupDashboardFromTemplate() {
  state.monacoEditor = monaco.editor.create(
    document.getElementById("monaco-editor"),
    {
      value: cycleData.starterCode,
      language: "python",
      theme: "vs-dark",
    }
  );

  state.monacoEditor.onDidChangeModelContent(() => {
    sendLiveCode(state.monacoEditor.getValue());
  });
}

export async function runPythonCode(code) {
  const result = await pyodide.runPythonAsync(code);
  return { success: result };
}
```

### TO-BE: React Components

```typescript
// src/components/editor/MonacoEditor.tsx
import Editor, { OnMount } from '@monaco-editor/react';
import { useDebounce } from '@/hooks/useDebounce';
import { firestoreService } from '@/services/firestoreService';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

export function MonacoEditor({ value, onChange, onMount }: MonacoEditorProps) {
  const { user } = useAuth();
  const debouncedValue = useDebounce(value, 1000);

  // Live Code 전송
  useEffect(() => {
    if (user && user.role === 'student') {
      firestoreService.updateLiveCode(user.email, debouncedValue);
    }
  }, [debouncedValue, user]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    onMount?.(editor);

    // 키보드 단축키 설정
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      // 실행 단축키
    });
  };

  return (
    <Editor
      height="100%"
      language="python"
      theme="vs-dark"
      value={value}
      onChange={(value) => onChange(value || '')}
      onMount={handleEditorDidMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        tabSize: 4,
      }}
    />
  );
}

// src/hooks/usePyodide.ts
import { loadPyodide, PyodideInterface } from 'pyodide';

export function usePyodide() {
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPyodide()
      .then(py => {
        setPyodide(py);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const runCode = useCallback(async (code: string) => {
    if (!pyodide) {
      throw new Error('Pyodide not loaded');
    }

    try {
      // stdout/stderr 리디렉션
      await pyodide.runPythonAsync(`
        import sys, io
        sys.stdout = io.StringIO()
        sys.stderr = io.StringIO()
      `);

      await pyodide.runPythonAsync(code);
      const stdout = await pyodide.runPythonAsync('sys.stdout.getvalue()');
      const stderr = await pyodide.runPythonAsync('sys.stderr.getvalue()');

      if (stderr) {
        return { error: stderr };
      }

      return { success: stdout };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }, [pyodide]);

  return { pyodide, loading, error, runCode };
}

// src/components/editor/CodingDashboard.tsx
export function CodingDashboard() {
  const { weekData, currentCycle } = useLearning();
  const { runCode } = usePyodide();
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const cycleData = weekData?.cycles[currentCycle];

  useEffect(() => {
    if (cycleData) {
      setCode(cycleData.starterCode);
    }
  }, [cycleData]);

  const handleRunCode = async () => {
    setIsRunning(true);
    const result = await runCode(code);
    setOutput(result.success || result.error || '');
    setIsRunning(false);
  };

  const handleSubmit = async () => {
    if (!cycleData) return;

    const testCode = cycleData.testCode;
    const combinedCode = code + '\n\n' + testCode;

    const result = await runCode(combinedCode);
    const isSuccess = !result.error;

    // 로그 저장
    await logService.logSubmission({
      week: weekData!.week,
      cycle: currentCycle,
      isSuccess,
      error: result.error || '',
    });

    // 피드백 표시
    // ...
  };

  return (
    <div className="h-screen flex">
      {/* 데스크톱 레이아웃 */}
      <div className="hidden md:flex flex-1">
        <div className="w-1/2 p-4">
          <MonacoEditor value={code} onChange={setCode} />
        </div>

        <div className="w-1/2 p-4 flex flex-col">
          <div className="flex-1 bg-black rounded-md p-4 overflow-auto">
            <pre className="text-green-400">{output}</pre>
          </div>

          <div className="mt-4 flex space-x-4">
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              {isRunning ? '실행 중...' : '실행'}
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-md"
            >
              제출
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 레이아웃 (탭) */}
      <div className="md:hidden flex-1">
        <MobileTabs code={code} setCode={setCode} output={output} />
      </div>
    </div>
  );
}
```

---

## 5. 완전한 컴포넌트 매핑 테이블

| Vanilla JS 파일 | React 컴포넌트/Hook | 주요 기능 | 상태 관리 |
|-----------------|---------------------|----------|----------|
| `main.js` | `App.tsx` | 앱 초기화, 라우팅 | React Router |
| `state.js` | `AuthContext.tsx`, `LearningContext.tsx` | 전역 상태 | Context API |
| `auth.js` | `LoginForm.tsx`, `SignupForm.tsx`, `useAuth.ts` | 인증 | AuthContext |
| `ui.js` | `StudentDashboard.tsx`, `InstructorDashboard.tsx` | 대시보드 UI | - |
| `learningModal.js` | `TaskModal.tsx`, `BriefingModal.tsx`, `LectureModal.tsx` | 학습 모달 | LearningContext |
| `codeEditor.js` | `MonacoEditor.tsx`, `usePyodide.ts` | 코드 편집/실행 | Local State |
| `firebase.js` | `firestoreService.ts`, `useFirestore.ts` | Firestore 연동 | - |
| `config.js` | `utils/constants.ts` | 상수 정의 | - |
| `monitor.js` | `StudentMonitor.tsx`, `LiveCodeViewer.tsx` | 실시간 모니터링 | Firestore Listener |
| `report.js` | `ClassReport.tsx`, `GrowthChart.tsx` | 분석 리포트 | React Query |
| `growth.js` | `GrowthDashboard.tsx` | 성장 트래킹 | React Query |

---

## 다음 단계

프로젝트 구조를 생성하고 실제 구현을 시작합니다.

→ [Spring Boot 프로젝트 생성](../backend/README.md)
→ [React 프로젝트 생성](../frontend/README.md)
