// /static/ui.js - 수정됨: 레벨 설정 모달 관련 함수 추가

import { state } from "./state.js";
import { CURRICULUM, IMAGE_URLS, syntaxMap } from "./config.js";

// --- 👇👇👇 모달 관련 DOM 요소 참조 추가 ---
const loadingIndicator = document.getElementById("loading-indicator");
const pageBody = document.getElementById("page-body");
const myQuestionsModal = document.getElementById("my-questions-modal");
const myQuestionsList = document.getElementById("my-questions-list");
const answerNotification = document.getElementById("answer-notification");
// 레벨 설정 모달 요소
const levelSettingModal = document.getElementById("level-setting-modal");
const closeLevelModalBtn = document.getElementById("close-level-modal-btn");
const saveLevelBtn = document.getElementById("save-level-btn");
const levelRadioButtons = document.querySelectorAll('input[name="user_level"]');
const levelSettingMessage = document.getElementById("level-setting-message");
// --- 👆👆👆 모달 관련 DOM 요소 참조 추가 완료 ---

// showView 함수는 변경 없음
export function showView(viewId) {
  [
    loadingIndicator,
    document.getElementById("auth-container"),
    document.getElementById("start-screen"),
    document.getElementById("dashboard"),
    document.getElementById("instructor-dashboard"),
    document.getElementById("modal-container"),
    myQuestionsModal,
    levelSettingModal, // levelSettingModal 숨김 처리 추가
  ].forEach((view) => view && view.classList.add("hidden"));

  if (answerNotification) answerNotification.classList.add("hidden");

  // ★★★★★ 여기부터 수정 ★★★★★
  // 뷰 전환 시, 현재 모달 타입을 초기화합니다.
  if (
    viewId === "dashboard" ||
    viewId === "start-screen" ||
    viewId === "instructor-dashboard"
  ) {
    state.currentModalType = null;
  }
  // ★★★★★ 여기까지 수정 ★★★★★

  if (pageBody) {
    if (viewId === "start-screen" || viewId === "instructor-dashboard") {
      pageBody.classList.remove("overflow-hidden");
      if (viewId === "start-screen" && state.currentUser?.role === "student") {
        pageBody.classList.add("planner-background");
      } else {
        pageBody.classList.remove("planner-background");
      }
    } else {
      pageBody.classList.add("overflow-hidden");
      pageBody.classList.remove("planner-background");
    }
  }

  const viewToShow = document.getElementById(viewId);
  if (viewToShow) {
    viewToShow.classList.remove("hidden");
    requestAnimationFrame(() => {
      if (typeof lucide !== "undefined") {
        try {
          lucide.createIcons();
        } catch (e) {
          console.error("Lucide icon creation failed:", e);
        }
      }
    });
  }
}

// showDashboardForCurrentUser 함수는 변경 없음
export function showDashboardForCurrentUser() {
  if (!state.currentUser) {
    showView("auth-container");
    return;
  }
  if (state.currentUser.role === "instructor") {
    if (pageBody) pageBody.classList.remove("planner-background");
    fetchAndDisplayClasses();
    showView("instructor-dashboard");
  } else {
    if (pageBody) pageBody.classList.add("planner-background");
    updatePortalDashboard();
    showView("start-screen");
  }
}

