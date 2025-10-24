// /static/codeEditor.js

import { state } from "./state.js";
import { showModal } from "./learningModal.js";
import { sendLiveCode, saveProgress } from "./firebase.js";

let pyodide;

// --- initializePyodide, runPythonCode, parseErrorMessage 함수는 변경 없음 ---
export function initializePyodide(loadingIndicator, loadingText) {
  return new Promise((resolve, reject) => {
    if (loadingIndicator) loadingIndicator.classList.remove("hidden");
    if (loadingText) loadingText.textContent = "파이썬 실행 환경 로딩 중...";
    try {
      (async () => {
        if (typeof loadPyodide === "undefined")
          throw new Error("Pyodide 라이브러리를 로드할 수 없습니다.");
        pyodide = await loadPyodide();
        if (loadingText)
          loadingText.textContent = "파이썬 환경 로드 완료. 에디터 로딩 중...";
        if (typeof require === "undefined")
          throw new Error("Monaco Editor 로더를 찾을 수 없습니다.");
        require.config({
          paths: {
            vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs",
          },
          "vs/nls": { availableLanguages: { "*": "ko" } },
        });
        require(["vs/editor/editor.main"], () => {
          if (loadingText) loadingText.textContent = "환경 준비 완료!";
          setTimeout(() => {
            if (loadingIndicator) loadingIndicator.classList.add("hidden");
            resolve();
          }, 500);
        }, (err) => {
          throw new Error(`Monaco Editor 로딩 실패: ${err.message || err}`);
        });
      })();
    } catch (error) {
      console.error("초기화 실패:", error);
      if (loadingText)
        loadingText.textContent = `오류: ${error.message}. 페이지를 새로고침 해주세요.`;
      reject(error);
    }
  });
}

export async function runPythonCode(code) {
  if (!pyodide)
    return { error: "오류: Python 실행 환경이 준비되지 않았습니다." };
  try {
    await pyodide.runPythonAsync(
      `import io, sys; sys.stdout = io.StringIO(); sys.stderr = io.StringIO();`
    );
    let result = await pyodide.runPythonAsync(code);
    let stdout = await pyodide.runPythonAsync("sys.stdout.getvalue()");
    let stderr = await pyodide.runPythonAsync("sys.stderr.getvalue()");
    if (stderr) return { error: stderr };
    let output = stdout;
    if (result !== undefined && result !== null) {
      if (output && !output.endsWith("\n")) output += "\n";
      output += String(result);
    }
    return { success: output || "(출력 결과 없음)" };
  } catch (error) {
    return { error: error.toString() };
  }
}

export function parseErrorMessage(error) {
  const errorString = String(error);
  const assertionMatch = errorString.match(/AssertionError:\s*([\s\S]*)/);
  if (assertionMatch && assertionMatch[1]) return assertionMatch[1].trim();
  const lines = errorString.split("\n");
  const lastLine = lines[lines.length - 1].trim();
  if (lastLine) {
    const errorTypeMatch = lastLine.match(/^[a-zA-Z_]+Error:\s*(.*)/);
    if (errorTypeMatch && errorTypeMatch[1]) return errorTypeMatch[1];
    return lastLine;
  }
  return errorString;
}

/**
 * (내부 헬퍼) '코드 실행' 버튼 클릭 시 호출됩니다.
 * ★★★ 수정: 오류 없을 때만 lucide.createIcons() 호출 ★★★
 */
