document.addEventListener("DOMContentLoaded", () => {
  let pyodide;
  // [수정] state 정의를 DOMContentLoaded 내부 최상단으로 이동
  let state = {
    currentUser: null,
    currentWeek: 1,
    currentCycleIndex: 0,
    currentModalType: null,
    previousModalType: null,
    weekData: null,
    syntaxDb: null,
    classes: [],
    monacoEditor: null,
    monacoEditorMobile: null,
  };

  const imageUrls = {
    officeBg: "/static/images/office-bg.jpg",
    lectureBg: "/static/images/lecture-bg.jpg",
    alex: "/static/images/alex.png",
    sena: "/static/images/sena.png",
    profKim: "/static/images/prof-kim.png",
    userAvatar: "/static/images/user-avatar.png",
  };

  const loadingIndicator = document.getElementById("loading-indicator");
  const loadingText = document.getElementById("loading-text");
  const authContainer = document.getElementById("auth-container");
  const startScreen = document.getElementById("start-screen");
  const dashboard = document.getElementById("dashboard");
  const instructorDashboard = document.getElementById("instructor-dashboard");
  const modalContainer = document.getElementById("modal-container");
  const modalContentWrapper = document.getElementById("modal-content-wrapper");

  let taskWidgets,
    editorFilenames,
    editorTargets,
    terminalOutputs,
    syntaxIndexes;
  let editorTargetsMobile;

  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const authMessage = document.getElementById("auth-message");
  const classListContainer = document.getElementById("class-list");
  const myQuestionsModal = document.getElementById("my-questions-modal");
  const myQuestionsList = document.getElementById("my-questions-list");
  const pageBody = document.getElementById("page-body");
  const answerNotification = document.getElementById("answer-notification");

  let questionListenerUnsubscribe = null;

  const CURRICULUM = {
    1: "신입사원 온보딩 및 개발 환경 구축",
    2: "데이터 기본기: 변수, 자료형, 연산자",
    3: "흐름 제어: 조건과 반복",
    4: "코드 재사용의 시작: 함수",
    5: "자료구조 (1): 리스트와 튜플",
    6: "자료구조 (2): 딕셔너리와 집합",
    7: "모듈화 및 중간 프로젝트",
    8: "객체 지향 (1): 클래스와 객체",
    9: "객체 지향 (2): 상속",
    10: "파일 처리와 예외 관리",
    11: "파이썬 생태계 첫걸음",
    12: "최종 프로젝트: 주소록 제작",
  };

  const syntaxMap = {
    installation: ["variables", "data_types"],
    ide_setup: [],
    print_statement: ["print_function"],
    variables_datatypes: ["variables", "data_types"],
    operators: ["operators"],
    string_formatting: ["f_string", "variables"],
    if_statement: ["if_statement", "operators"],
    while_loop: ["while_loop"],
    for_loop: ["for_in_loop", "range_function", "list_data_structure"],
    function_def: ["function_def"],
    function_params_return: ["function_def", "function_return"],
    variable_scope: ["function_scope", "variables"],
    list_basic: ["list_data_structure", "list_methods"],
    list_advanced: ["indexing_slicing", "list_methods"],
    tuple_data: ["tuple_data_structure"],
    dict_basic: ["dict_data_structure"],
    dict_methods: ["dict_methods", "for_in_loop"],
    set_data: ["set_data_structure"],
    modules: ["module_import", "name_main_block"],
    os_time_modules: ["module_import"],
    project_integration: [
      "for_in_loop",
      "if_statement",
      "list_data_structure",
      "variables",
      "module_import",
    ],
    oop_concept: ["class_def"],
    class_init: ["class_init_self", "class_def"],
    class_methods: ["class_method", "class_init_self"],
    oop_inheritance: ["class_inheritance", "class_init_self"],
    oop_poly: ["class_inheritance", "class_method"],
    file_io: ["file_io_with"],
    exceptions: ["exception_handling", "file_io_with"],
    std_lib: ["module_import"],
    pip_requests: ["pip_install", "requests_lib", "module_import"],
    final_project_design: ["class_def", "dict_data_structure", "pickle_module"],
    final_project_core: [
      "class_init_self",
      "dict_methods",
      "if_statement",
      "while_loop",
    ],
    final_project_complete: [
      "pickle_module",
      "file_io_with",
      "exception_handling",
    ],
  };

  // --- Helper function definitions START ---
  // [수정] showView 정의를 initializeApp 호출 전에 위치
  function showView(viewId) {
    [
      loadingIndicator,
      authContainer,
      startScreen,
      dashboard,
      instructorDashboard,
      modalContainer,
      myQuestionsModal,
    ].forEach((view) => view && view.classList.add("hidden")); // Add null check
    if (answerNotification) answerNotification.classList.add("hidden");

    if (viewId === "start-screen" || viewId === "instructor-dashboard") {
      if (pageBody) pageBody.classList.remove("overflow-hidden");
    } else {
      if (pageBody) pageBody.classList.add("overflow-hidden");
    }

    const viewToShow = document.getElementById(viewId);
    if (viewToShow) {
      viewToShow.classList.remove("hidden");
      if (typeof lucide !== "undefined") lucide.createIcons(); // Check if lucide exists
    }
  }

  // [수정] logout 정의를 initializeApp 호출 전에 위치
  function logout() {
    if (pageBody) pageBody.classList.remove("planner-background");
    sessionStorage.removeItem("currentUser");
    state.currentUser = null;
    if (questionListenerUnsubscribe) questionListenerUnsubscribe();
    if (state.monacoEditor) {
      state.monacoEditor.dispose();
      state.monacoEditor = null;
    }
    if (state.monacoEditorMobile) {
      state.monacoEditorMobile.dispose();
      state.monacoEditorMobile = null;
    }
    location.reload(); // Reloads to show auth screen
  }

  // [수정] loadSyntaxDatabase 정의를 initializeApp 호출 전에 위치
  async function loadSyntaxDatabase() {
    try {
      const response = await fetch("/static/syntax.json");
      if (!response.ok)
        throw new Error("문법 데이터베이스를 불러올 수 없습니다.");
      // 'state' is now accessible as it's defined in the outer scope
      state.syntaxDb = await response.json();
    } catch (error) {
      console.error(error);
    }
  }

  // [수정] initializeApp 정의를 initializePyodide 호출 전에 위치
  async function initializeApp() {
    await loadSyntaxDatabase(); // Now defined before call

    if (typeof firebase !== "undefined" && firebaseConfig) {
      try {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      } catch (e) {
        console.error("Firebase 초기화 실패:", e);
      }
    } else {
      console.error("Firebase 또는 설정 파일을 찾을 수 없습니다.");
    }

    const savedUserJSON = sessionStorage.getItem("currentUser");
    if (savedUserJSON) {
      const savedUser = JSON.parse(savedUserJSON);
      if (!savedUser || !savedUser.email || !savedUser.password) {
        // Add password check for robustness
        logout(); // Invalid saved data
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
          state.currentUser.password = savedUser.password; // Re-store password from session
          sessionStorage.setItem(
            "currentUser",
            JSON.stringify(state.currentUser)
          );
          setupAnswerListener(); // Will be defined below
          showDashboardForCurrentUser(); // Will be defined below
        } else {
          logout();
        } // Defined above
      } catch (e) {
        showView("auth-container");
      } // Defined above
    } else {
      showView("auth-container");
    } // Defined above

    // Attach event listeners safely
    if (loginForm) loginForm.addEventListener("submit", handleLoginSubmit);
    if (signupForm) signupForm.addEventListener("submit", handleSignupSubmit);
    const showSignupBtn = document.getElementById("show-signup");
    const showLoginBtn = document.getElementById("show-login");
    if (showSignupBtn)
      showSignupBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (loginForm) loginForm.classList.add("hidden");
        if (signupForm) signupForm.classList.remove("hidden");
      });
    if (showLoginBtn)
      showLoginBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (signupForm) signupForm.classList.add("hidden");
        if (loginForm) loginForm.classList.remove("hidden");
      });
    const logoutBtn = document.getElementById("logout-btn");
    const instructorLogoutBtn = document.getElementById(
      "instructor-logout-btn"
    );
    if (logoutBtn) logoutBtn.addEventListener("click", logout);
    if (instructorLogoutBtn)
      instructorLogoutBtn.addEventListener("click", logout);
    const startTaskBtnElem = document.getElementById("start-task-btn");
    if (startTaskBtnElem)
      startTaskBtnElem.addEventListener("click", handleStartTaskClick);
    const myQuestionsBtn = document.getElementById("my-questions-btn");
    if (myQuestionsBtn)
      myQuestionsBtn.addEventListener("click", showMyQuestions); // Defined below
    const closeMyQuestionsBtn = document.getElementById(
      "close-my-questions-modal-btn"
    );
    if (closeMyQuestionsBtn)
      closeMyQuestionsBtn.addEventListener("click", () => {
        if (myQuestionsModal) myQuestionsModal.classList.add("hidden");
      });
    const viewGrowthBtn = document.getElementById("view-growth-btn");
    if (viewGrowthBtn)
      viewGrowthBtn.addEventListener("click", () => {
        window.location.href = "/growth";
      });
    if (answerNotification)
      answerNotification.addEventListener("click", () => {
        showMyQuestions();
        if (answerNotification) answerNotification.classList.add("hidden");
      }); // Added null check
    const joinClassBtnElem = document.getElementById("join-class-btn");
    if (joinClassBtnElem)
      joinClassBtnElem.addEventListener("click", handleJoinClassClick);
    const createClassModal = document.getElementById("create-class-modal");
    const createClassForm = document.getElementById("create-class-form");
    const createClassMsg = document.getElementById("create-class-message");
    const createClassBtnElem = document.getElementById("create-class-btn");
    if (createClassBtnElem)
      createClassBtnElem.addEventListener("click", () => {
        if (createClassModal) createClassModal.classList.remove("hidden");
        if (createClassMsg) createClassMsg.textContent = "";
        if (createClassForm) createClassForm.reset();
        if (typeof lucide !== "undefined") lucide.createIcons();
      });
    const closeCreateClassBtn = document.getElementById(
      "close-create-class-modal-btn"
    );
    if (closeCreateClassBtn)
      closeCreateClassBtn.addEventListener("click", () => {
        if (createClassModal) createClassModal.classList.add("hidden");
      });
    if (createClassForm)
      createClassForm.addEventListener("submit", handleCreateClassSubmit);

    // Mobile tabs setup
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
      if (mobilePanels[tabName])
        mobilePanels[tabName].classList.remove("hidden");
      if (mobileTabs[tabName]) mobileTabs[tabName].classList.add("active");
      if (typeof lucide !== "undefined") lucide.createIcons();
      if (tabName === "code" && state.monacoEditorMobile)
        state.monacoEditorMobile.layout();
    }
    if (mobileTabs.task)
      mobileTabs.task.addEventListener("click", () => switchMobileTab("task"));
    if (mobileTabs.code)
      mobileTabs.code.addEventListener("click", () => switchMobileTab("code"));
    if (mobileTabs.syntax)
      mobileTabs.syntax.addEventListener("click", () =>
        switchMobileTab("syntax")
      );
    switchMobileTab("code"); // Default tab
  } // End of initializeApp

  // Event handler functions defined within scope
  async function handleLoginSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (!data.email || !data.password || !authMessage) return; // Basic validation & null check
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) {
        state.currentUser = result.user;
        state.currentUser.password = data.password;
        sessionStorage.setItem(
          "currentUser",
          JSON.stringify(state.currentUser)
        );
        authMessage.textContent = "로그인 성공!";
        authMessage.className = "mt-4 text-center text-sm text-green-400";
        setTimeout(() => {
          setupAnswerListener();
          showDashboardForCurrentUser();
        }, 1000);
      } else {
        authMessage.textContent = result.message;
        authMessage.className = "mt-4 text-center text-sm text-red-400";
      }
    } catch (error) {
      authMessage.textContent = "서버 통신 오류.";
    }
  }

  async function handleSignupSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (!data.name || !data.email || !data.password || !authMessage) return; // Basic validation & null check
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        authMessage.textContent = "회원가입 성공! 로그인해주세요.";
        authMessage.className = "mt-4 text-center text-sm text-green-400";
        const showLoginBtn = document.getElementById("show-login");
        if (showLoginBtn) showLoginBtn.click();
      } else {
        const result = await res.json();
        authMessage.textContent = result.message;
        authMessage.className = "mt-4 text-center text-sm text-red-400";
      }
    } catch (error) {
      authMessage.textContent = "서버 통신 오류.";
    }
  }

  async function handleStartTaskClick() {
    const btn = document.getElementById("start-task-btn");
    if (!btn) return;
    // 업무 시작 버튼 글꼴 일반으로 변경 (font-planner 제거)
    if (btn.textContent.includes("업무 시작"))
      btn.innerHTML = `<i data-lucide="arrow-right-circle"></i><span>업무 시작!</span>`;
    if (!state.currentUser) return; // Need user info
    const pauseState = state.currentUser.pauseState;
    if (pauseState) {
      const { week, cycle } = state.currentUser.progress;
      await fetch("/api/pause/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.currentUser.email }),
      });
      delete state.currentUser.pauseState;
      sessionStorage.setItem("currentUser", JSON.stringify(state.currentUser));
      loadAndStartCycle(week, cycle, pauseState);
    } else {
      const p = state.currentUser?.progress || { week: 1, cycle: 0 };
      loadAndStartCycle(p.week, p.cycle);
    }
  }

  async function handleJoinClassClick() {
    const inviteCode = prompt("교수님께 받은 초대 코드를 입력하세요:");
    if (inviteCode && inviteCode.trim() !== "") {
      if (!state.currentUser || !state.currentUser.email) return; // Need user info
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
        if (response.ok) location.reload();
      } catch (error) {
        alert("서버와 통신 중 오류가 발생했습니다.");
      }
    }
  }

  async function handleCreateClassSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const classDetails = Object.fromEntries(formData.entries());
    const createClassModal = document.getElementById("create-class-modal");
    const createClassMsg = document.getElementById("create-class-message");
    if (!createClassMsg || !state.currentUser || !state.currentUser.email)
      return; // Need user info
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
        fetchAndDisplayClasses(); // Defined below
      } else {
        createClassMsg.textContent = `오류: ${result.message}`;
      }
    } catch (error) {
      createClassMsg.textContent = "서버와 통신 중 오류가 발생했습니다.";
    }
  }

  // --- Pyodide and Monaco initialization START ---
  async function initializePyodide() {
    try {
      pyodide = await loadPyodide();
      if (loadingText)
        loadingText.textContent = "파이썬 환경 로드 완료. 에디터 로딩 중...";

      if (typeof require === "undefined") {
        console.error("Monaco Editor 로더(loader.min.js)를 찾을 수 없습니다.");
        if (loadingText)
          loadingText.textContent = "오류: 코드 에디터를 불러올 수 없습니다.";
        return;
      }

      require.config({
        paths: {
          vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs",
        },
      });
      require(["vs/editor/editor.main"], () => {
        if (loadingText) loadingText.textContent = "환경 준비 완료!";
        setTimeout(() => {
          if (loadingIndicator) loadingIndicator.classList.add("hidden");
          initializeApp(); // CALL initializeApp HERE
        }, 500);
      });
    } catch (error) {
      if (loadingText)
        loadingText.textContent =
          "오류: 파이썬 실행 환경을 불러올 수 없습니다. 페이지를 새로고침 해주세요.";
      console.error(error);
    }
  }
  // --- Pyodide and Monaco initialization END ---

  async function runPythonCode(code) {
    if (!pyodide) return { error: "오류: Pyodide가 로드되지 않았습니다." };
    try {
      await pyodide.runPythonAsync(
        `import io, sys; sys.stdout = io.StringIO(); sys.stderr = io.StringIO();`
      );
      let result = await pyodide.runPythonAsync(code);
      let stdout = await pyodide.runPythonAsync("sys.stdout.getvalue()");
      let stderr = await pyodide.runPythonAsync("sys.stderr.getvalue()");
      if (stderr) return { error: stderr };
      let output = stdout + (result !== undefined ? String(result) : "");
      return { success: output || "(출력 결과 없음)" };
    } catch (error) {
      return { error: error.toString() };
    }
  }

  function updatePortalDashboard() {
    if (!state.currentUser) return; // Guard
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
    const isCompleted = currentWeek > 12;
    if (isCompleted) {
      todayTaskWidget.innerHTML = `
            <h2 class="font-planner text-4xl text-green-300 flex items-center"> <i data-lucide="party-popper" class="w-8 h-8 mr-2"></i>All Missions Complete! </h2>
            <p class="text-white/90 text-xl mt-2"> 모든 주차의 학습을 완료하셨습니다. </p>
            <p class="text-white/70 mt-1 text-lg"> '나의 성장 기록'에서 전체 과정을 다시 확인해보세요. </p>`;
    } else {
      todayTaskWidget.innerHTML = `
            <h2 class="font-planner text-4xl text-indigo-300 flex items-center"> <i data-lucide="sun" class="w-8 h-8 mr-2"></i>Today's Mission </h2>
            <p class="text-white/90 text-xl mt-2"> <span class="font-bold text-yellow-300">${currentWeek}주차</span> 학습을 진행할 차례입니다. </p>
            <p class="text-white/70 mt-1 text-lg"> 오늘의 주제: ${
              CURRICULUM[currentWeek] || "새로운 과제"
            } </p>`;
    }
    const startTaskBtn = document.getElementById("start-task-btn");
    if (startTaskBtn) {
      startTaskBtn.classList.toggle("hidden", isCompleted);
      // ★★★ 업무 시작/복귀 버튼 글꼴 수정 (font-planner 제거) ★★★
      if (!isCompleted)
        startTaskBtn.innerHTML = pauseState
          ? `<i data-lucide="play-circle"></i><span>업무 복귀하기</span>`
          : `<i data-lucide="arrow-right-circle"></i><span>업무 시작!</span>`;
    }
    const joinClassBtn = document.getElementById("join-class-btn");
    if (joinClassBtn)
      joinClassBtn.classList.toggle("hidden", !!state.currentUser.classId);
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
        const isCompleted = i < currentWeek;
        const isCurrent = i === currentWeek;
        let statusClass = isCompleted
          ? "bg-green-500/50 text-white"
          : isCurrent
          ? "bg-blue-500/70 text-white animate-pulse"
          : "bg-black/20 text-gray-400";
        roadmapContainer.innerHTML += `<div class="p-2 rounded-md ${statusClass} font-planner text-2xl"> Week ${i} ${
          isCompleted ? "✔" : ""
        } </div>`;
      }
    }
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  async function loadAndStartCycle(week, cycleIndex, resumeState = null) {
    try {
      const response = await fetch(`/api/scenario/week/${week}`);
      if (!response.ok) {
        if (response.status === 404) return showReflectionModal(true);
        throw new Error(`시나리오 로딩 실패: ${response.status}`);
      }
      state.weekData = await response.json();
      state.currentWeek = week;
      state.currentCycleIndex = cycleIndex;
      await setupDashboardFromTemplate(); // Ensure this waits for Monaco
      if (resumeState) {
        if (resumeState.view === "dashboard") {
          showView("dashboard");
          updateDashboardUI(state.weekData.cycles[cycleIndex]);
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
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  // ★★★★★ showModal 함수 수정 시작 ★★★★★
  async function showModal(type, options = {}) {
    state.currentModalType = type;
    if (!modalContainer || !modalContentWrapper) return;
    modalContainer.classList.remove("hidden");
    const templates = getTemplates(
      state.currentUser ? state.currentUser.name : ""
    );
    let templateHtml = "";
    const cycleData = state.weekData?.cycles[state.currentCycleIndex];
    let feedbackData;
    const modalBg = document.getElementById("modal-bg");

    switch (type) {
      case "ask_question":
        templateHtml = templates.ask_question();
        if (modalBg)
          modalBg.style.backgroundImage = `url(${imageUrls.officeBg})`;
        break;
      case "reflection":
        templateHtml = templates.reflection(options.content, options.userName);
        if (modalBg)
          modalBg.style.backgroundImage = `url(${imageUrls.officeBg})`;
        break;
      case "feedback":
        if (!cycleData) return showView("start-screen");
        const feedbackType = options.feedbackType || "success";
        feedbackData = cycleData.feedback[feedbackType] ||
          cycleData.feedback["success"] || {
            character: "alex",
            subtitle: "완료",
            title: "수고",
            content: "다음 진행.",
          };
        if (
          options.errorMessage &&
          feedbackData.content?.includes("{{ERROR_MESSAGE}}")
        ) {
          // Added optional chaining for content
          feedbackData = JSON.parse(JSON.stringify(feedbackData));
          feedbackData.content = feedbackData.content.replace(
            "{{ERROR_MESSAGE}}",
            options.errorMessage
          );
        }
        templateHtml = templates.feedback(feedbackData, feedbackType);
        if (modalBg)
          modalBg.style.backgroundImage = `url(${imageUrls.officeBg})`;
        break;
      case "task":
      case "briefing":
      case "lecture":
        if (!cycleData) return showView("start-screen");
        templateHtml = templates[type](cycleData);
        if (modalBg)
          modalBg.style.backgroundImage = `url(${
            type === "lecture" ? imageUrls.lectureBg : imageUrls.officeBg
          })`;
        break;
      default:
        if (modalContainer) modalContainer.classList.add("hidden");
        return;
    }

    modalContentWrapper.innerHTML = templateHtml;
    if (typeof lucide !== "undefined") lucide.createIcons();

    // --- Character Image and Dialogue Logic ---
    const charImg = modalContentWrapper.querySelector(".character-img");
    // Find the main dialogue span, excluding the one inside the key point section for lectures
    const mainDialogueSpan = modalContentWrapper.querySelector(
      ".content-pop-in > p > .dialogue-text, .content-pop-in > div > p > .dialogue-text"
    );
    const keyPointDialogueSpan = modalContentWrapper.querySelector(
      ".bg-yellow-900\\/50 .dialogue-text"
    ); // Specifically for lecture key point

    let mainDialogueContent = "";
    let keyPointContent = "";

    // Determine content based on modal type
    if (type === "task" && cycleData?.task?.content)
      mainDialogueContent = templates.renderContent(cycleData.task.content);
    else if (type === "briefing" && cycleData?.briefing?.content)
      mainDialogueContent = templates.renderContent(cycleData.briefing.content);
    else if (type === "feedback" && feedbackData?.content)
      mainDialogueContent = templates.renderContent(feedbackData.content);
    // Key point for lecture is handled later

    // Character image animation (Common for task, briefing, feedback, lecture) - RESTORED
    if (charImg) {
      setTimeout(() => {
        // console.log("Character Image Src:", charImg.src); // Debug log
        charImg.classList.add("visible");
      }, 100); // Appear after 100ms
    } else if (["task", "briefing", "feedback", "lecture"].includes(type)) {
      console.warn(`Character image element not found for modal type: ${type}`);
    }

    // Main dialogue typing animation (Only for task, briefing, feedback) - RESTORED
    if (["task", "briefing", "feedback"].includes(type)) {
      if (mainDialogueSpan && mainDialogueContent) {
        setTimeout(() => {
          // Delay typing
          mainDialogueContent = mainDialogueContent.replace(
            /{?\/\*.*?\*\/}?/g,
            ""
          ); // Remove comments
          try {
            new Typed(mainDialogueSpan, {
              strings: [mainDialogueContent],
              typeSpeed: 25,
              showCursor: false,
              disableBackspacing: true,
            });
          } catch (e) {
            console.error(`Typed.js failed for ${type}:`, e, mainDialogueSpan);
            if (mainDialogueSpan)
              mainDialogueSpan.innerHTML = mainDialogueContent; // Fallback
          }
        }, 800); // Start typing after 800ms (character fade-in is 500ms)
      } else if (mainDialogueSpan) {
        mainDialogueSpan.innerHTML = ""; // Clear if no content
      } else {
        console.warn(
          `Main dialogue span element not found for modal type: ${type}`
        );
      }
    }
    // --- End Character Image and Dialogue Logic ---

    // Lecture-specific logic (including Key Point typing timing)
    if (type === "lecture" && cycleData) {
      keyPointContent = templates.renderContent(cycleData.lecture.keyTakeaway); // Set key point content here

      const lectureSections = cycleData.lecture.sections || [];
      const explanationContainer = modalContentWrapper.querySelector(
        "#lecture-explanation"
      );
      const chalkboardContainer = modalContentWrapper.querySelector(
        "#lecture-chalkboard"
      );
      const knowledgeNoteContent = document.getElementById(
        "knowledge-note-content"
      );

      if (knowledgeNoteContent) {
        let noteHtml = cycleData.lecture.sections
          .map(
            (section, index) =>
              `<div class="mb-2"><h4 class="font-bold text-yellow-400">${
                index + 1
              }. ${
                section.heading
              }</h4><p class="text-xs text-gray-400">${templates.renderContent(
                section.text
              )}</p>${
                section.code
                  ? `<pre class="code-highlight text-xs mt-1">${section.code}</pre>`
                  : ""
              }</div>`
          )
          .join("");
        knowledgeNoteContent.innerHTML =
          noteHtml || "<p>이번 강의의 핵심 요약입니다.</p>";
      }

      let explanationConfirmBtn = null;
      const miniRunBtn = modalContentWrapper.querySelector("#mini-run-btn");
      const backToDashboardBtn = modalContentWrapper.querySelector(
        "#back-to-dashboard-btn"
      );
      if (backToDashboardBtn) backToDashboardBtn.classList.add("opacity-30");
      if (miniRunBtn) miniRunBtn.classList.add("opacity-30");

      function renderLectureStep(index) {
        if (!explanationContainer) return;
        if (index >= lectureSections.length) {
          const finalMessage =
            "우측의 'Try It Yourself' 예제를 직접 실행해 보세요!";
          explanationContainer.innerHTML = `<p class="text-lg text-center text-gray-300 p-4"><span id="final-explanation-text"></span></p>`;
          const finalTextSpan = explanationContainer.querySelector(
            "#final-explanation-text"
          );
          if (finalTextSpan) {
            try {
              new Typed(finalTextSpan, {
                strings: [finalMessage],
                typeSpeed: 20,
                showCursor: false,
                onComplete: () => {
                  // ★★★ 최종 메시지 후 Key Point 시작 ★★★
                  if (keyPointDialogueSpan && keyPointContent) {
                    keyPointContent = keyPointContent.replace(
                      /{?\/\*.*?\*\/}?/g,
                      ""
                    );
                    try {
                      new Typed(keyPointDialogueSpan, {
                        strings: [keyPointContent],
                        typeSpeed: 25,
                        showCursor: false,
                        disableBackspacing: true,
                        onComplete: () => {
                          // ★★★ Key Point 후 버튼 활성화 ★★★
                          if (miniRunBtn) {
                            miniRunBtn.classList.remove("opacity-30");
                            miniRunBtn.classList.add("animate-pulse");
                          }
                        },
                      });
                    } catch (e) {
                      console.error("Typed.js for Key Point failed:", e);
                      if (keyPointDialogueSpan)
                        keyPointDialogueSpan.innerHTML = keyPointContent;
                      if (miniRunBtn) {
                        miniRunBtn.classList.remove("opacity-30");
                        miniRunBtn.classList.add("animate-pulse");
                      }
                    } // Fallback button activation
                  } else {
                    // No Key Point span/content
                    if (miniRunBtn) {
                      miniRunBtn.classList.remove("opacity-30");
                      miniRunBtn.classList.add("animate-pulse");
                    }
                  }
                },
              });
            } catch (e) {
              console.error("Typed.js for final msg failed:", e);
              if (finalTextSpan) finalTextSpan.innerHTML = finalMessage;
              if (miniRunBtn) {
                miniRunBtn.classList.remove("opacity-30");
                miniRunBtn.classList.add("animate-pulse");
              }
            } // Fallback button activation
          } else {
            // Fallback if span not found
            explanationContainer.innerHTML = `<p class="text-lg text-center text-gray-300 p-4">${finalMessage}</p>`;
            if (keyPointDialogueSpan && keyPointContent) {
              // Simplified fallback typing start for keypoint
              try {
                new Typed(keyPointDialogueSpan, {
                  strings: [keyPointContent.replace(/{?\/\*.*?\*\/}?/g, "")],
                  typeSpeed: 25,
                  showCursor: false,
                  disableBackspacing: true,
                  onComplete: () => {
                    if (miniRunBtn) {
                      miniRunBtn.classList.remove("opacity-30");
                      miniRunBtn.classList.add("animate-pulse");
                    }
                  },
                });
              } catch (e) {
                if (keyPointDialogueSpan)
                  keyPointDialogueSpan.innerHTML = keyPointContent.replace(
                    /{?\/\*.*?\*\/}?/g,
                    ""
                  );
                if (miniRunBtn) {
                  miniRunBtn.classList.remove("opacity-30");
                  miniRunBtn.classList.add("animate-pulse");
                }
              }
            } else if (miniRunBtn) {
              miniRunBtn.classList.remove("opacity-30");
              miniRunBtn.classList.add("animate-pulse");
            }
          }
          return;
        } // End if index >= length

        // Regular section rendering logic
        const section = lectureSections[index];
        const buttonTexts = ["✓ 이해", "✓ 알겠습니다", "✓ 확인"];
        const randomButtonText =
          buttonTexts[Math.floor(Math.random() * buttonTexts.length)];
        explanationContainer.innerHTML = `<h3 class="font-bold text-white text-xl mb-2">${section.heading}</h3><div class="text-sm"><span id="explanation-text"></span></div><div id="explanation-confirm" class="text-right mt-4 opacity-0 transition-opacity duration-500"><button id="explanation-confirm-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-sm animate-pulse">${randomButtonText}</button></div>`;
        const explanationTextSpan =
          explanationContainer.querySelector("#explanation-text");
        if (explanationTextSpan) {
          try {
            new Typed(explanationTextSpan, {
              strings: [templates.renderContent(section.text) || ""],
              typeSpeed: 20,
              showCursor: false,
              onComplete: () => {
                const cd = document.getElementById("explanation-confirm");
                if (cd) cd.style.opacity = "1";
              },
            });
          } catch (e) {
            console.error("Typed.js explanation failed:", e);
            if (explanationTextSpan)
              explanationTextSpan.innerHTML =
                templates.renderContent(section.text) || "";
            const cd = document.getElementById("explanation-confirm");
            if (cd) cd.style.opacity = "1";
          }
        } else {
          const cd = document.getElementById("explanation-confirm");
          if (cd) cd.style.opacity = "1";
        }
        explanationConfirmBtn = document.getElementById(
          "explanation-confirm-btn"
        );
        if (explanationConfirmBtn) {
          explanationConfirmBtn.onclick = () => {
            if (explanationConfirmBtn)
              explanationConfirmBtn.classList.remove("animate-pulse");
            explanationContainer.innerHTML = "";
            setTimeout(() => {
              if (!chalkboardContainer) return;
              const newEntry = document.createElement("div");
              newEntry.className =
                "chalkboard-entry opacity-0 transform translate-y-2 transition-all duration-500 mb-4";
              newEntry.innerHTML = `<h4 class="text-xl font-bold text-yellow-300">${
                index + 1
              }. ${section.heading}</h4><p class="text-gray-200 mt-1">${
                templates.renderContent(section.text) || ""
              }</p>${
                section.code
                  ? `<div class="code-highlight text-sm mt-2 whitespace-pre-wrap font-sans">${section.code}</div>`
                  : ""
              }`;
              chalkboardContainer.appendChild(newEntry);
              setTimeout(() => {
                newEntry.classList.remove("opacity-0", "translate-y-2");
                chalkboardContainer.scrollTop =
                  chalkboardContainer.scrollHeight;
              }, 100);
              setTimeout(() => {
                renderLectureStep(index + 1);
              }, 500);
            }, 300);
          };
        }
      } // End renderLectureStep
      setTimeout(() => {
        renderLectureStep(0);
      }, 1200);
    } // End if type === lecture

    // Try-it-yourself button logic
    if (type === "lecture" && cycleData?.lecture?.sandboxCode) {
      const miniRunBtn = document.getElementById("mini-run-btn");
      const backToDashboardBtn = document.getElementById(
        "back-to-dashboard-btn"
      );
      miniRunBtn?.addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        const outputEl = document.getElementById("mini-output");
        if (!outputEl) return;
        btn.disabled = true;
        outputEl.textContent = "...";
        const result = await runPythonCode(cycleData.lecture.sandboxCode);
        outputEl.textContent = result.success || result.error;
        btn.disabled = false;
        btn.classList.remove("animate-pulse"); // Stop pulsing after run
        if (backToDashboardBtn) {
          backToDashboardBtn.classList.remove("opacity-30");
          backToDashboardBtn.classList.add("animate-pulse");
        } // Pulse next action
      });
    }
  } // End showModal
  // ★★★★★ showModal 함수 수정 끝 ★★★★★

  function getTemplates(userName) {
    // ... (rest of the function - no changes needed)
    const renderContent = (text) =>
      text
        ? text.replace(/{{USERNAME}}/g, userName).replace(/"/g, "&quot;")
        : "";
    const qaButton = `<button onclick="handleAction('ask_question')" class="fixed bottom-8 right-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-full z-[70] shadow-lg flex items-center space-x-2"><i data-lucide="help-circle" class="w-6 h-6"></i><span>교수님께 질문</span></button>`;
    const pauseButton = `<button onclick="handleAction('pause_task')" class="fixed top-6 left-6 bg-gray-600/50 hover:bg-gray-700/70 text-white font-bold py-2 px-4 rounded-full z-[70] shadow-lg flex items-center space-x-2"><i data-lucide="pause" class="w-5 h-5"></i><span>일시정지</span></button>`;

    return {
      renderContent,
      task: (cycleData) =>
        `${pauseButton}${qaButton}<div class="absolute bottom-0 right-10"><img src="${
          imageUrls[cycleData.task.character]
        }" class="character-img"></div><div class="relative w-full h-full flex flex-col justify-end items-start p-10 md:p-20"><div class="content-pop-in bg-gray-800/80 backdrop-blur-md max-w-2xl rounded-2xl p-6 md:p-8 border border-gray-600 shadow-2xl"><p class="font-semibold text-indigo-400">${
          cycleData.task.subtitle
        }</p><h2 class="text-2xl md:text-3xl font-bold text-white mt-1">${
          cycleData.task.title
        }</h2><p class="mt-4 text-gray-300"><span class="dialogue-text"></span></p><div class="mt-6"><button onclick="handleAction('show_briefing')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg">선임 브리핑 듣기</button></div></div></div>`,
      briefing: (cycleData) =>
        `${pauseButton}${qaButton}<div class="absolute bottom-0 right-10"><img src="${
          imageUrls[cycleData.briefing.character]
        }" class="character-img"></div><div class="relative w-full h-full flex flex-col justify-end items-start p-10 md:p-20"><div class="content-pop-in bg-gray-800/80 backdrop-blur-md max-w-2xl rounded-2xl p-6 md:p-8 border border-gray-600 shadow-2xl"><p class="font-semibold text-teal-400">${
          cycleData.briefing.subtitle
        }</p><h2 class="text-2xl md:text-3xl font-bold text-white mt-1">${
          cycleData.briefing.title
        }</h2><p class="mt-4 text-gray-300"><span class="dialogue-text"></span></p><div class="mt-6"><button onclick="handleAction('start_coding')" class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-lg">네, 알겠습니다</button></div></div></div>`,
      lecture: (cycleData) => {
        return `${pauseButton}${qaButton}<div class="absolute bottom-0 left-10"><img src="${
          imageUrls[cycleData.lecture.character]
        }" class="character-img"></div><div class="relative w-full h-full flex justify-end items-center p-4 md:p-10"><div class="content-pop-in bg-gray-800/80 backdrop-blur-md w-full max-w-4xl rounded-2xl shadow-2xl p-6 md:p-8 border border-gray-600 flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-8">
            <div class="w-full md:w-2/3 space-y-4 flex flex-col max-h-[70vh]">
                <h2 class="text-2xl md:text-3xl font-bold text-white text-yellow-300">${
                  cycleData.lecture.title
                }</h2>
                <div id="lecture-explanation" class="bg-black/20 p-4 rounded-lg min-h-[150px]"></div>
                <div id="lecture-chalkboard" class="flex-grow p-4 rounded-lg overflow-y-auto"></div>
            </div>
            <div class="w-full md:w-1/3 flex flex-col space-y-4 md:border-l md:border-gray-700 md:pl-8">
                <div class="bg-yellow-900/50 p-3 rounded-lg"><h4 class="font-bold text-yellow-300">⭐ Key Point</h4><p class="text-xs mt-1"><span class="dialogue-text"></span></p></div>
                <div class="bg-gray-900 p-3 rounded-lg flex-grow"><h4 class="font-bold text-white">📝 Try It Yourself!</h4><p class="text-xs mt-1 mb-2">아래 코드를 실행해보세요.</p><div class="code-highlight text-xs mb-2 whitespace-pre-wrap">${
                  cycleData.lecture.sandboxCode || ""
                }</div><button id="mini-run-btn" class="text-xs bg-blue-600 w-full py-1 rounded hover:bg-blue-700">실행</button><pre id="mini-output" class="text-xs mt-2 h-24 bg-black rounded p-1 whitespace-pre-wrap"></pre></div>
                <div class="mt-auto flex flex-col space-y-2"><button id="back-to-dashboard-btn" onclick="handleAction('back_to_dashboard')" class="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg text-sm">대시보드로 돌아가기</button></div>
            </div>
        </div></div>`;
      },
      feedback: (feedbackData, feedbackType) => {
        const isSuccess = feedbackType === "success";
        const editButtonHtml = `<button onclick="handleAction('edit_code')" class="w-1/2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg">코드 수정하기</button>`;
        const nextButtonHtml = `<button onclick="handleAction('next_cycle')" class="${
          isSuccess ? "w-full" : "w-1/2"
        } bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg">${
          isSuccess
            ? (cycleData && cycleData.feedback.success.nextActionText) ||
              "다음 업무 진행"
            : "다음 사이클 진행"
        }</button>`;
        return `<div class="absolute bottom-0 right-10"><img src="${
          imageUrls[feedbackData.character]
        }" class="character-img"></div><div class="relative w-full h-full flex flex-col justify-end items-start p-10 md:p-20"><div class="content-pop-in bg-gray-800/80 backdrop-blur-md max-w-2xl rounded-2xl p-6 md:p-8 border border-gray-600 shadow-2xl"><p class="font-semibold text-green-400">${
          feedbackData.subtitle
        }</p><h2 class="text-2xl md:text-3xl font-bold text-white mt-1">${
          feedbackData.title
        }</h2><p class="mt-4 text-gray-300"><span class="dialogue-text"></span></p><div class="mt-6 flex space-x-4">${
          !isSuccess ? editButtonHtml : ""
        }${nextButtonHtml}</div></div></div>`;
      },
      reflection: (content, userName) =>
        `<div class="w-full h-full flex items-center justify-center p-4"><div class="content-pop-in bg-gray-800 backdrop-blur-md max-w-4xl w-full rounded-2xl p-6 md:p-8 border border-gray-600 shadow-2xl overflow-y-auto max-h-[90vh]"><div class="flex items-center space-x-4"><img src="${imageUrls.alex}" class="w-16 h-16 rounded-full"><div><h2 class="text-2xl md:text-3xl font-bold text-white">주간 업무 회고 및 성장 리포트</h2><p class="mt-1 text-gray-400">${userName}님, 한 주간 고생 많으셨습니다. 다음 주 업무에 더 잘 적응하고, ${userName}님의 성장을 돕기 위해 잠시 시간을 내어 주간 업무일지를 작성해주세요.</p></div></div><hr class="border-gray-700 my-6"><p class="mt-2 text-gray-400">${content}</p><div id="journal-error-message" class="mt-2 text-sm text-red-400"></div><div id="journal-topics-container" class="mt-6 space-y-4"></div><div class="mt-8 space-y-6"><div><label class="font-bold text-lg text-white flex items-center"><i data-lucide="lightbulb" class="w-5 h-5 mr-2 text-yellow-400"></i>가장 의미있었던 내용은 무엇인가요?</label><textarea id="journal-meaningful" class="w-full mt-2 p-2 bg-gray-700 rounded-md text-white" rows="3"></textarea></div><div><label class="font-bold text-lg text-white flex items-center"><i data-lucide="alert-triangle" class="w-5 h-5 mr-2 text-red-400"></i>가장 어려웠던 점은 무엇인가요?</label><textarea id="journal-difficult" class="w-full mt-2 p-2 bg-gray-700 rounded-md text-white" rows="3"></textarea></div><div><label class="font-bold text-lg text-white flex items-center"><i data-lucide="search" class="w-5 h-5 mr-2 text-blue-400"></i>더 알아보고 싶은 것은 무엇인가요?</label><textarea id="journal-curious" class="w-full mt-2 p-2 bg-gray-700 rounded-md text-white" rows="3"></textarea></div></div><div class="mt-8 flex justify-end"><button onclick="handleAction('submit_journal')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg text-lg">업무일지 제출 및 퇴근하기</button></div></div></div>`,
      ask_question: () =>
        `<div class="w-full h-full flex items-center justify-center"><div class="content-pop-in bg-gray-800 backdrop-blur-md max-w-2xl w-full rounded-2xl p-8 border border-gray-600 shadow-2xl"><h2 class="text-3xl font-bold text-white">교수님께 질문하기</h2><p class="mt-2 text-gray-400">현재 학습 내용(${
          state.currentWeek
        }주차 ${
          state.currentCycleIndex + 1
        }사이클)과 관련된 질문을 남겨주세요.</p><textarea id="question-textarea" class="w-full mt-4 p-3 h-40 bg-gray-700 rounded-md text-white" placeholder="여기에 질문을 입력하세요..."></textarea><div id="question-message" class="mt-2 text-sm"></div><div class="mt-6 flex justify-end space-x-4"><button onclick="handleAction('cancel_question')" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg">취소</button><button onclick="handleAction('submit_question')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg">질문 제출</button></div></div></div>`,
    };
  }

  function parseErrorMessage(error) {
    // ... (rest of the function - no changes needed)
    const errorString = String(error);
    if (errorString.includes("AssertionError:"))
      return errorString.split("AssertionError:")[1].trim();
    const lines = errorString.split("\n");
    if (lines.length > 0 && lines[0].includes('File "<exec>"'))
      return lines[lines.length - 1];
    return errorString;
  }

  // Define handleAction globally if needed, or keep inside DOMContentLoaded
  window.handleAction = async (action) => {
    // ... (rest of the function - no changes needed)
    const cycleData = state.weekData?.cycles[state.currentCycleIndex];
    switch (action) {
      case "pause_task":
        if (confirm("...저장하고 나가시겠습니까?")) {
          const v = dashboard?.classList.contains("hidden")
            ? state.currentModalType
            : "dashboard";
          let c = "";
          if (state.monacoEditor) c = state.monacoEditor.getValue();
          const p = { view: v, code: c };
          try {
            await fetch("/api/pause/set", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: state.currentUser.email,
                pauseState: p,
              }),
            });
            state.currentUser.pauseState = p;
            sessionStorage.setItem(
              "currentUser",
              JSON.stringify(state.currentUser)
            );
            showDashboardForCurrentUser();
          } catch (e) {
            alert("상태 저장 실패.");
          }
        }
        break;
      case "show_briefing":
        showModal("briefing");
        break;
      case "start_coding":
        showView("dashboard");
        if (cycleData) {
          updateSyntaxIndex(cycleData.syntax_key);
          updateDashboardUI(cycleData);
        }
        requestAnimationFrame(() => {
          if (state.monacoEditor) state.monacoEditor.layout();
          if (state.monacoEditorMobile) state.monacoEditorMobile.layout();
          if (state.monacoEditor) state.monacoEditor.focus();
        });
        break;
      case "back_to_dashboard":
        showView("dashboard");
        requestAnimationFrame(() => {
          if (state.monacoEditor) state.monacoEditor.layout();
          if (state.monacoEditorMobile) state.monacoEditorMobile.layout();
          if (state.monacoEditor) state.monacoEditor.focus();
        });
        break;
      case "cancel_question":
        showModal(state.previousModalType);
        break;
      case "edit_code":
        showView("dashboard");
        requestAnimationFrame(() => {
          if (state.monacoEditor) state.monacoEditor.layout();
          if (state.monacoEditorMobile) state.monacoEditorMobile.layout();
          if (state.monacoEditor) state.monacoEditor.focus();
        });
        break;
      case "next_cycle":
        state.currentCycleIndex++;
        if (
          state.weekData &&
          state.currentCycleIndex < state.weekData.cycles.length
        ) {
          saveProgress(state.currentWeek, state.currentCycleIndex);
          loadAndStartCycle(state.currentWeek, state.currentCycleIndex);
        } else {
          showReflectionModal();
        }
        break;
      case "ask_question":
        state.previousModalType = state.currentModalType;
        showModal("ask_question");
        break;
      case "submit_question":
        const t = document.getElementById("question-textarea");
        const m = document.getElementById("question-message");
        if (!t || !m) return;
        const q = t.value.trim();
        if (q.length < 10) {
          m.textContent = "...10자 이상...";
          m.className = "...red...";
          return;
        }
        if (!state.currentUser || !state.currentUser.classId) {
          m.textContent = "...수업 참여 필요...";
          m.className = "...red...";
          return;
        }
        let charCtx = "profKim";
        if (state.previousModalType === "task") charCtx = "alex";
        if (state.previousModalType === "briefing") charCtx = "sena";
        try {
          const r = await fetch("/api/question/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: state.currentUser.email,
              classId: state.currentUser.classId,
              question: q,
              characterContext: charCtx,
              progress: {
                week: state.currentWeek,
                cycle: state.currentCycleIndex,
                title: CURRICULUM[state.currentWeek] || "N/A",
              },
            }),
          });
          const res = await r.json();
          if (r.ok) {
            m.textContent = "제출 성공!";
            m.className = "...green...";
            setTimeout(() => {
              showModal(state.previousModalType);
            }, 1500);
          } else {
            throw new Error(res.message);
          }
        } catch (err) {
          m.textContent = `오류: ${err.message}`;
          m.className = "...red...";
        }
        break;
      case "submit_journal":
        const rt = [];
        if (!state.weekData || !state.weekData.cycles) return;
        const tp = state.weekData.cycles.map((c) => c.title);
        let ar = true;
        for (let i = 0; i < tp.length; i++) {
          const comp = document.querySelector(
            `input[name="comprehension-${i}"]:checked`
          );
          const app = document.querySelector(
            `input[name="application-${i}"]:checked`
          );
          if (!comp || !app) {
            ar = false;
            break;
          }
          rt.push({
            topic: tp[i],
            comprehension: parseInt(comp.value),
            application: parseInt(app.value),
          });
        }
        const je = document.getElementById("journal-error-message");
        if (!je) return;
        if (!ar) {
          je.textContent = "...모두 평가...";
          return;
        }
        const fb = {
          meaningful:
            document.getElementById("journal-meaningful")?.value || "",
          difficult: document.getElementById("journal-difficult")?.value || "",
          curious: document.getElementById("journal-curious")?.value || "",
        };
        if (!state.currentUser.classId) {
          je.textContent = "...수업 참여 필요...";
          return;
        }
        je.textContent = "제출 중...";
        try {
          await fetch("/api/log/reflection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: state.currentUser.email,
              classId: state.currentUser.classId,
              week: state.currentWeek,
              ratings: rt,
              feedback: fb,
            }),
          });
          const fin = state.currentWeek >= 12;
          if (!fin) saveProgress(state.currentWeek + 1, 0);
          else saveProgress(13, 0);
          updatePortalDashboard();
          showView("start-screen");
        } catch (e) {
          je.textContent = "제출 오류.";
        }
        break;
    }
  };

  async function showMyQuestions() {
    // ... (rest of the function - including the w-10 h-10 fix) ...
    if (!myQuestionsModal || !myQuestionsList || !state.currentUser) return;
    myQuestionsModal.classList.remove("hidden");
    if (typeof lucide !== "undefined") lucide.createIcons();
    myQuestionsList.innerHTML = "...";
    try {
      const r = await fetch(
        `/api/questions/my?email=${state.currentUser.email}`
      );
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
          const charImgSrc = imageUrls[q.characterContext] || imageUrls.profKim;
          // ★★★ 이미지 크기 w-10 h-10 적용 ★★★
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

  function setupAnswerListener() {
    // ... (rest of the function - no changes needed) ...
    if (questionListenerUnsubscribe) {
      questionListenerUnsubscribe();
    }
    if (!state.currentUser || state.currentUser.role !== "student") return;
    if (typeof firebase === "undefined" || !firebase.apps.length) {
      console.error("Firebase NI.");
      return;
    }
    const db = firebase.firestore();
    questionListenerUnsubscribe = db
      .collection("questions")
      .where("studentEmail", "==", state.currentUser.email)
      .where("isResolved", "==", true)
      .where("isNotified", "==", false)
      .onSnapshot(
        (snp) => {
          snp.docChanges().forEach((chg) => {
            if (chg.type === "added") {
              const q = chg.doc.data();
              const img = document.getElementById("notification-char-img");
              const bub = document.getElementById("notification-bubble");
              if (img)
                img.src = imageUrls[q.characterContext] || imageUrls.profKim;
              if (bub) bub.textContent = "응답 등록됨.";
              if (answerNotification)
                answerNotification.classList.remove("hidden");
              chg.doc.ref.update({ isNotified: true });
            }
          });
        },
        (err) => {
          console.error("Listener err: ", err);
        }
      );
  }

  function showReflectionModal(isFinal = false) {
    // ... (rest of the function - no changes needed) ...
    const c = isFinal
      ? "모든 커리큘럼 완료! 최종 업무일지 작성"
      : `${state.currentWeek}주차 업무일지 작성`;
    if (!state.currentUser) return;
    showModal("reflection", { content: c, userName: state.currentUser.name });
    setTimeout(() => {
      const cont = document.getElementById("journal-topics-container");
      if (!cont || !state.weekData || !state.weekData.cycles) return;
      const html = state.weekData.cycles
        .map((cyc, idx) => {
          const rh = (n, i) =>
            [1, 2, 3, 4, 5]
              .map(
                (v) =>
                  `<label class="flex items-center space-x-1 cursor-pointer"><input type="radio" name="${n}-${i}" value="${v}" class="form-radio text-indigo-500 h-5 w-5"><span class="text-lg">${v}</span></label>`
              )
              .join("");
          return `<div class="bg-gray-900/50 p-4 rounded-lg"><h3 class="font-bold text-lg text-white">${
            idx + 1
          }. ${
            cyc.title
          }</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3"><div><p class="text-sm text-gray-300 mb-2">이번 주제의 <span class="font-bold text-yellow-300">개념</span>을 얼마나 이해했나요?</p><div class="flex justify-between items-center bg-gray-700 p-2 rounded-lg"><span class="text-xs text-gray-400">부족</span>${rh(
            "comprehension",
            idx
          )}<span class="text-xs text-gray-400">충분</span></div></div><div><p class="text-sm text-gray-300 mb-2">스스로 코드를 <span class="font-bold text-yellow-300">활용</span>할 수 있나요?</p><div class="flex justify-between items-center bg-gray-700 p-2 rounded-lg"><span class="text-xs text-gray-400">부족</span>${rh(
            "application",
            idx
          )}<span class="text-xs text-gray-400">충분</span></div></div></div></div>`;
        })
        .join("");
      cont.innerHTML = html;
    }, 100);
  }

  window.toggleSyntaxDetail = (id) => {
    document.getElementById(id)?.classList.toggle("hidden");
  };

  async function saveProgress(week, cycle) {
    // ... (rest of the function - no changes needed) ...
    if (!state.currentUser) return;
    try {
      await fetch("/api/progress/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.currentUser.email,
          progress: { week, cycle },
        }),
      });
      state.currentUser.progress = { week, cycle };
    } catch (err) {
      console.error("Save fail:", err);
    }
  }

  function updateDashboardUI(cycleData) {
    // ... (rest of the function - no changes needed) ...
    if (!cycleData) return;
    if (taskWidgets)
      taskWidgets.forEach((el) => {
        if (el)
          el.innerHTML = `<h3 class="font-bold text-lg text-white flex items-center"><i data-lucide="clipboard-list" class="w-5 h-5 mr-2 text-indigo-400"></i>${
            cycleData.title || "업무"
          }</h3><p class="text-sm text-gray-400 mt-2">${
            cycleData.task?.content?.replace(/<[^>]*>?/gm, "") || ""
          }</p>`;
      }); // Added optional chaining
    if (editorFilenames)
      editorFilenames.forEach((el) => {
        if (el) el.textContent = cycleData.filename || "script.py";
      });
    const code = cycleData.starterCode
      ? cycleData.starterCode.replace(/\\n/g, "\n")
      : "# 코드";
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

  function updateSyntaxIndex(taskKey) {
    // ... (rest of the function - no changes needed) ...
    const ut = (target) => {
      if (!target) return;
      target.innerHTML = "";
      if (!state.syntaxDb || !taskKey) {
        target.innerHTML =
          '<p class="text-sm text-gray-500">필요한 문법 없음.</p>';
        return;
      }
      const rt = syntaxMap[taskKey] || [];
      if (rt.length === 0) {
        target.innerHTML =
          '<p class="text-sm text-gray-500">특별한 문법 없음.</p>';
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
    };
    if (syntaxIndexes) syntaxIndexes.forEach(ut);
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  const sendLiveCode = debounce(async (code) => {
    // ... (rest of the function - no changes needed) ...
    if (!state.currentUser || state.currentUser.role !== "student") return;
    try {
      await fetch("/api/livecode/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.currentUser.email,
          liveCode: code,
        }),
      });
    } catch (err) {
      console.error("Live code fail:", err);
    }
  }, 1000);

  function debounce(func, delay) {
    // ... (rest of the function - no changes needed) ...
    let t;
    return function (...args) {
      const ctx = this;
      clearTimeout(t);
      t = setTimeout(() => func.apply(ctx, args), delay);
    };
  }

  async function executeCodeInDashboard() {
    // ... (rest of the function - no changes needed) ...
    if (!state.monacoEditor) return;
    const code = state.monacoEditor.getValue();
    document
      .querySelectorAll(".run-code-btn-action")
      .forEach((b) => (b.disabled = true));
    if (terminalOutputs)
      terminalOutputs.forEach((el) => {
        if (el) {
          el.textContent = "...";
          el.classList.remove("text-red-400");
        }
      });
    const res = await runPythonCode(code);
    const out = res.success ?? res.error;
    if (terminalOutputs)
      terminalOutputs.forEach((el) => {
        if (el) {
          if (res.error) el.classList.add("text-red-400");
          el.textContent = out;
        }
      });
    document
      .querySelectorAll(".run-code-btn-action")
      .forEach((b) => (b.disabled = false));
  }

  async function logSubmission(isSuccess, error = "") {
    // ... (rest of the function - no changes needed) ...
    if (
      !state.currentUser ||
      state.currentUser.role !== "student" ||
      !state.currentUser.classId
    )
      return;
    try {
      await fetch("/api/log/submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.currentUser.email,
          classId: state.currentUser.classId,
          week: state.currentWeek,
          cycle: state.currentCycleIndex,
          isSuccess: isSuccess,
          error: String(error),
        }),
      });
    } catch (e) {
      console.error("Log fail:", e);
    }
  }

  function showDashboardForCurrentUser() {
    // ... (rest of the function - no changes needed) ...
    if (!state.currentUser) {
      showView("auth-container");
      return;
    } // Add guard
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

  function handleClassListClick(e) {
    // ... (rest of the function - no changes needed) ...
    const vb = e.target.closest(".view-status-btn");
    const rb = e.target.closest(".report-btn");
    const db = e.target.closest(".delete-class-btn");
    if (vb) {
      const id = vb.dataset.classId;
      window.location.href = `/monitor?classId=${id}`;
    } else if (rb) {
      const id = rb.dataset.classId;
      window.location.href = `/report?classId=${id}`;
    } else if (db) {
      const id = db.dataset.classId;
      const nm = db.dataset.className;
      deleteClass(id, nm);
    }
  }

  async function fetchAndDisplayClasses() {
    // ... (rest of the function - include gray delete button class) ...
    if (!state.currentUser || state.currentUser.role !== "instructor") return;
    const iui = document.getElementById("instructor-user-info");
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
            // ★★★ 삭제 버튼 회색조 적용 ★★★
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
            }" class="delete-class-btn bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">삭제</button></div>`; // Changed bg-red-600 to bg-gray-600
            classListContainer.appendChild(el);
          });
          classListContainer.removeEventListener("click", handleClassListClick);
          classListContainer.addEventListener("click", handleClassListClick);
        }
      } else
        classListContainer.innerHTML = `<p class="text-red-400">오류...</p>`;
    } catch (err) {
      classListContainer.innerHTML = `<p class="text-red-400">오류...</p>`;
    }
  }

  async function deleteClass(classId, className) {
    // ... (rest of the function - no changes needed) ...
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
      alert("통신 오류.");
    }
  }

  // [수정] Monaco Editor 재초기화 로직 적용
  async function setupDashboardFromTemplate() {
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

    taskWidgets = document.querySelectorAll(".task-widget-content");
    editorFilenames = document.querySelectorAll(".editor-filename-content");
    editorTargets = document.querySelectorAll(
      "#dashboard-main .code-editor-content"
    );
    editorTargetsMobile = document.querySelectorAll(
      "#mobile-panel-code .code-editor-content"
    );
    terminalOutputs = document.querySelectorAll(".terminal-output-content");
    syntaxIndexes = document.querySelectorAll(".syntax-index-content");

    await new Promise((resolve) => {
      require(["vs/editor/editor.main"], () => {
        if (typeof monaco !== "undefined") {
          const editorOptions = {
            language: "python",
            theme: "vs-dark",
            automaticLayout: true,
            minimap: { enabled: false },
            wordWrap: "on",
          };

          // Dispose existing editors FIRST
          if (state.monacoEditor) {
            state.monacoEditor.dispose();
            state.monacoEditor = null;
          }
          if (state.monacoEditorMobile) {
            state.monacoEditorMobile.dispose();
            state.monacoEditorMobile = null;
          }

          // Always create new editors attached to the NEW DOM elements
          if (editorTargets.length > 0 && editorTargets[0]) {
            try {
              state.monacoEditor = monaco.editor.create(
                editorTargets[0],
                editorOptions
              );
              state.monacoEditor.onDidChangeModelContent(() => {
                const v = state.monacoEditor.getValue();
                sendLiveCode(v);
                if (
                  state.monacoEditorMobile &&
                  state.monacoEditorMobile.getValue() !== v
                ) {
                  state.monacoEditorMobile.setValue(v);
                }
              });
            } catch (e) {
              console.error("Desktop editor create fail:", e);
            }
          } else {
            console.error("Desktop target missing.");
          }

          if (editorTargetsMobile.length > 0 && editorTargetsMobile[0]) {
            try {
              state.monacoEditorMobile = monaco.editor.create(
                editorTargetsMobile[0],
                editorOptions
              );
              state.monacoEditorMobile.onDidChangeModelContent(() => {
                const v = state.monacoEditorMobile.getValue();
                sendLiveCode(v);
                if (state.monacoEditor && state.monacoEditor.getValue() !== v) {
                  state.monacoEditor.setValue(v);
                }
              });
            } catch (e) {
              console.error("Mobile editor create fail:", e);
            }
          } else {
            console.error("Mobile target missing.");
          }
        } else {
          console.error("Monaco NI.");
        }
        resolve();
      });
    });

    // Attach listeners AFTER editor setup
    document.querySelectorAll(".hint-btn-action").forEach((b) => {
      b.removeEventListener("click", showLectureModal);
      b.addEventListener("click", showLectureModal);
    });
    document.querySelectorAll(".run-code-btn-action").forEach((b) => {
      b.removeEventListener("click", executeCodeInDashboard);
      b.addEventListener("click", executeCodeInDashboard);
    });
    document.querySelectorAll(".submit-btn-action").forEach((b) => {
      b.removeEventListener("click", submitCode);
      b.addEventListener("click", submitCode);
    });
  }
  function showLectureModal() {
    if (state.weekData) showModal("lecture");
  }

  async function submitCode() {
    // ... (rest of the function - no changes needed) ...
    if (!state.weekData || !state.monacoEditor) {
      console.error("Submit fail: NI");
      return;
    }
    const studentCode = state.monacoEditor.getValue();
    const cycleData = state.weekData.cycles[state.currentCycleIndex];
    const studentResult = await runPythonCode(studentCode);
    if (studentResult.error) {
      logSubmission(false, parseErrorMessage(studentResult.error));
      return showModal("feedback", {
        feedbackType: "failure_runtime",
        errorMessage: parseErrorMessage(studentResult.error),
      });
    }
    if (cycleData.expectedPrintOutput) {
      const actualOutput = studentResult.success.trim();
      if (actualOutput !== cycleData.expectedPrintOutput) {
        const err = `출력값 불일치. 기대: '${cycleData.expectedPrintOutput}', 실제: '${actualOutput}'`;
        logSubmission(false, err);
        return showModal("feedback", {
          feedbackType: "failure_logical",
          errorMessage: err,
        });
      }
    }
    if (cycleData.testCode) {
      const finalCode = studentCode + "\n" + cycleData.testCode;
      const testResult = await runPythonCode(finalCode);
      if (testResult.error) {
        const pe = parseErrorMessage(testResult.error);
        logSubmission(false, pe);
        return showModal("feedback", {
          feedbackType: "failure_logical",
          errorMessage: pe,
        });
      }
    }
    logSubmission(true);
    return showModal("feedback", { feedbackType: "success" });
  }
  // --- Other function definitions END ---

  // Start the initialization process
  initializePyodide();
}); // End of DOMContentLoaded listener
