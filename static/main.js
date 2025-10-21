// /static/main.js - 최종 정리 버전

import { state } from "./state.js";
import { handleLoginSubmit, handleSignupSubmit, logout } from "./auth.js";
import {
  showModal,
  showReflectionModal,
  showWeeklyIntroModal,
  showCodingIntroModal,
} from "./learningModal.js";
import {
  initializeFirebase,
  setupAnswerListener,
  unsubscribeFromAnswers,
  markCodingIntroAsSeen,
} from "./firebase.js";
import { initializePyodide, setupDashboardFromTemplate } from "./codeEditor.js";
import {
  showView,
  showDashboardForCurrentUser,
  showMyQuestions,
  handleJoinClassClick,
  handleCreateClassSubmit,
  setupMobileTabs,
  updateDashboardUI,
} from "./ui.js";

const loadingIndicator = document.getElementById("loading-indicator");
const loadingText = document.getElementById("loading-text");
const authMessage = document.getElementById("auth-message");
const answerNotification = document.getElementById("answer-notification");

/**
 * 특정 주차, 특정 사이클의 학습 콘텐츠를 로드하고 시작합니다.
 * 일시정지 상태(`resumeState`)가 있으면 해당 상태부터 복원합니다.
 * @param {number} week - 시작할 주차
 * @param {number} cycleIndex - 시작할 사이클 인덱스 (0부터 시작)
 * @param {object | null} [resumeState=null] - 복원할 일시정지 상태
 */
