// /static/main.js - 수정됨: 레벨 설정 모달 이벤트 리스너 추가

import { state } from "./state.js";
import { handleLoginSubmit, handleSignupSubmit, logout } from "./auth.js";
import {
  showModal,
  showReflectionModal,
  showWeeklyIntroModal,
} from "./learningModal.js";
import {
  initializeFirebase,
  setupAnswerListener,
  unsubscribeFromAnswers,
  clearPauseState,
} from "./firebase.js";
import { initializePyodide, setupDashboardFromTemplate } from "./codeEditor.js";
// --- 👇👇👇 ui.js에서 새 함수들 import ---
import {
  showView,
  showDashboardForCurrentUser,
  showMyQuestions,
  handleJoinClassClick,
  handleCreateClassSubmit,
  setupMobileTabs,
  updateDashboardUI,
  showLevelSettingModal, // <--- 추가
  closeLevelSettingModal, // <--- 추가
  handleSaveLevel, // <--- 추가
} from "./ui.js";
// --- 👆👆👆 ui.js import 수정 완료 ---

const loadingIndicator = document.getElementById("loading-indicator");
const loadingText = document.getElementById("loading-text");
const authMessage = document.getElementById("auth-message");
const answerNotification = document.getElementById("answer-notification");

// loadAndStartCycle 함수는 이전 수정 상태 유지 (userEmail 파라미터 포함)
export async function loadAndStartCycle(week, cycleIndex, resumeState = null) {
  try {
    const userEmail = state.currentUser?.email;
    if (!userEmail) {
      throw new Error(
        "사용자 이메일 정보를 찾을 수 없습니다. 로그인이 필요합니다."
      );
    }
    const response = await fetch(
      `/api/scenario/week/${week}?userEmail=${encodeURIComponent(userEmail)}`
    );

    if (!response.ok) {
      if (response.status === 404 && week > 1) {
        return showReflectionModal(true);
      }
      throw new Error(`시나리오 로딩 실패 (주차 ${week}): ${response.status}`);
    }
    state.weekData = await response.json();
    state.currentWeek = week;
    state.currentCycleIndex = cycleIndex;

    console.log("Proceeding to cycle directly...");
    await proceedToCycle(resumeState);
  } catch (error) {
    console.error("Failed to load and start cycle:", error);
    alert(
      `학습 데이터를 불러오는 중 오류가 발생했습니다: ${error.message}\n시작 화면으로 돌아갑니다.`
    );
    showDashboardForCurrentUser();
  }
}

// proceedToCycle 함수는 변경 없음
export async function proceedToCycle(resumeState = null) {
  try {
    console.log(
      `Proceeding to cycle ${
        state.currentCycleIndex
      } (Resume: ${!!resumeState})`
    );
    await setupDashboardFromTemplate();
    console.log("Dashboard template setup complete.");

    if (resumeState) {
      console.log("Resuming from pause state:", resumeState);
      if (resumeState.view === "dashboard") {
        showView("dashboard");
        if (state.weekData?.cycles?.[state.currentCycleIndex]) {
          updateDashboardUI(state.weekData.cycles[state.currentCycleIndex]);
          console.log("Dashboard UI updated for resume.");
        } else {
          console.error(
            "Cannot update UI: Missing cycle data for resume.",
            state.weekData,
            state.currentCycleIndex
          );
          showDashboardForCurrentUser();
          return;
        }
        const codeToResume = resumeState.code || "";
        console.log("Restoring code:", codeToResume.substring(0, 50) + "...");
        if (state.monacoEditor) state.monacoEditor.setValue(codeToResume);
        if (state.monacoEditorMobile)
          state.monacoEditorMobile.setValue(codeToResume);

        requestAnimationFrame(() => {
          console.log("Requesting animation frame for layout/focus.");
          if (state.monacoEditor) state.monacoEditor.layout();
          if (state.monacoEditorMobile) state.monacoEditorMobile.layout();
          setTimeout(() => {
            if (state.monacoEditor) {
              state.monacoEditor.focus();
              console.log("Desktop editor focused.");
            }
          }, 150);
        });
      } else {
        console.log(`Resuming to modal view: ${resumeState.view}`);
        showModal(resumeState.view);
      }
    } else {
      console.log("Showing 'task' modal for new cycle.");
      showModal("task");
    }
  } catch (error) {
    console.error("Error in proceedToCycle:", error);
    alert(`학습 화면을 준비하는 중 오류가 발생했습니다: ${error.message}`);
    showDashboardForCurrentUser();
  }
}