async function executeCodeInDashboard(event) {
  const clickedButton = event?.target.closest("button");
  if (!state.monacoEditor) return;

  const code = state.monacoEditor.getValue();
  const terminalOutputs = document.querySelectorAll(".terminal-output-content");
  const runButtons = document.querySelectorAll(".run-code-btn-action");

  // 버튼 비활성화 및 UI 업데이트 (아이콘 렌더링은 finally에서)
  runButtons.forEach((b) => {
    b.disabled = true;
    b.classList.remove("animate-pulse");
    b.innerHTML =
      '<i data-lucide="loader-2" class="animate-spin w-5 h-5 mr-2"></i> 실행 중...';
  });
  terminalOutputs.forEach((el) => {
    el.textContent = "Executing...";
    el.classList.remove("text-red-400", "text-green-400");
  });

  let hasError = false; // 오류 발생 여부 플래그
  try {
    const res = await runPythonCode(code);
    const outputText = res.success ?? res.error ?? "알 수 없는 오류 발생";

    if (res.error) {
      hasError = true; // 오류 발생 표시
    }

    // 결과 표시
    terminalOutputs.forEach((el) => {
      el.textContent = outputText;
      el.classList.toggle("text-red-400", hasError);
      el.classList.toggle("text-green-400", !hasError);
    });
  } catch (e) {
    // 혹시 runPythonCode 자체에서 예외가 발생할 경우
    console.error("Unexpected error during runPythonCode call:", e);
    hasError = true;
    terminalOutputs.forEach((el) => {
      el.textContent = `실행 중 예외 발생: ${e.message}`;
      el.classList.add("text-red-400");
      el.classList.remove("text-green-400");
    });
  } finally {
    // 버튼 다시 활성화 및 원래 상태 복원
    runButtons.forEach((b) => {
      b.disabled = false;
      b.innerHTML =
        '<i data-lucide="play" class="w-5 h-5"></i><span>코드 실행</span>';
    });

    // ★★★ 수정: 오류가 없었을 때만 아이콘 렌더링 ★★★
    if (!hasError && typeof lucide !== "undefined") {
      try {
        lucide.createIcons();
      } catch (e) {
        console.error("Error creating lucide icons after execution:", e);
      }
    } else if (hasError) {
      // 오류 발생 시, 버튼 HTML은 복원되었지만 아이콘 렌더링은 건너뜀
      console.warn("Skipping icon rendering due to execution error.");
    }
  }
}

// --- showLectureModal 함수는 변경 없음 ---
function showLectureModal(event) {
  const clickedButton = event?.target.closest("button");
  if (clickedButton) clickedButton.classList.remove("animate-pulse");
  if (state.weekData) {
    showModal("lecture");
  } else {
    alert("강의 데이터를 불러오는 중 오류가 발생했습니다.");
  }
}

/**
 * (내부 헬퍼) '코드 제출' 버튼 클릭 시 호출됩니다.
 * 백엔드 API를 호출하여 코드 검증을 요청하고 결과를 처리합니다.
 * ★★★ 수정: 오류 없을 때만 lucide.createIcons() 호출 ★★★
 */
async function submitCode(event) {
  const clickedButton = event?.target.closest("button");
  if (clickedButton) clickedButton.classList.remove("animate-pulse");

  if (
    !state.monacoEditor ||
    !state.currentUser?.email ||
    state.currentWeek === undefined ||
    state.currentCycleIndex === undefined
  ) {
    alert("코드 제출 준비 중 오류가 발생했습니다.");
    return;
  }

  const studentCode = state.monacoEditor.getValue();
  const submitButtons = document.querySelectorAll(".submit-btn-action");
  let apiCallSuccessful = false; // API 호출 성공 여부 (네트워크/서버 오류 제외)
  let executionSuccessful = false; // 백엔드 코드 실행 성공 여부

  // 버튼 비활성화 (아이콘 렌더링은 finally에서)
  submitButtons.forEach((b) => {
    b.disabled = true;
    b.innerHTML =
      '<i data-lucide="loader-2" class="animate-spin w-5 h-5 mr-2"></i> 제출 중...';
  });

  try {
    const response = await fetch("/api/code/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: state.currentUser.email,
        week: state.currentWeek,
        cycleIndex: state.currentCycleIndex,
        studentCode: studentCode,
      }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message || `서버 응답 오류 (${response.status})`);

    apiCallSuccessful = true; // API 호출 자체는 성공

    if (result.status === "success" && result.result) {
      if (result.result.success) {
        executionSuccessful = true; // 코드 실행/검증 성공
        showModal("feedback", { feedbackType: "success" });
      } else {
        // executionSuccessful remains false
        const errorMessage = result.result.message || "알 수 없는 오류";
        showModal("feedback", {
          feedbackType: "failure_logical",
          errorMessage: errorMessage,
        });
      }
    } else {
      throw new Error(
        result.message || "서버로부터 유효하지 않은 응답을 받았습니다."
      );
    }
  } catch (error) {
    // apiCallSuccessful remains false
    console.error("코드 제출 중 예외 발생:", error);
    alert(`코드 제출 중 오류가 발생했습니다: ${error.message}`);
  } finally {
    // 버튼 다시 활성화
    submitButtons.forEach((b) => {
      b.disabled = false;
      b.innerHTML =
        '<i data-lucide="send" class="w-5 h-5"></i><span>코드 제출</span>';
    });

    // ★★★ 수정: API 호출 및 코드 실행 모두 성공했을 때만 아이콘 렌더링 ★★★
    if (
      apiCallSuccessful &&
      executionSuccessful &&
      typeof lucide !== "undefined"
    ) {
      try {
        lucide.createIcons();
      } catch (e) {
        console.error("Error creating lucide icons after submission:", e);
      }
    } else {
      console.warn(
        "Skipping icon rendering due to submission error or API failure."
      );
    }
  }
}

