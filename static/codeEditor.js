// /static/codeEditor.js

import { state } from "./state.js";
import { showModal } from "./learningModal.js";
// 'sendLiveCode' 함수를 firebase.js에서 가져옵니다.
import { sendLiveCode, saveProgress } from "./firebase.js"; // saveProgress도 여기서 가져올 수 있습니다. (logSubmission 대신)

let pyodide;

/**
 * Pyodide (웹 Python 실행 환경)를 로드하고 초기화합니다.
 * @param {HTMLElement} loadingIndicator - 로딩 인디케이터 DOM 요소
 * @param {HTMLElement} loadingText - 로딩 텍스트 DOM 요소
 * @returns {Promise<void>} Pyodide 로딩이 완료되면 resolve되는 Promise
 */
export function initializePyodide(loadingIndicator, loadingText) {
  return new Promise((resolve, reject) => {
    // 로딩 인디케이터와 텍스트가 존재하는지 확인
    if (loadingIndicator) loadingIndicator.classList.remove("hidden");
    if (loadingText) loadingText.textContent = "파이썬 실행 환경 로딩 중...";

    try {
      (async () => {
        // loadPyodide가 정의되어 있는지 확인 (CDN 로드 실패 대비)
        if (typeof loadPyodide === "undefined") {
          throw new Error(
            "Pyodide 라이브러리를 로드할 수 없습니다. CDN 연결을 확인하세요."
          );
        }
        pyodide = await loadPyodide();
        if (loadingText)
          loadingText.textContent = "파이썬 환경 로드 완료. 에디터 로딩 중...";

        // Monaco Editor 로더 확인
        if (typeof require === "undefined") {
          throw new Error(
            "Monaco Editor 로더(loader.min.js)를 찾을 수 없습니다."
          );
        }

        require.config({
          paths: {
            vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs", // 버전 명시 권장
          },
          "vs/nls": {
            // 언어 설정 추가 (선택 사항)
            availableLanguages: { "*": "ko" },
          },
        });

        require(["vs/editor/editor.main"], () => {
          if (loadingText) loadingText.textContent = "환경 준비 완료!";
          setTimeout(() => {
            if (loadingIndicator) loadingIndicator.classList.add("hidden");
            resolve(); // 모든 로딩 완료 후 resolve 호출
          }, 500);
        }, (err) => {
          // Monaco 로딩 실패 시 에러 처리
          throw new Error(`Monaco Editor 로딩 실패: ${err.message || err}`);
        });
      })();
    } catch (error) {
      console.error("초기화 실패:", error);
      if (loadingText)
        loadingText.textContent = `오류: ${error.message}. 페이지를 새로고침 해주세요.`;
      // loadingIndicator를 숨기지 않아 오류 상태를 사용자에게 보여줌
      reject(error); // 실패 시 reject 호출
    }
  });
}

/**
 * Pyodide 환경에서 Python 코드를 실행하고 결과를 반환합니다.
 * @param {string} code - 실행할 Python 코드
 * @returns {Promise<{success?: string, error?: string}>} 실행 결과 (성공 또는 오류)
 */
export async function runPythonCode(code) {
  if (!pyodide) {
    console.error("Pyodide가 로드되지 않았습니다.");
    return { error: "오류: Python 실행 환경이 준비되지 않았습니다." };
  }
  try {
    // 표준 출력/에러 스트림 리디렉션
    await pyodide.runPythonAsync(
      `import io, sys; sys.stdout = io.StringIO(); sys.stderr = io.StringIO();`
    );
    // 코드 실행
    let result = await pyodide.runPythonAsync(code);
    // 결과 가져오기
    let stdout = await pyodide.runPythonAsync("sys.stdout.getvalue()");
    let stderr = await pyodide.runPythonAsync("sys.stderr.getvalue()");

    // 에러가 있으면 에러 반환
    if (stderr) return { error: stderr };

    // 결과 조합 (stdout + 반환값)
    let output = stdout;
    if (result !== undefined && result !== null) {
      // stdout이 이미 줄바꿈으로 끝나지 않았다면 줄바꿈 추가
      if (output && !output.endsWith("\n")) {
        output += "\n";
      }
      output += String(result);
    }

    return { success: output || "(출력 결과 없음)" };
  } catch (error) {
    console.error("Python 코드 실행 오류:", error);
    // 오류 객체를 문자열로 변환하여 반환
    return { error: error.toString() };
  }
}

