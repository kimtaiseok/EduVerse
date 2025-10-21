// /static/firebase.js

// Firebase v9 모듈러 SDK에서 필요한 함수들을 직접 임포트합니다.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteField, // Firestore DELETE_FIELD 임포트 (pauseState 해제 시 필요)
  serverTimestamp, // Firestore SERVER_TIMESTAMP 임포트 (lastActive 업데이트 시 필요)
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// export된 firebaseConfig를 임포트합니다.
import { firebaseConfig } from "./firebase-config.js";
import { state } from "./state.js";
import { IMAGE_URLS } from "./config.js"; // IMAGE_URLS 임포트 추가 (Answer Listener에서 사용)

// v9 방식으로 Firebase 앱과 Firestore 인스턴스를 초기화합니다.
let app;
let db;

export function initializeFirebase() {
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
}

// Debounce 함수 (sendLiveCode에서 사용)
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    const context = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(context, args), delay);
  };
}

/**
 * 사용자의 실시간 코드 입력을 Firestore에 업데이트합니다. (Debounced)
 * @param {string} code - 사용자가 에디터에 입력한 코드
 */
export const sendLiveCode = debounce(async (code) => {
  // export 추가!
  if (!state.currentUser || state.currentUser.role !== "student" || !db) return;
  try {
    const userRef = doc(db, "users", state.currentUser.email);
    await updateDoc(userRef, {
      liveCode: code,
      lastActive: serverTimestamp(), // Firestore 서버 시간 사용
    });
    // API 호출 방식 대신 Firestore 직접 업데이트 사용
    // await fetch('/api/livecode/update', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     email: state.currentUser.email,
    //     liveCode: code
    //   })
    // });
  } catch (err) {
    console.error("Live code update failed:", err);
  }
}, 1000); // 1초 debounce

/**
 * 사용자가 특정 강의 회상 인트로를 봤음을 서버 API를 통해 기록합니다.
 * @param {string} introKey - 확인된 인트로의 고유 키 (예: 'week1_cycle0')
 */
export async function markCodingIntroAsSeen(introKey) {
  if (!state.currentUser || !state.currentUser.email) return;
  try {
    // API 엔드포인트를 호출하여 Firestore 업데이트
    const response = await fetch("/api/coding-intro/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: state.currentUser.email,
        introKey: introKey,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || "Server responded with an error.");
    }

    // 로컬 상태도 동기화
    if (!Array.isArray(state.currentUser.seenCodingIntros)) {
      state.currentUser.seenCodingIntros = [];
    }
    // 중복 추가 방지
    if (!state.currentUser.seenCodingIntros.includes(introKey)) {
      state.currentUser.seenCodingIntros.push(introKey);
    }
    sessionStorage.setItem("currentUser", JSON.stringify(state.currentUser));
  } catch (err) {
    console.error("Failed to mark coding intro as seen:", err);
    // 사용자에게 오류 알림 (선택 사항)
    // alert(`인트로 확인 상태 저장 실패: ${err.message}`);
  }
}

let questionListenerUnsubscribe = null;

/**
 * v9 모듈러 SDK 방식으로 실시간 Q&A 답변 리스너를 설정합니다.
 */
export function setupAnswerListener(answerNotification) {
  if (questionListenerUnsubscribe) {
    questionListenerUnsubscribe(); // 기존 리스너 해제
  }
  if (!state.currentUser || state.currentUser.role !== "student" || !db) {
    console.warn("User not logged in or DB not initialized for listener.");
    return;
  }

  // v9 쿼리 생성
  const q = query(
    collection(db, "questions"),
    where("studentEmail", "==", state.currentUser.email),
    where("isResolved", "==", true),
    where("isNotified", "==", false) // 아직 알림받지 않은 답변만
  );

  questionListenerUnsubscribe = onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        // 'added' 또는 'modified'일 때 알림 (modified는 혹시 모를 재알림 방지용 isNotified 업데이트 실패 대비)
        if (change.type === "added" || change.type === "modified") {
          const questionData = change.doc.data();
          const img = document.getElementById("notification-char-img");
          const bub = document.getElementById("notification-bubble");

          if (img)
            img.src =
              IMAGE_URLS[questionData.characterContext] || IMAGE_URLS.profKim;
          if (bub) bub.textContent = "교수님 답변이 등록되었습니다.";
          if (answerNotification) answerNotification.classList.remove("hidden");

          // 알림 표시 후, isNotified 필드를 true로 업데이트하여 중복 알림 방지
          const questionRef = doc(db, "questions", change.doc.id);
          updateDoc(questionRef, { isNotified: true }).catch((err) => {
            console.error("Failed to update notification status:", err);
          });
        }
      });
    },
    (error) => {
      console.error("Answer listener error: ", error);
      // 사용자에게 오류 알림 (선택 사항)
      // if (answerNotification) {
      //     answerNotification.innerHTML = '<p class="text-red-400">답변 알림 수신 오류</p>';
      //     answerNotification.classList.remove('hidden');
      // }
    }
  );
}

/**
 * 실시간 Q&A 답변 리스너를 해제합니다.
 */
export function unsubscribeFromAnswers() {
  if (questionListenerUnsubscribe) {
    questionListenerUnsubscribe();
    questionListenerUnsubscribe = null;
    console.log("Unsubscribed from answer listener.");
  }
}

/**
 * Firestore에 학습 진행 상황을 저장합니다.
 * @param {number} week - 현재 주차
 * @param {number} cycle - 현재 사이클 인덱스
 */
export async function saveProgress(week, cycle) {
  if (!state.currentUser || !state.currentUser.email || !db) return;
  try {
    const userRef = doc(db, "users", state.currentUser.email);
    await updateDoc(userRef, {
      progress: { week, cycle },
    });
    // 로컬 상태 업데이트
    state.currentUser.progress = { week, cycle };
    sessionStorage.setItem("currentUser", JSON.stringify(state.currentUser));
    console.log(`Progress saved: Week ${week}, Cycle ${cycle}`);
  } catch (err) {
    console.error("Failed to save progress:", err);
    alert("학습 진행 상황 저장에 실패했습니다.");
  }
}

/**
 * Firestore에 일시정지 상태를 저장합니다.
 * @param {object} pauseStateData - 저장할 일시정지 상태 데이터 { view: string, code: string }
 */
export async function savePauseState(pauseStateData) {
  if (!state.currentUser || !state.currentUser.email || !db) return;
  try {
    const userRef = doc(db, "users", state.currentUser.email);
    await updateDoc(userRef, { pauseState: pauseStateData });
    // 로컬 상태 업데이트
    state.currentUser.pauseState = pauseStateData;
    sessionStorage.setItem("currentUser", JSON.stringify(state.currentUser));
    console.log("Pause state saved.");
  } catch (err) {
    console.error("Failed to save pause state:", err);
    alert("현재 상태 저장에 실패했습니다.");
  }
}

/**
 * Firestore에서 일시정지 상태를 삭제합니다.
 */
export async function clearPauseState() {
  if (!state.currentUser || !state.currentUser.email || !db) return;
  try {
    const userRef = doc(db, "users", state.currentUser.email);
    await updateDoc(userRef, { pauseState: deleteField() }); // deleteField 사용
    // 로컬 상태 업데이트
    delete state.currentUser.pauseState;
    sessionStorage.setItem("currentUser", JSON.stringify(state.currentUser));
    console.log("Pause state cleared.");
  } catch (err) {
    console.error("Failed to clear pause state:", err);
    alert("업무 복귀 처리 중 오류가 발생했습니다.");
  }
}