export async function loadAndStartCycle(week, cycleIndex, resumeState = null) {
  try {
    const response = await fetch(`/api/scenario/week/${week}`);
    if (!response.ok) {
      if (response.status === 404) {
        return showReflectionModal(true);
      }
      throw new Error(`시나리오 로딩 실패: ${response.status}`);
    }
    state.weekData = await response.json();
    state.currentWeek = week;
    state.currentCycleIndex = cycleIndex;

    // 이 함수는 사이클 데이터를 로드하고 첫 task 모달을 보여주는 역할만 합니다.
    // 인트로 확인 로직은 learningModal.js의 handleAction('start_coding')으로 이동했습니다.
    await proceedToCycle(resumeState);
  } catch (error) {
    console.error("Failed to load and start cycle:", error);
    alert(`학습 데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    showDashboardForCurrentUser();
  }
}

/**
 * 실제 사이클을 시작하는 내부 함수입니다.
 * @param {object | null} [resumeState=null] - 복원할 일시정지 상태
 */
export async function proceedToCycle(resumeState = null) {
  await setupDashboardFromTemplate();

  if (resumeState) {
    if (resumeState.view === "dashboard") {
      showView("dashboard");
      updateDashboardUI(state.weekData.cycles[state.currentCycleIndex]);
      const codeToResume = resumeState.code || "";
      if (state.monacoEditor) state.monacoEditor.setValue(codeToResume);
      if (state.monacoEditorMobile)
        state.monacoEditorMobile.setValue(codeToResume);
    } else {
      showModal(resumeState.view);
    }
  } else {
    showModal("task");
  }
}

async function handleStartTaskClick(event) {
  const clickedButton = event.target.closest("button");
  if (clickedButton) clickedButton.classList.remove("animate-pulse");

  if (!state.currentUser) return;

  const pauseState = state.currentUser.pauseState;
  if (pauseState) {
    const { week, cycle } = state.currentUser.progress;
    try {
      await fetch("/api/pause/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.currentUser.email }),
      });
      delete state.currentUser.pauseState;
      sessionStorage.setItem("currentUser", JSON.stringify(state.currentUser));
      loadAndStartCycle(week, cycle, pauseState);
    } catch (error) {
      alert("업무 복귀 중 오류가 발생했습니다.");
    }
  } else {
    const p = state.currentUser?.progress || { week: 1, cycle: 0 };
    loadAndStartCycle(p.week, p.cycle);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  async function loadSyntaxDatabase() {
    try {
      const response = await fetch("/static/syntax.json");
      if (!response.ok)
        throw new Error("문법 데이터베이스를 불러올 수 없습니다.");
      state.syntaxDb = await response.json();
    } catch (error) {
      console.error(error);
    }
  }

  async function initializeApp() {
    await loadSyntaxDatabase();

    initializeFirebase();

    const savedUserJSON = sessionStorage.getItem("currentUser");
    if (savedUserJSON) {
      const savedUser = JSON.parse(savedUserJSON);
      if (!savedUser || !savedUser.email || !savedUser.password) {
        unsubscribeFromAnswers();
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
        if (res.ok) {
          state.currentUser = result.user;
          state.currentUser.password = savedUser.password;

          if (state.currentUser.classId && !state.currentUser.className) {
            try {
              const classRes = await fetch(
                `/api/class/${state.currentUser.classId}`
              );
              const classResult = await classRes.json();
              if (classRes.ok && classResult.classInfo) {
                state.currentUser.className = classResult.classInfo.className;
              } else {
                state.currentUser.className = "정보 로딩 실패";
              }
            } catch (classError) {
              console.error("Error fetching class details:", classError);
              state.currentUser.className = "정보 로딩 오류";
            }
          }

          sessionStorage.setItem(
            "currentUser",
            JSON.stringify(state.currentUser)
          );
          setupAnswerListener(answerNotification);

          if (state.currentUser.showWeeklyIntro) {
            showWeeklyIntroModal();
          } else {
            showDashboardForCurrentUser();
          }
        } else {
          unsubscribeFromAnswers();
          logout();
        }
      } catch (e) {
        console.error("Auto-login failed:", e);
        showView("auth-container");
      }
    } else {
      showView("auth-container");
    }

    setupEventListeners();
  }

  function setupEventListeners() {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");

    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        const success = await handleLoginSubmit(e);
        if (success) {
          authMessage.textContent = "로그인 성공!";
          authMessage.className = "mt-4 text-center text-sm text-green-400";
          setTimeout(async () => {
            if (state.currentUser.classId && !state.currentUser.className) {
              try {
                const classRes = await fetch(
                  `/api/class/${state.currentUser.classId}`
                );
                const classResult = await classRes.json();
                if (classRes.ok && classResult.classInfo) {
                  state.currentUser.className = classResult.classInfo.className;
                  sessionStorage.setItem(
                    "currentUser",
                    JSON.stringify(state.currentUser)
                  );
                } else {
                  state.currentUser.className = "정보 로딩 실패";
                }
              } catch (classError) {
                console.error(
                  "Error fetching class details after login:",
                  classError
                );
                state.currentUser.className = "정보 로딩 오류";
              }
            }
            setupAnswerListener(answerNotification);
            if (state.currentUser.showWeeklyIntro) {
              showWeeklyIntroModal();
            } else {
              showDashboardForCurrentUser();
            }
          }, 1000);
        }
      });
    }
    if (signupForm) signupForm.addEventListener("submit", handleSignupSubmit);

    const logoutHandler = () => {
      unsubscribeFromAnswers();
      logout();
    };
    document
      .getElementById("logout-btn")
      ?.addEventListener("click", logoutHandler);
    document
      .getElementById("instructor-logout-btn")
      ?.addEventListener("click", logoutHandler);

    document.getElementById("show-signup")?.addEventListener("click", (e) => {
      e.preventDefault();
      loginForm?.classList.add("hidden");
      signupForm?.classList.remove("hidden");
    });
    document.getElementById("show-login")?.addEventListener("click", (e) => {
      e.preventDefault();
      signupForm?.classList.add("hidden");
      loginForm?.classList.remove("hidden");
    });

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

    document
      .getElementById("close-my-questions-modal-btn")
      ?.addEventListener("click", () => {
        const myQuestionsModal = document.getElementById("my-questions-modal");
        myQuestionsModal?.classList.add("hidden");
      });

    answerNotification?.addEventListener("click", () => {
      showMyQuestions();
      answerNotification.classList.add("hidden");
    });

    document
      .getElementById("create-class-btn")
      ?.addEventListener("click", () => {
        const createClassModal = document.getElementById("create-class-modal");
        const createClassMsg = document.getElementById("create-class-message");
        const createClassForm = document.getElementById("create-class-form");
        if (createClassModal) createClassModal.classList.remove("hidden");
        if (createClassMsg) createClassMsg.textContent = "";
        if (createClassForm) createClassForm.reset();
        if (typeof lucide !== "undefined") lucide.createIcons();
      });
    document
      .getElementById("close-create-class-modal-btn")
      ?.addEventListener("click", () => {
        document.getElementById("create-class-modal")?.classList.add("hidden");
      });
    document
      .getElementById("create-class-form")
      ?.addEventListener("submit", handleCreateClassSubmit);

    setupMobileTabs();
  }

  initializePyodide(loadingIndicator, loadingText)
    .then(() => {
      initializeApp();
    })
    .catch((err) => {
      console.error("애플리케이션 초기화 실패:", err);
    });
});