/**
 * Python 오류 메시지를 학습자 친화적으로 파싱합니다.
 * @param {string} error - 원본 오류 메시지
 * @returns {string} 파싱된 오류 메시지
 */
export function parseErrorMessage(error) {
  const errorString = String(error);

  // AssertionError 처리
  // --- 👇👇👇 정규식 수정: (.*) -> ([\s\S]*) ---
  const assertionMatch = errorString.match(/AssertionError:\s*([\s\S]*)/);
  // --- 👆👆👆 수정 완료 ---
  if (assertionMatch && assertionMatch[1]) {
    return assertionMatch[1].trim();
  }

  // 일반적인 Python 오류 (Traceback) 처리 - 마지막 줄 반환
  const lines = errorString.split("\n");
  const lastLine = lines[lines.length - 1].trim();
  if (lastLine) {
    // 흔한 에러 타입 이름 제거 (예: "NameError: name 'x' is not defined" -> "name 'x' is not defined")
    const errorTypeMatch = lastLine.match(/^[a-zA-Z_]+Error:\s*(.*)/);
    if (errorTypeMatch && errorTypeMatch[1]) {
      return errorTypeMatch[1];
    }
    return lastLine;
  }

  // 위 형식에 맞지 않으면 원본 반환
  return errorString;
}

// submission 로그 함수 (Firestore 직접 기록 방식, API 호출 대신)
async function logSubmissionToFirestore(isSuccess, errorDetails = "") {
  if (
    !state.currentUser ||
    state.currentUser.role !== "student" ||
    !state.currentUser.classId ||
    !db
  )
    return;
  try {
    const logRef = doc(collection(db, "submission_logs")); // 새 문서 참조 생성
    await setDoc(logRef, {
      // setDoc으로 ID와 함께 데이터 설정
      logId: logRef.id,
      studentEmail: state.currentUser.email,
      classId: state.currentUser.classId,
      week: state.currentWeek,
      cycle: state.currentCycleIndex,
      isSuccess: isSuccess,
      error: String(errorDetails), // 오류는 문자열로 변환
      submittedAt: serverTimestamp(), // Firestore 서버 시간 사용
    });
    console.log("Submission logged successfully.");
  } catch (err) {
    console.error("Failed to log submission:", err);
    // 사용자에게 알리지 않음 (백그라운드 작업 실패)
  }
}

/**
 * (내부 헬퍼) '코드 실행' 버튼 클릭 시 호출됩니다.
 */
async function executeCodeInDashboard(event) {
  const clickedButton = event?.target.closest("button");
  if (!state.monacoEditor) {
    console.error("Monaco Editor가 초기화되지 않았습니다.");
    return;
  }
  const code = state.monacoEditor.getValue();
  const terminalOutputs = document.querySelectorAll(".terminal-output-content");
  const runButtons = document.querySelectorAll(".run-code-btn-action");

  // 버튼 비활성화 및 UI 업데이트
  runButtons.forEach((b) => {
    b.disabled = true;
    b.classList.remove("animate-pulse"); // 혹시 깜빡이고 있었다면 제거
    // 로딩 표시 (선택 사항)
    b.innerHTML =
      '<i data-lucide="loader-2" class="animate-spin w-5 h-5 mr-2"></i> 실행 중...';
    if (typeof lucide !== "undefined") lucide.createIcons();
  });
  terminalOutputs.forEach((el) => {
    el.textContent = "Executing...";
    el.classList.remove("text-red-400", "text-green-400"); // 이전 색상 제거
  });

  // 코드 실행
  const res = await runPythonCode(code);
  const outputText = res.success ?? res.error ?? "알 수 없는 오류 발생"; // nullish coalescing 사용

  // 결과 표시
  terminalOutputs.forEach((el) => {
    el.textContent = outputText;
    if (res.error) {
      el.classList.add("text-red-400");
    } else {
      el.classList.add("text-green-400"); // 성공 시 녹색 표시 (선택 사항)
    }
  });

  // 버튼 다시 활성화
  runButtons.forEach((b) => {
    b.disabled = false;
    // 원래 버튼 텍스트 복원
    b.innerHTML =
      '<i data-lucide="play" class="w-5 h-5"></i><span>코드 실행</span>';
    if (typeof lucide !== "undefined") lucide.createIcons();
  });
}