// updatePortalDashboard 함수는 변경 없음 (버튼 ID는 index.html에서 이미 수정됨)
export function updatePortalDashboard() {
  if (!state.currentUser) return;
  const progress = state.currentUser.progress || { week: 1, cycle: 0 };
  const currentWeek = progress.week;
  const pauseState = state.currentUser.pauseState;
  const userInfoElem = document.getElementById("user-info");
  if (userInfoElem) userInfoElem.textContent = `${state.currentUser.name}님`;
  const plannerDateElem = document.getElementById("planner-date");
  if (plannerDateElem)
    plannerDateElem.textContent = new Date().toLocaleDateString("ko-KR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const todayTaskWidget = document.getElementById("today-task-widget");
  if (!todayTaskWidget) return;
  const isCompleted = currentWeek > 12; // 학습 완료 기준 (예: 12주차 초과)
  if (isCompleted) {
    todayTaskWidget.innerHTML = `<h2 class="font-planner text-4xl text-green-300 flex items-center"> <i data-lucide="party-popper" class="w-8 h-8 mr-2"></i>All Missions Complete! </h2><p class="text-white/90 text-xl mt-2"> 모든 주차의 학습을 완료하셨습니다. </p><p class="text-white/70 mt-1 text-lg"> '나의 성장 기록'에서 전체 과정을 다시 확인해보세요. </p>`;
  } else {
    todayTaskWidget.innerHTML = `<h2 class="font-planner text-4xl text-indigo-300 flex items-center"> <i data-lucide="sun" class="w-8 h-8 mr-2"></i>Today's Mission </h2><p class="text-white/90 text-xl mt-2"> <span class="font-bold text-yellow-300">${currentWeek}주차</span> 학습을 진행할 차례입니다. </p><p class="text-white/70 mt-1 text-lg"> 오늘의 주제: ${
      CURRICULUM[currentWeek] || "새로운 과제"
    } </p>`;
  }
  const startTaskBtn = document.getElementById("start-task-btn");
  if (startTaskBtn) {
    startTaskBtn.classList.toggle("hidden", isCompleted);
    startTaskBtn.classList.remove("animate-pulse");
    if (!isCompleted) {
      startTaskBtn.innerHTML = pauseState
        ? `<i data-lucide="play-circle"></i><span>업무 복귀하기</span>`
        : `<i data-lucide="arrow-right-circle"></i><span>업무 시작!</span>`;
      if (state.currentUser.classId) {
        startTaskBtn.classList.add("animate-pulse");
      }
    }
  }
  const joinClassBtn = document.getElementById("join-class-btn");
  const currentClassInfoDiv = document.getElementById("current-class-info");
  const currentClassNameElem = document.getElementById("current-class-name");
  if (joinClassBtn) joinClassBtn.classList.remove("animate-pulse");
  if (state.currentUser.classId && state.currentUser.className) {
    if (joinClassBtn) joinClassBtn.classList.add("hidden");
    if (currentClassInfoDiv) currentClassInfoDiv.classList.remove("hidden");
    if (currentClassNameElem)
      currentClassNameElem.textContent = state.currentUser.className;
  } else {
    if (joinClassBtn) {
      joinClassBtn.classList.remove("hidden");
      joinClassBtn.classList.add("animate-pulse");
    }
    if (currentClassInfoDiv) currentClassInfoDiv.classList.add("hidden");
  }
  const learningLog = document.getElementById("learning-log");
  if (learningLog) {
    let completedWeeks = [];
    for (let i = 1; i < currentWeek; i++) completedWeeks.push(i);
    if (completedWeeks.length > 0) {
      const latestWeek = completedWeeks[completedWeeks.length - 1];
      learningLog.innerHTML = `<div class="text-gray-300"><i data-lucide="check" class="inline w-5 h-5 mr-1 text-green-400"></i> ${latestWeek}주차 학습 완료 (${
        CURRICULUM[latestWeek] || "주제"
      })</div> ${
        completedWeeks.length > 1
          ? '<p class="text-gray-500 text-sm">...외 ' +
            (completedWeeks.length - 1) +
            "개 활동 완료</p>"
          : ""
      }`;
    } else {
      learningLog.innerHTML =
        "<p class='text-gray-400'>아직 완료한 활동이 없어요.</p>";
    }
  }
  const roadmapContainer = document.getElementById("curriculum-roadmap");
  if (roadmapContainer) {
    roadmapContainer.innerHTML = "";
    for (let i = 1; i <= 12; i++) {
      const isCompletedWeek = i < currentWeek;
      const isCurrentWeek = i === currentWeek;
      let statusClass = isCompletedWeek
        ? "bg-green-500/50 text-white"
        : isCurrentWeek
        ? "bg-blue-500/70 text-white animate-pulse"
        : "bg-black/20 text-gray-400";
      roadmapContainer.innerHTML += `<div class="p-2 rounded-md ${statusClass} font-planner text-2xl"> Week ${i} ${
        isCompletedWeek ? "✔" : ""
      } </div>`;
    }
  }
  // 레벨 설정 버튼은 학생에게만 보이도록 처리 (선택 사항)
  const levelSettingBtn = document.getElementById("level-setting-btn");
  if (levelSettingBtn) {
    levelSettingBtn.style.display =
      state.currentUser.role === "student" ? "flex" : "none";
  }

  if (typeof lucide !== "undefined") lucide.createIcons();
}

// --- 👇👇👇 레벨 설정 모달 관련 함수 추가 👇👇👇 ---

/**
 * 학습 레벨 설정 모달을 엽니다.
 */
export function showLevelSettingModal() {
  if (!levelSettingModal || !state.currentUser) return;

  // 현재 사용자의 레벨 가져오기 (없으면 'beginner' 기본값)
  const currentLevel = state.currentUser.user_level || "beginner";

  // 라디오 버튼 상태 설정
  levelRadioButtons.forEach((radio) => {
    radio.checked = radio.value === currentLevel;
  });

  // 메시지 초기화
  if (levelSettingMessage) {
    levelSettingMessage.textContent = "";
    levelSettingMessage.className = "text-sm text-center";
  }
  // 저장 버튼 활성화
  if (saveLevelBtn) saveLevelBtn.disabled = false;

  // 모달 표시
  levelSettingModal.classList.remove("hidden");
  if (typeof lucide !== "undefined") lucide.createIcons(); // 아이콘 렌더링
}

/**
 * 학습 레벨 설정 모달을 닫습니다.
 */
export function closeLevelSettingModal() {
  if (levelSettingModal) {
    levelSettingModal.classList.add("hidden");
  }
}

/**
 * 선택된 학습 레벨을 저장합니다.
 */
export async function handleSaveLevel() {
  if (!saveLevelBtn || !levelSettingMessage || !state.currentUser?.email)
    return;

  let selectedLevel = null;
  levelRadioButtons.forEach((radio) => {
    if (radio.checked) {
      selectedLevel = radio.value;
    }
  });

  if (!selectedLevel) {
    levelSettingMessage.textContent = "레벨을 선택해주세요.";
    levelSettingMessage.className = "text-sm text-center text-red-400";
    return;
  }

  // 버튼 비활성화 및 메시지 표시
  saveLevelBtn.disabled = true;
  levelSettingMessage.textContent = "저장 중...";
  levelSettingMessage.className = "text-sm text-center text-yellow-400";

  try {
    // 백엔드 API 호출 (main.py에 해당 API 엔드포인트 구현 필요)
    const response = await fetch("/api/user/level/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: state.currentUser.email,
        user_level: selectedLevel,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      levelSettingMessage.textContent = "학습 레벨이 저장되었습니다.";
      levelSettingMessage.className = "text-sm text-center text-green-400";

      // 로컬 상태 업데이트
      state.currentUser.user_level = selectedLevel;
      // 세션 스토리지 업데이트
      sessionStorage.setItem("currentUser", JSON.stringify(state.currentUser));

      // 잠시 후 모달 닫기
      setTimeout(() => {
        closeLevelSettingModal();
      }, 1500);
    } else {
      throw new Error(result.message || "저장에 실패했습니다.");
    }
  } catch (error) {
    levelSettingMessage.textContent = `오류: ${error.message}`;
    levelSettingMessage.className = "text-sm text-center text-red-400";
    saveLevelBtn.disabled = false; // 오류 시 버튼 다시 활성화
  }
}

// --- 👆👆👆 레벨 설정 모달 관련 함수 추가 완료 👆👆👆 ---

// showMyQuestions 함수는 변경 없음
export async function showMyQuestions() {
  if (!myQuestionsModal || !myQuestionsList || !state.currentUser) return;
  myQuestionsModal.classList.remove("hidden");
  if (typeof lucide !== "undefined") lucide.createIcons();
  myQuestionsList.innerHTML =
    '<p class="text-gray-400">질문 목록을 불러오는 중입니다...</p>';
  try {
    const r = await fetch(`/api/questions/my?email=${state.currentUser.email}`);
    const res = await r.json();
    if (!r.ok) throw new Error(res.message);
    if (res.questions.length === 0) {
      myQuestionsList.innerHTML =
        '<p class="text-gray-400">아직 작성한 질문이 없습니다.</p>';
      return;
    }
    myQuestionsList.innerHTML = res.questions
      .map((q) => {
        const status = q.isResolved
          ? '<span class="text-xs font-semibold bg-green-700 text-green-200 px-2 py-1 rounded-full">답변 완료</span>'
          : '<span class="text-xs font-semibold bg-yellow-700 text-yellow-200 px-2 py-1 rounded-full">답변 대기중</span>';
        const answerHtml = q.isResolved
          ? `<div class="mt-3 pt-3 border-t border-gray-700"><p class="text-sm font-bold text-indigo-400">교수님 답변:</p><p class="text-sm text-gray-300 whitespace-pre-wrap mt-1">${q.answer}</p></div>`
          : "";
        const charImgSrc = IMAGE_URLS[q.characterContext] || IMAGE_URLS.profKim;
        return `<div class="bg-gray-900/50 p-4 rounded-lg flex space-x-4"><img src="${charImgSrc}" class="w-10 h-10 rounded-full flex-shrink-0"><div class="flex-grow"><div class="flex justify-between items-center"><p class="text-sm text-gray-400">${
          q.progress?.title || "Unknown Task"
        } (${q.progress?.week || "?"}주차 ${
          (q.progress?.cycle || 0) + 1
        }사이클)</p>${status}</div><p class="text-md text-white mt-2">${
          q.question
        }</p>${answerHtml}</div></div>`;
      })
      .join("");
  } catch (err) {
    myQuestionsList.innerHTML = `<p class="text-red-400">오류: ${err.message}</p>`;
  }
}

// updateDashboardUI 함수는 변경 없음
export function updateDashboardUI(cycleData) {
  if (!cycleData) return;
  const taskWidgets = document.querySelectorAll(".task-widget-content");
  const editorFilenames = document.querySelectorAll(".editor-filename-content");
  const terminalOutputs = document.querySelectorAll(".terminal-output-content");
  if (taskWidgets)
    taskWidgets.forEach((el) => {
      if (el)
        el.innerHTML = `<h3 class="font-bold text-lg text-white flex items-center"><i data-lucide="clipboard-list" class="w-5 h-5 mr-2 text-indigo-400"></i>${
          cycleData.title || "Current Task"
        }</h3><p class="text-sm text-gray-400 mt-2">${
          cycleData.task?.content?.replace(/<[^>]*>?/gm, "") || ""
        }</p>`;
    });
  if (editorFilenames)
    editorFilenames.forEach((el) => {
      if (el) el.textContent = cycleData.filename || "script.py";
    });
  const code = cycleData.starterCode
    ? cycleData.starterCode.replace(/\\n/g, "\n")
    : "# Please write your code here.";
  if (state.monacoEditor) {
    state.monacoEditor.setValue(code);
    state.monacoEditor.updateOptions({ readOnly: false });
  }
  if (state.monacoEditorMobile) {
    state.monacoEditorMobile.setValue(code);
    state.monacoEditorMobile.updateOptions({ readOnly: false });
  }
  if (terminalOutputs)
    terminalOutputs.forEach((el) => {
      if (el) el.textContent = "";
    });
  if (typeof lucide !== "undefined") lucide.createIcons();
}

// updateSyntaxIndex 함수는 변경 없음
export function updateSyntaxIndex(taskKey) {
  const syntaxIndexes = document.querySelectorAll(".syntax-index-content");
  const ut = (target) => {
    if (!target) return;
    target.innerHTML = "";
    if (!state.syntaxDb || !taskKey) {
      target.innerHTML =
        '<p class="text-sm text-gray-500">No syntax guidance for this task.</p>';
      return;
    }
    const rt = syntaxMap[taskKey] || [];
    if (rt.length === 0) {
      target.innerHTML =
        '<p class="text-sm text-gray-500">No specific syntax for this cycle.</p>';
      return;
    }
    rt.forEach((tk) => {
      const td = state.syntaxDb[tk];
      if (td) {
        const did = `d-${tk}-${Math.random()}`;
        const e = document.createElement("div");
        e.innerHTML = `<button onclick="toggleSyntaxDetail('${did}')" class="w-full text-left bg-gray-700 hover:bg-gray-600 p-2 rounded-md text-sm flex justify-between items-center"><code>${td.term}</code><i data-lucide="chevron-down" class="w-4 h-4"></i></button><div id="${did}" class="hidden p-2 mt-1 bg-gray-900/50 rounded-md text-xs">${td.details}</div>`;
        target.appendChild(e);
      }
    });
    if (typeof lucide !== "undefined") lucide.createIcons();
  };
  if (syntaxIndexes) syntaxIndexes.forEach(ut);
}

// deleteClass 함수는 변경 없음
async function deleteClass(classId, className) {
  if (
    !confirm(
      `정말로 '${className}' 수업을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 모든 학생의 소속이 해제됩니다.`
    )
  )
    return;
  if (!state.currentUser) return;
  try {
    const r = await fetch("/api/classes/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: classId,
        instructorEmail: state.currentUser.email,
      }),
    });
    const res = await r.json();
    alert(res.message);
    if (r.ok) fetchAndDisplayClasses();
  } catch (err) {
    alert("서버와 통신 중 오류가 발생했습니다.");
  }
}