// handleStartTaskClick 함수는 변경 없음
async function handleStartTaskClick(event) {
  const clickedButton = event?.target.closest("button");
  if (clickedButton) clickedButton.classList.remove("animate-pulse");
  if (!state.currentUser) {
    alert("로그인 정보가 없습니다.");
    showView("auth-container");
    return;
  }
  const pauseState = state.currentUser.pauseState;
  if (pauseState) {
    console.log("Resuming task...");
    const { week, cycle } = state.currentUser.progress || { week: 1, cycle: 0 };
    try {
      await clearPauseState();
      loadAndStartCycle(week, cycle, pauseState);
    } catch (error) {
      console.error("Error resuming task:", error);
    }
  } else {
    console.log("Starting new task...");
    const p = state.currentUser.progress || { week: 1, cycle: 0 };
    loadAndStartCycle(p.week, p.cycle);
  }
}

// --- 애플리케이션 초기화 및 이벤트 리스너 설정 ---
document.addEventListener("DOMContentLoaded", () => {
  async function loadSyntaxDatabase() {
    try {
      const response = await fetch("/static/syntax.json");
      if (!response.ok) throw new Error("문법 데이터베이스 로딩 실패.");
      state.syntaxDb = await response.json();
      console.log("Syntax DB loaded.");
    } catch (error) {
      console.error(error);
    }
  }

  async function initializeApp() {
    console.log("Initializing app...");
    await loadSyntaxDatabase();
    initializeFirebase();

    const savedUserJSON = sessionStorage.getItem("currentUser");
    if (savedUserJSON) {
      console.log("Found user in session storage. Attempting auto-login...");
      const savedUser = JSON.parse(savedUserJSON);
      if (!savedUser || !savedUser.email || !savedUser.password) {
        console.warn("Invalid user data in session storage. Logging out.");
        logout();
        return;
      }
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: savedUser.email,
            password: savedUser.password,
          }),
        });
        const result = await res.json();
        if (res.ok && result.user) {
          console.log("Auto-login successful.");
          state.currentUser = result.user;
          state.currentUser.password = savedUser.password; // 비밀번호 재저장

          if (state.currentUser.classId && !state.currentUser.className) {
            console.log("Fetching class name for", state.currentUser.classId);
            try {
              const classRes = await fetch(
                `/api/class/${state.currentUser.classId}`
              );
              if (!classRes.ok) throw new Error("Failed to fetch class name");
              const classResult = await classRes.json();
              state.currentUser.className =
                classResult.classInfo?.className || "정보 없음";
            } catch (classError) {
              console.error("Error fetching class details:", classError);
              state.currentUser.className = "오류";
            }
          }
          sessionStorage.setItem(
            "currentUser",
            JSON.stringify(state.currentUser)
          );

          if (state.currentUser.role === "student") {
            setupAnswerListener(answerNotification);
          }

          if (state.currentUser.showWeeklyIntro) {
            console.log("Showing weekly intro...");
            showWeeklyIntroModal();
          } else {
            console.log("Showing dashboard for current user...");
            showDashboardForCurrentUser();
          }
        } else {
          console.warn("Auto-login failed:", result.message);
          logout();
        }
      } catch (e) {
        console.error("Auto-login fetch error:", e);
        logout();
      }
    } else {
      console.log("No user in session storage. Showing auth screen.");
      showView("auth-container");
    }

    setupEventListeners(); // 이벤트 리스너 설정
    console.log("App initialization complete.");
  } // End of initializeApp

  // --- 👇👇👇 setupEventListeners 함수 수정 (레벨 설정 관련 리스너 추가) ---
  function setupEventListeners() {
    console.log("Setting up event listeners...");
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const authMessage = document.getElementById("auth-message");

    // Login Form Submission
    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (authMessage) {
          authMessage.textContent = "로그인 시도 중...";
          authMessage.className = "mt-4 text-center text-sm text-yellow-400";
        }
        const success = await handleLoginSubmit(e);
        if (success && state.currentUser) {
          if (authMessage) {
            authMessage.textContent = "로그인 성공! 잠시만 기다려주세요...";
            authMessage.className = "mt-4 text-center text-sm text-green-400";
          }

          if (state.currentUser.classId && !state.currentUser.className) {
            console.log("Fetching class name after login...");
            try {
              const classRes = await fetch(
                `/api/class/${state.currentUser.classId}`
              );
              if (!classRes.ok) throw new Error("Failed to fetch class name");
              const classResult = await classRes.json();
              state.currentUser.className =
                classResult.classInfo?.className || "정보 없음";
            } catch (classError) {
              console.error("Error fetching class details:", classError);
              state.currentUser.className = "오류";
            }
            sessionStorage.setItem(
              "currentUser",
              JSON.stringify(state.currentUser)
            );
          }

          if (state.currentUser.role === "student") {
            setupAnswerListener(answerNotification);
          }

          if (state.currentUser.showWeeklyIntro) {
            showWeeklyIntroModal();
          } else {
            showDashboardForCurrentUser();
          }
        } else if (!success) {
          console.log("Login failed (handled in auth.js).");
        }
      });
    } else {
      console.warn("Login form not found.");
    }

    // Signup Form Submission
    if (signupForm) {
      signupForm.addEventListener("submit", handleSignupSubmit);
    } else {
      console.warn("Signup form not found.");
    }

    // Logout Buttons
    const logoutHandler = () => {
      console.log("Logout requested.");
      unsubscribeFromAnswers();
      logout();
    };
    document
      .getElementById("logout-btn")
      ?.addEventListener("click", logoutHandler);
    document
      .getElementById("instructor-logout-btn")
      ?.addEventListener("click", logoutHandler);

    // Auth Screen Toggle Buttons
    document.getElementById("show-signup")?.addEventListener("click", (e) => {
      e.preventDefault();
      loginForm?.classList.add("hidden");
      signupForm?.classList.remove("hidden");
      if (authMessage) authMessage.textContent = "";
    });
    document.getElementById("show-login")?.addEventListener("click", (e) => {
      e.preventDefault();
      signupForm?.classList.add("hidden");
      loginForm?.classList.remove("hidden");
      if (authMessage) authMessage.textContent = "";
    });

    // Student Start Screen Buttons
    document
      .getElementById("start-task-btn")
      ?.addEventListener("click", handleStartTaskClick);
    document
      .getElementById("my-questions-btn")
      ?.addEventListener("click", showMyQuestions);
    document
      .getElementById("view-growth-btn")
      ?.addEventListener("click", () => {
        window.location.href = "/growth";
      });
    document
      .getElementById("join-class-btn")
      ?.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (btn) btn.classList.remove("animate-pulse");
        handleJoinClassClick();
      });

    // --- 👇 레벨 설정 버튼 리스너 추가 ---
    document
      .getElementById("level-setting-btn")
      ?.addEventListener("click", showLevelSettingModal);
    // --- 👆 레벨 설정 버튼 리스너 추가 완료 ---

    // My Questions Modal Close Button
    document
      .getElementById("close-my-questions-modal-btn")
      ?.addEventListener("click", () => {
        document.getElementById("my-questions-modal")?.classList.add("hidden");
      });

    // Answer Notification Click
    answerNotification?.addEventListener("click", () => {
      showMyQuestions();
      answerNotification.classList.add("hidden");
    });

    // Instructor Dashboard Buttons
    document
      .getElementById("create-class-btn")
      ?.addEventListener("click", () => {
        /* ... (기존 코드 유지) ... */
        const createClassModal = document.getElementById("create-class-modal");
        const createClassMsg = document.getElementById("create-class-message");
        const createClassForm = document.getElementById("create-class-form");
        if (createClassModal) createClassModal.classList.remove("hidden");
        if (createClassMsg) createClassMsg.textContent = "";
        if (createClassForm) createClassForm.reset();
        requestAnimationFrame(() => {
          if (typeof lucide !== "undefined") lucide.createIcons();
        });
      });
    document
      .getElementById("close-create-class-modal-btn")
      ?.addEventListener("click", () => {
        document.getElementById("create-class-modal")?.classList.add("hidden");
      });
    document
      .getElementById("create-class-form")
      ?.addEventListener("submit", handleCreateClassSubmit);

    // --- 👇 레벨 설정 모달 내부 버튼 리스너 추가 ---
    document
      .getElementById("close-level-modal-btn")
      ?.addEventListener("click", closeLevelSettingModal);
    document
      .getElementById("save-level-btn")
      ?.addEventListener("click", handleSaveLevel);
    // --- 👆 레벨 설정 모달 내부 버튼 리스너 추가 완료 ---

    // Mobile Tabs Setup
    setupMobileTabs();

    console.log("Event listeners set up.");
  } // End of setupEventListeners
  // --- 👆👆👆 setupEventListeners 함수 수정 완료 👆👆👆 ---

  // --- Initialize Pyodide then the App ---
  console.log("Starting Pyodide initialization...");
  initializePyodide(loadingIndicator, loadingText)
    .then(() => {
      console.log("Pyodide initialized successfully.");
      initializeApp();
    })
    .catch((err) => {
      console.error("Critical initialization failure (Pyodide or App):", err);
      if (loadingText)
        loadingText.textContent = `오류: 앱 로딩 실패 (${err.message}). 새로고침 해주세요.`;
    });
}); // End of DOMContentLoaded