/**
 * (내부 헬퍼) '강의회상(수업듣기)' 버튼 클릭 시 호출됩니다.
 * 클릭된 버튼의 깜빡임 효과를 제거합니다.
 */
function showLectureModal(event) {
  const clickedButton = event?.target.closest("button");
  if (clickedButton) {
    clickedButton.classList.remove("animate-pulse");
  }
  // state.weekData가 로드되었는지 확인 후 모달 표시
  if (state.weekData) {
    showModal("lecture");
  } else {
    console.warn("강의 데이터를 찾을 수 없어 강의 모달을 열 수 없습니다.");
    alert(
      "강의 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
    );
  }
}

/**
 * (내부 헬퍼) '코드 제출' 버튼 클릭 시 호출됩니다.
 */
async function submitCode(event) {
  const clickedButton = event?.target.closest("button");
  if (clickedButton) {
    clickedButton.classList.remove("animate-pulse"); // 클릭 시 깜빡임 제거
  }

  // 필수 상태 확인
  if (!state.weekData || !state.monacoEditor) {
    console.error(
      "제출 실패: weekData 또는 Monaco Editor가 준비되지 않았습니다."
    );
    alert("코드 제출 준비 중 오류가 발생했습니다. 페이지를 새로고침 해주세요.");
    return;
  }
  if (
    state.currentCycleIndex === undefined ||
    state.currentCycleIndex === null
  ) {
    console.error("제출 실패: 현재 사이클 인덱스가 유효하지 않습니다.");
    alert("현재 학습 위치 정보에 오류가 있습니다.");
    return;
  }

  const studentCode = state.monacoEditor.getValue();
  const cycleData = state.weekData.cycles[state.currentCycleIndex];

  // 사이클 데이터 유효성 검사
  if (!cycleData) {
    console.error(
      `제출 실패: Week ${state.currentWeek}, Cycle ${state.currentCycleIndex} 데이터를 찾을 수 없습니다.`
    );
    alert("현재 학습 단계 정보를 불러오는 데 실패했습니다.");
    return;
  }

  // 제출 버튼 비활성화 (선택 사항)
  const submitButtons = document.querySelectorAll(".submit-btn-action");
  submitButtons.forEach((b) => (b.disabled = true));

  try {
    // 1. 학생 코드 실행 (런타임 오류 확인)
    const studentResult = await runPythonCode(studentCode);

    if (studentResult.error) {
      const parsedError = parseErrorMessage(studentResult.error);
      // logSubmissionToFirestore(false, parsedError); // Firestore 로깅 사용
      return showModal("feedback", {
        feedbackType: "failure_runtime",
        errorMessage: parsedError,
      });
    }

    // 2. 예상 출력값 비교 (있을 경우)
    if (
      cycleData.expectedPrintOutput !== undefined &&
      cycleData.expectedPrintOutput !== null
    ) {
      const actualOutput = (studentResult.success || "").trim(); // success가 null일 수 있으므로 처리
      const expectedOutput = cycleData.expectedPrintOutput.trim();
      if (actualOutput !== expectedOutput) {
        const err = `출력값 불일치.\n기대값:\n'${expectedOutput}'\n\n실제값:\n'${actualOutput}'`;
        // logSubmissionToFirestore(false, err); // Firestore 로깅 사용
        return showModal("feedback", {
          feedbackType: "failure_logical",
          errorMessage: err,
        });
      }
    }

    // 3. 테스트 코드 실행 (있을 경우)
    if (cycleData.testCode) {
      const finalCode =
        studentCode + "\n\n# --- Test Code ---\n" + cycleData.testCode;
      const testResult = await runPythonCode(finalCode);
      if (testResult.error) {
        const parsedError = parseErrorMessage(testResult.error);
        // logSubmissionToFirestore(false, parsedError); // Firestore 로깅 사용
        return showModal("feedback", {
          feedbackType: "failure_logical",
          errorMessage: parsedError, // 테스트 실패 시에도 logical failure로 처리
        });
      }
    }

    // 모든 검증 통과 시 성공 처리
    // logSubmissionToFirestore(true); // Firestore 로깅 사용
    return showModal("feedback", { feedbackType: "success" });
  } catch (error) {
    // 예상치 못한 오류 처리 (네트워크 오류 등)
    console.error("코드 제출 중 예외 발생:", error);
    alert(`코드 제출 중 오류가 발생했습니다: ${error.message}`);
    // logSubmissionToFirestore(false, `제출 시스템 오류: ${error.message}`); // 시스템 오류 로깅
  } finally {
    // 제출 버튼 다시 활성화
    submitButtons.forEach((b) => (b.disabled = false));
  }
}