// handleClassListClick 함수는 변경 없음
function handleClassListClick(e) {
  const vb = e.target.closest(".view-status-btn");
  const rb = e.target.closest(".report-btn");
  const db = e.target.closest(".delete-class-btn");
  if (vb) {
    window.location.href = `/monitor?classId=${vb.dataset.classId}`;
  } else if (rb) {
    window.location.href = `/report?classId=${rb.dataset.classId}`;
  } else if (db) {
    deleteClass(db.dataset.classId, db.dataset.className);
  }
}

// fetchAndDisplayClasses 함수는 변경 없음
export async function fetchAndDisplayClasses() {
  if (!state.currentUser || state.currentUser.role !== "instructor") return;
  const iui = document.getElementById("instructor-user-info");
  const classListContainer = document.getElementById("class-list");
  if (iui) iui.textContent = `환영합니다, ${state.currentUser.name} 교수님`;
  if (!classListContainer) return;
  try {
    const r = await fetch(`/api/classes?email=${state.currentUser.email}`);
    const res = await r.json();
    if (r.ok) {
      state.classes = res.classes;
      classListContainer.innerHTML = "";
      if (state.classes.length === 0)
        classListContainer.innerHTML =
          '<p class="text-gray-500">아직 개설한 수업이 없습니다.</p>';
      else {
        state.classes.forEach((cls) => {
          const el = document.createElement("div");
          el.className =
            "class-item bg-gray-700 p-4 rounded-lg flex flex-col md:flex-row justify-between md:items-center";
          el.innerHTML = `<div><h3 class="text-lg font-bold text-white">${
            cls.className
          }</h3><p class="text-sm text-gray-400 mt-1">초대 코드: <span class="font-mono bg-gray-900 px-2 py-1 rounded">${
            cls.inviteCode
          }</span></p><p class="text-sm text-gray-400 mt-1">학생: ${
            cls.students?.length || 0
          }명</p></div><div class="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mt-4 md:mt-0"><button data-class-id="${
            cls.classId
          }" class="view-status-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">현황 보기</button><button data-class-id="${
            cls.classId
          }" class="report-btn bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">리포트 보기</button><button data-class-id="${
            cls.classId
          }" data-class-name="${
            cls.className
          }" class="delete-class-btn bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">삭제</button></div>`;
          classListContainer.appendChild(el);
        });
        classListContainer.removeEventListener("click", handleClassListClick);
        classListContainer.addEventListener("click", handleClassListClick);
      }
    } else
      classListContainer.innerHTML = `<p class="text-red-400">수업 목록을 불러오는 데 실패했습니다.</p>`;
  } catch (err) {
    classListContainer.innerHTML = `<p class="text-red-400">서버 통신 오류가 발생했습니다.</p>`;
  }
}

