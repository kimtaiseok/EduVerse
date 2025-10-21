// [수정] Firebase v9 모듈러 SDK에서 필요한 함수들을 직접 임포트합니다.
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import { firebaseConfig } from "./firebase-config.js";

// DOMContentLoaded 이벤트 리스너로 전체 코드를 감쌉니다.
document.addEventListener("DOMContentLoaded", () => {
  // [수정] v9 방식으로 Firebase 앱과 Firestore 인스턴스를 초기화합니다.
  let app;
  let db;
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (e) {
    console.error("Firebase 초기화 실패:", e);
    document.getElementById("class-title").textContent =
      "오류: Firebase 초기화 실패";
    return;
  }

  const classTitle = document.getElementById("class-title");
  const studentListContainer = document.getElementById(
    "student-list-container"
  );
  const qaDashboard = document.getElementById("qa-dashboard");
  const codeModal = document.getElementById("code-modal");
  const modalTitle = document.getElementById("modal-title");
  const liveCodeDisplay = document.getElementById("live-code-display");
  const closeModalBtn = document.getElementById("close-modal-btn");

  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get("classId");

  let unsubscribers = {};
  let questionUnsubscribe = null;

  if (!classId) {
    classTitle.textContent = "오류: 수업 ID가 없습니다.";
    return;
  }

  // [수정] v9 방식으로 Firestore 리스너를 설정합니다.
  async function setupStudentMonitoring() {
    const classRef = doc(db, "classes", classId);

    unsubscribers.classInfo = onSnapshot(
      classRef,
      async (docSnap) => {
        if (!docSnap.exists()) {
          classTitle.textContent = "오류: 해당 수업을 찾을 수 없습니다.";
          studentListContainer.innerHTML = "";
          if (unsubscribers.students) {
            Object.values(unsubscribers.students).forEach((unsub) => unsub());
          }
          unsubscribers.students = {};
          return;
        }

        const classData = docSnap.data();
        classTitle.textContent = `${classData.className} - 실시간 현황`;
        const studentEmails = classData.students || [];

        const currentStudentEmails = Object.keys(unsubscribers.students || {});

        const removedEmails = currentStudentEmails.filter(
          (email) => !studentEmails.includes(email)
        );
        removedEmails.forEach((email) => {
          if (unsubscribers.students[email]) {
            unsubscribers.students[email]();
            delete unsubscribers.students[email];
          }
          const card = document.getElementById(
            `student-card-${email.replace(/[@.]/g, "")}`
          );
          if (card) card.remove();
        });

        if (studentEmails.length === 0) {
          studentListContainer.innerHTML =
            '<p class="text-gray-500 col-span-full">아직 이 수업에 참여한 학생이 없습니다.</p>';
          return;
        }

        studentEmails.forEach((email) => {
          if (unsubscribers.students && unsubscribers.students[email]) return;

          if (!unsubscribers.students) unsubscribers.students = {};

          const studentRef = doc(db, "users", email);
          unsubscribers.students[email] = onSnapshot(
            studentRef,
            (studentDoc) => {
              if (studentDoc.exists()) {
                renderOrUpdateStudentCard(studentDoc.data());
              }
            },
            (error) => {
              console.error(`학생(${email}) 정보 수신 실패:`, error);
            }
          );
        });
      },
      (error) => {
        console.error("수업 정보 실시간 수신 실패:", error);
        classTitle.textContent = "오류: 수업 정보를 가져오지 못했습니다.";
      }
    );
  }

  // [수정] v9 방식으로 Firestore 리스너를 설정합니다.
  function setupQAMonitoring() {
    const q = query(
      collection(db, "questions"),
      where("classId", "==", classId),
      where("isResolved", "==", false),
      orderBy("createdAt", "asc")
    );

    questionUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const questions = [];
        snapshot.forEach((doc) => {
          questions.push({ id: doc.id, ...doc.data() });
        });
        renderQuestions(questions);
      },
      (error) => {
        console.error("실시간 질문 데이터 수신 실패:", error);
        qaDashboard.innerHTML = `<p class="text-red-400">질문 목록을 가져오는 데 실패했습니다: ${error.message}</p>`;
      }
    );
  }

  function renderOrUpdateStudentCard(student) {
    // ... (이 함수 내부는 변경 없음) ...
    const cardId = `student-card-${student.email.replace(/[@.]/g, "")}`;
    let card = document.getElementById(cardId);

    const progress = student.progress || { week: 1, cycle: 0 };
    const lastActiveTimestamp = student.lastActive
      ? student.lastActive.toDate().toISOString()
      : "";
    const pauseState = student.pauseState ? "paused" : "";
    const statusId = `status-${student.email.replace(/[@.]/g, "")}`;

    const cardHTML = `
            <div class="flex-grow">
                <h3 class="text-lg font-bold text-white">${student.name}</h3>
                <p class="text-sm text-gray-400">${student.email}</p>
                <div class="mt-4 text-sm">
                    <p><span class="font-bold text-indigo-400">현재 진도:</span> ${
                      progress.week
                    }주차 ${progress.cycle + 1}사이클</p>
                    <p class="mt-1"><span class="font-bold">학습 상태:</span> 
                        <span id="${statusId}" data-last-active="${lastActiveTimestamp}" data-pause-state="${pauseState}">정보 없음</span>
                    </p>
                </div>
            </div>
            <button data-email="${student.email}" data-name="${
      student.name
    }" class="view-code-btn w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg text-sm">
                실시간 코드 보기
            </button>
        `;

    if (card) {
      card.innerHTML = cardHTML;
    } else {
      card = document.createElement("div");
      card.id = cardId;
      card.className =
        "bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col";
      card.innerHTML = cardHTML;

      const noStudentMsg = studentListContainer.querySelector("p");
      if (noStudentMsg) noStudentMsg.remove();

      studentListContainer.appendChild(card);
    }
  }

  function renderQuestions(questions) {
    // ... (이 함수 내부는 변경 없음) ...
    if (questions.length === 0) {
      qaDashboard.innerHTML =
        '<p class="text-gray-500">아직 등록된 질문이 없습니다.</p>';
      return;
    }
    qaDashboard.innerHTML = questions
      .map(
        (q) => `
                <div class="bg-gray-900 p-3 rounded-lg mb-3">
                    <p class="text-xs text-gray-400">${q.studentEmail} (${q.progress.week}주차)</p>
                    <p class="text-sm mt-1">${q.question}</p>
                    <div class="mt-2">
                        <textarea id="answer-input-${q.id}" class="w-full p-2 bg-gray-700 rounded-md text-white text-sm" placeholder="답변을 입력하세요..."></textarea>
                        <button data-question-id="${q.id}" class="answer-btn w-full mt-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded-lg text-xs">답변 등록</button>
                    </div>
                </div>
            `
      )
      .join("");
  }

  function startStatusUpdater() {
    // ... (이 함수 내부는 변경 없음) ...
    setInterval(() => {
      const statusElements = document.querySelectorAll('[id^="status-"]');
      statusElements.forEach((el) => {
        const isPaused = el.dataset.pauseState === "paused";
        if (isPaused) {
          el.textContent = "⏸️ 일시정지";
          el.className = "text-blue-400 font-semibold";
          return;
        }

        const lastActiveString = el.dataset.lastActive;
        if (!lastActiveString) {
          el.textContent = "정보 없음";
          el.className = "text-gray-400";
          return;
        }
        const lastActiveDate = new Date(lastActiveString);
        const now = new Date();
        const diffMinutes =
          (now.getTime() - lastActiveDate.getTime()) / (1000 * 60);
        let statusText = "";
        let statusColor = "";
        if (diffMinutes < 1) {
          statusText = "🟢 학습 중";
          statusColor = "text-green-400 font-semibold";
        } else if (diffMinutes < 5) {
          statusText = "🟡 활동 중";
          statusColor = "text-yellow-400";
        } else {
          statusText = "🔴 정체";
          statusColor = "text-red-400 font-bold animate-pulse";
        }
        el.textContent = statusText;
        el.className = statusColor;
      });
    }, 2000);
  }

  studentListContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".view-code-btn");
    if (btn) {
      const studentEmail = btn.dataset.email;
      const studentName = btn.dataset.name;
      openCodeModal(studentEmail, studentName);
    }
  });

  // [수정] v9 방식으로 Firestore 문서 업데이트
  qaDashboard.addEventListener("click", async (e) => {
    const btn = e.target.closest(".answer-btn");
    if (btn) {
      const questionId = btn.dataset.questionId;
      const answerText = document
        .getElementById(`answer-input-${questionId}`)
        .value.trim();
      if (answerText.length < 5) {
        alert("답변을 5자 이상 입력해주세요.");
        return;
      }
      btn.disabled = true;
      btn.textContent = "등록 중...";
      try {
        const questionRef = doc(db, "questions", questionId);
        await updateDoc(questionRef, {
          answer: answerText,
          isResolved: true,
        });
      } catch (error) {
        alert("답변 등록 중 오류가 발생했습니다.");
        btn.disabled = false;
        btn.textContent = "답변 등록";
      }
    }
  });

  let liveCodeUnsubscribe = null;

  // [수정] v9 방식으로 Firestore 리스너 설정
  function openCodeModal(email, name) {
    modalTitle.textContent = `${name}(${email})님의 실시간 코드`;
    liveCodeDisplay.textContent = "코드를 불러오는 중입니다...";
    codeModal.classList.remove("hidden");
    lucide.createIcons();

    if (liveCodeUnsubscribe) liveCodeUnsubscribe();

    const userRef = doc(db, "users", email);
    liveCodeUnsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        liveCodeDisplay.textContent =
          docSnap.data().liveCode || "// 아직 작성된 코드가 없습니다.";
      } else {
        liveCodeDisplay.textContent = "// 학생 정보를 찾을 수 없습니다.";
      }
    });
  }

  closeModalBtn.addEventListener("click", () => {
    codeModal.classList.add("hidden");
    if (liveCodeUnsubscribe) {
      liveCodeUnsubscribe();
      liveCodeUnsubscribe = null;
    }
  });

  // 페이지 벗어날 때 모든 리스너 정리
  window.addEventListener("beforeunload", () => {
    Object.values(unsubscribers).forEach((unsub) => {
      if (typeof unsub === "function") {
        unsub();
      } else if (typeof unsub === "object") {
        Object.values(unsub).forEach((u) => u());
      }
    });
    if (questionUnsubscribe) questionUnsubscribe();
    if (liveCodeUnsubscribe) liveCodeUnsubscribe();
  });

  // 초기 실행
  setupStudentMonitoring();
  setupQAMonitoring();
  startStatusUpdater();
});