/**
 * 학습 대시보드 UI (왼쪽, 메인, 오른쪽 패널)를 템플릿으로부터 생성하고
 * Monaco Editor를 초기화합니다.
 * @returns {Promise<void>} 에디터 초기화가 완료되면 resolve되는 Promise
 */
export async function setupDashboardFromTemplate() {
  // 템플릿 복제
  const leftTemplate = document
    .getElementById("dashboard-left-template")
    ?.content.cloneNode(true);
  const mainTemplate = document
    .getElementById("dashboard-main-template")
    ?.content.cloneNode(true);
  const rightTemplate = document
    .getElementById("dashboard-right-template")
    ?.content.cloneNode(true);

  // 대상 패널 찾기
  const leftPane = document.getElementById("dashboard-left");
  const mainPane = document.getElementById("dashboard-main");
  const rightPane = document.getElementById("dashboard-right");
  const mobileTaskPane = document.getElementById("mobile-panel-task");
  const mobileCodePane = document.getElementById("mobile-panel-code");
  const mobileSyntaxPane = document.getElementById("mobile-panel-syntax");

  // 기존 내용 비우기 (중요: 에디터 재생성 전에 필요)
  [
    leftPane,
    mainPane,
    rightPane,
    mobileTaskPane,
    mobileCodePane,
    mobileSyntaxPane,
  ].forEach((p) => {
    if (p) p.innerHTML = "";
  });

  // 템플릿 삽입
  if (leftPane && leftTemplate) leftPane.appendChild(leftTemplate);
  if (mainPane && mainTemplate) mainPane.appendChild(mainTemplate);
  if (rightPane && rightTemplate) rightPane.appendChild(rightTemplate);

  // 모바일 패널에도 동일 템플릿 복제하여 삽입 (독립적인 DOM 트리 구성)
  const leftTemplateMobile = document
    .getElementById("dashboard-left-template")
    ?.content.cloneNode(true);
  if (mobileTaskPane && leftTemplateMobile)
    mobileTaskPane.appendChild(leftTemplateMobile);
  const mainTemplateMobile = document
    .getElementById("dashboard-main-template")
    ?.content.cloneNode(true);
  if (mobileCodePane && mainTemplateMobile)
    mobileCodePane.appendChild(mainTemplateMobile);
  const rightTemplateMobile = document
    .getElementById("dashboard-right-template")
    ?.content.cloneNode(true);
  if (mobileSyntaxPane && rightTemplateMobile)
    mobileSyntaxPane.appendChild(rightTemplateMobile);

  // 에디터 생성 대상 DOM 요소 찾기 (템플릿 삽입 *후*)
  const editorTargetDesktop = mainPane?.querySelector(".code-editor-content");
  const editorTargetMobile = mobileCodePane?.querySelector(
    ".code-editor-content"
  );

  // Monaco Editor 초기화 (비동기 처리)
  return new Promise((resolve, reject) => {
    require(["vs/editor/editor.main"], () => {
      // monaco 객체 확인
      if (typeof monaco === "undefined") {
        console.error("Monaco Editor 객체를 찾을 수 없습니다.");
        return reject(new Error("Monaco Editor 객체를 찾을 수 없습니다."));
      }

      const editorOptions = {
        language: "python",
        theme: "vs-dark",
        automaticLayout: true, // 컨테이너 크기 변경 시 자동 레이아웃 조정
        minimap: { enabled: false },
        wordWrap: "on", // 자동 줄바꿈
        fontSize: 14, // 폰트 크기 조정 (선택 사항)
        tabSize: 4, // 탭 크기 (선택 사항)
        insertSpaces: true, // 탭 대신 공백 사용 (선택 사항)
      };

      // 기존 에디터 인스턴스 정리 (중요!)
      if (state.monacoEditor) {
        state.monacoEditor.dispose();
        state.monacoEditor = null;
      }
      if (state.monacoEditorMobile) {
        state.monacoEditorMobile.dispose();
        state.monacoEditorMobile = null;
      }

      // 데스크탑 에디터 생성
      if (editorTargetDesktop) {
        try {
          state.monacoEditor = monaco.editor.create(
            editorTargetDesktop,
            editorOptions
          );
          // 변경 감지 리스너 설정
          state.monacoEditor.onDidChangeModelContent(() => {
            const code = state.monacoEditor.getValue();
            sendLiveCode(code); // 변경 시 Firestore로 전송
            // 모바일 에디터와 동기화 (값이 다를 경우에만)
            if (
              state.monacoEditorMobile &&
              state.monacoEditorMobile.getValue() !== code
            ) {
              state.monacoEditorMobile.setValue(code);
            }
          });
        } catch (e) {
          console.error("데스크탑 Monaco Editor 생성 실패:", e);
        }
      } else {
        console.warn(
          "데스크탑 에디터 대상(.code-editor-content)을 찾을 수 없습니다."
        );
      }

      // 모바일 에디터 생성
      if (editorTargetMobile) {
        try {
          state.monacoEditorMobile = monaco.editor.create(
            editorTargetMobile,
            editorOptions
          );
          // 변경 감지 리스너 설정
          state.monacoEditorMobile.onDidChangeModelContent(() => {
            const code = state.monacoEditorMobile.getValue();
            sendLiveCode(code); // 변경 시 Firestore로 전송
            // 데스크탑 에디터와 동기화 (값이 다를 경우에만)
            if (state.monacoEditor && state.monacoEditor.getValue() !== code) {
              state.monacoEditor.setValue(code);
            }
          });
        } catch (e) {
          console.error("모바일 Monaco Editor 생성 실패:", e);
        }
      } else {
        console.warn(
          "모바일 에디터 대상(.code-editor-content)을 찾을 수 없습니다."
        );
      }

      // 에디터 생성 후 버튼 리스너 재설정
      setupDashboardButtonListeners();

      resolve(); // 에디터 초기화 완료
    }, (err) => {
      // require 실패 시 에러 처리
      console.error("Monaco Editor 모듈 로딩 실패:", err);
      reject(new Error(`Monaco Editor 모듈 로딩 실패: ${err.message || err}`));
    });
  });
}