// handleJoinClassClick 함수는 변경 없음
export async function handleJoinClassClick() {
  const inviteCode = prompt("교수님께 받은 초대 코드를 입력하세요:");
  if (inviteCode && inviteCode.trim() !== "") {
    if (!state.currentUser || !state.currentUser.email) return;
    try {
      const response = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: inviteCode.trim(),
          studentEmail: state.currentUser.email,
        }),
      });
      const result = await response.json();
      alert(result.message);
      if (response.ok) {
        location.reload();
      } // 성공 시 새로고침하여 className 반영
    } catch (error) {
      alert("서버와 통신 중 오류가 발생했습니다.");
    }
  }
}

// handleCreateClassSubmit 함수는 변경 없음
export async function handleCreateClassSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const classDetails = Object.fromEntries(formData.entries());
  const createClassModal = document.getElementById("create-class-modal");
  const createClassMsg = document.getElementById("create-class-message");
  if (!createClassMsg || !state.currentUser || !state.currentUser.email) return;
  try {
    const response = await fetch("/api/classes/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classDetails: classDetails,
        instructorEmail: state.currentUser.email,
      }),
    });
    const result = await response.json();
    if (response.ok) {
      alert(
        `수업이 성공적으로 개설되었습니다!\n\n학생들에게 다음 초대 코드를 공유하세요: ${result.class.inviteCode}`
      );
      if (createClassModal) createClassModal.classList.add("hidden");
      fetchAndDisplayClasses();
    } else {
      createClassMsg.textContent = `오류: ${result.message}`;
    }
  } catch (error) {
    createClassMsg.textContent = "서버와 통신 중 오류가 발생했습니다.";
  }
}