// --- setupDashboardFromTemplate 함수는 변경 없음 ---
export async function setupDashboardFromTemplate() {
  const leftTemplate = document
    .getElementById("dashboard-left-template")
    ?.content.cloneNode(true);
  const mainTemplate = document
    .getElementById("dashboard-main-template")
    ?.content.cloneNode(true);
  const rightTemplate = document
    .getElementById("dashboard-right-template")
    ?.content.cloneNode(true);
  const leftPane = document.getElementById("dashboard-left");
  const mainPane = document.getElementById("dashboard-main");
  const rightPane = document.getElementById("dashboard-right");
  const mobileTaskPane = document.getElementById("mobile-panel-task");
  const mobileCodePane = document.getElementById("mobile-panel-code");
  const mobileSyntaxPane = document.getElementById("mobile-panel-syntax");
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
  if (leftPane && leftTemplate) leftPane.appendChild(leftTemplate);
  if (mainPane && mainTemplate) mainPane.appendChild(mainTemplate);
  if (rightPane && rightTemplate) rightPane.appendChild(rightTemplate);
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
  const editorTargetDesktop = mainPane?.querySelector(".code-editor-content");
  const editorTargetMobile = mobileCodePane?.querySelector(
    ".code-editor-content"
  );
  return new Promise((resolve, reject) => {
    require(["vs/editor/editor.main"], () => {
      if (typeof monaco === "undefined")
        return reject(new Error("Monaco Editor 객체를 찾을 수 없습니다."));
      const editorOptions = {
        language: "python",
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: false },
        wordWrap: "on",
        fontSize: 14,
        tabSize: 4,
        insertSpaces: true,
      };
      if (state.monacoEditor) state.monacoEditor.dispose();
      if (state.monacoEditorMobile) state.monacoEditorMobile.dispose();
      state.monacoEditor = null;
      state.monacoEditorMobile = null;
      if (editorTargetDesktop) {
        try {
          state.monacoEditor = monaco.editor.create(
            editorTargetDesktop,
            editorOptions
          );
          state.monacoEditor.onDidChangeModelContent(() => {
            const code = state.monacoEditor.getValue();
            sendLiveCode(code);
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
      }
      if (editorTargetMobile) {
        try {
          state.monacoEditorMobile = monaco.editor.create(
            editorTargetMobile,
            editorOptions
          );
          state.monacoEditorMobile.onDidChangeModelContent(() => {
            const code = state.monacoEditorMobile.getValue();
            sendLiveCode(code);
            if (state.monacoEditor && state.monacoEditor.getValue() !== code) {
              state.monacoEditor.setValue(code);
            }
          });
        } catch (e) {
          console.error("모바일 Monaco Editor 생성 실패:", e);
        }
      }
      setupDashboardButtonListeners();
      resolve();
    }, (err) => {
      reject(new Error(`Monaco Editor 모듈 로딩 실패: ${err.message || err}`));
    });
  });
}

// --- setupDashboardButtonListeners 함수는 변경 없음 ---
function setupDashboardButtonListeners() {
  document.querySelectorAll(".hint-btn-action").forEach((btn) => {
    btn.removeEventListener("click", showLectureModal);
    btn.addEventListener("click", showLectureModal);
  });
  document.querySelectorAll(".run-code-btn-action").forEach((btn) => {
    btn.removeEventListener("click", executeCodeInDashboard);
    btn.addEventListener("click", executeCodeInDashboard);
  });
  document.querySelectorAll(".submit-btn-action").forEach((btn) => {
    btn.removeEventListener("click", submitCode);
    btn.addEventListener("click", submitCode);
  });
  document.querySelectorAll(".pause-btn-action").forEach((btn) => {
    if (typeof handleAction === "function")
      btn.onclick = () => handleAction("pause_task");
  });
  console.log("Dashboard button listeners updated.");
}