/**
 * 대시보드 내 버튼들의 이벤트 리스너를 설정/재설정합니다.
 * setupDashboardFromTemplate 함수 내부 및 완료 후에 호출됩니다.
 */
function setupDashboardButtonListeners() {
  // 모든 관련 버튼을 document 전체에서 찾습니다 (PC/모바일 공통 적용)
  document.querySelectorAll(".hint-btn-action").forEach((btn) => {
    // 기존 리스너 제거 후 새로 추가 (중복 방지)
    btn.removeEventListener("click", showLectureModal);
    btn.addEventListener("click", showLectureModal);
    // 기본적으로는 깜빡이지 않도록 함 (필요한 시점에 learningModal.js에서 추가)
    // btn.classList.add("animate-pulse");
  });

  document.querySelectorAll(".run-code-btn-action").forEach((btn) => {
    btn.removeEventListener("click", executeCodeInDashboard);
    btn.addEventListener("click", executeCodeInDashboard);
  });

  document.querySelectorAll(".submit-btn-action").forEach((btn) => {
    btn.removeEventListener("click", submitCode);
    btn.addEventListener("click", submitCode);
  });

  // 일시정지 버튼 리스너 (handleAction 사용)
  document.querySelectorAll(".pause-btn-action").forEach((btn) => {
    // handleAction이 전역에 정의되어 있다고 가정
    if (typeof handleAction === "function") {
      btn.onclick = () => handleAction("pause_task");
    } else {
      // handleAction이 전역에 없을 경우, 직접 함수 호출 또는 다른 방식 사용
      // 예: import { savePauseState } from './firebase.js'; 사용
      // btn.addEventListener('click', async () => { ... savePauseState 로직 ... });
      console.warn(
        "handleAction 함수를 찾을 수 없어 일시정지 버튼 리스너를 설정하지 못했습니다."
      );
    }
  });

  console.log("Dashboard button listeners updated.");
}