// setupMobileTabs 함수는 변경 없음
export function setupMobileTabs() {
  const mobilePanels = {
    task: document.getElementById("mobile-panel-task"),
    code: document.getElementById("mobile-panel-code"),
    syntax: document.getElementById("mobile-panel-syntax"),
  };
  const mobileTabs = {
    task: document.getElementById("mobile-tab-task"),
    code: document.getElementById("mobile-tab-code"),
    syntax: document.getElementById("mobile-tab-syntax"),
  };
  function switchMobileTab(tabName) {
    Object.keys(mobilePanels).forEach((key) => {
      if (mobilePanels[key]) mobilePanels[key].classList.add("hidden");
      if (mobileTabs[key]) mobileTabs[key].classList.remove("active");
    });
    if (mobilePanels[tabName]) mobilePanels[tabName].classList.remove("hidden");
    if (mobileTabs[tabName]) mobileTabs[tabName].classList.add("active");
    if (typeof lucide !== "undefined") lucide.createIcons();
    if (tabName === "code" && state.monacoEditorMobile)
      state.monacoEditorMobile.layout();
  }
  Object.keys(mobileTabs).forEach((tabName) => {
    mobileTabs[tabName]?.addEventListener("click", () =>
      switchMobileTab(tabName)
    );
  });
  switchMobileTab("code");
}

// toggleSyntaxDetail 함수는 변경 없음
window.toggleSyntaxDetail = (id) => {
  document.getElementById(id)?.classList.toggle("hidden");
};
