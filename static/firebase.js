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
  setDoc, // Needed for logSubmissionToFirestore if used
  deleteField, // Needed for clearPauseState
  serverTimestamp, // Needed for sendLiveCode and logSubmissionToFirestore
  arrayUnion, // Needed for markCodingIntroAsSeen alternative (API used instead)
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// export된 firebaseConfig를 임포트합니다.
import { firebaseConfig } from "./firebase-config.js";
import { state } from "./state.js";
import { IMAGE_URLS } from "./config.js";

// v9 방식으로 Firebase 앱과 Firestore 인스턴스를 초기화합니다.
let app;
let db;

export function initializeFirebase() {
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase Initialized (v9)"); // Initialization confirmation
  }
  return db; // Return db instance for potential direct use elsewhere (optional)
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
  if (!state.currentUser || state.currentUser.role !== "student" || !db) {
    // console.warn("Cannot send live code: User not logged in, not student, or DB not ready.");
    return;
  }
  try {
    const userRef = doc(db, "users", state.currentUser.email);
    await updateDoc(userRef, {
      liveCode: code,
      lastActive: serverTimestamp(), // Firestore 서버 시간 사용
    });
    // console.log("Live code updated."); // Optional: Log success
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
    const response = await fetch("/api/coding-intro/seen", {
      // Ensure this API endpoint is correct
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
    console.log(`Marked coding intro '${introKey}' as seen via API.`);

    // 로컬 상태 동기화 (API 성공 시)
    if (!Array.isArray(state.currentUser.seenCodingIntros)) {
      state.currentUser.seenCodingIntros = [];
    }
    if (!state.currentUser.seenCodingIntros.includes(introKey)) {
      state.currentUser.seenCodingIntros.push(introKey);
    }
    sessionStorage.setItem("currentUser", JSON.stringify(state.currentUser));
  } catch (err) {
    console.error("Failed to mark coding intro as seen via API:", err);
    // Optionally alert the user or log more details
    // alert(`인트로 확인 상태 저장 실패: ${err.message}`);
  }
}

let questionListenerUnsubscribe = null;

/**
 * v9 모듈러 SDK 방식으로 실시간 Q&A 답변 리스너를 설정합니다.
 */
export function setupAnswerListener(answerNotification) {
  if (questionListenerUnsubscribe) {
    questionListenerUnsubscribe(); // Clean up previous listener
    console.log("Previous answer listener unsubscribed.");
  }
  if (!state.currentUser || state.currentUser.role !== "student" || !db) {
    console.warn(
      "Cannot setup answer listener: User not logged in, not student, or DB not initialized."
    );
    return;
  }
  if (!answerNotification) {
    console.warn(
      "Answer notification element not provided to setupAnswerListener."
    );
    return; // Stop if the UI element isn't available
  }

  console.log(`Setting up answer listener for ${state.currentUser.email}...`);

  // v9 쿼리 생성
  const q = query(
    collection(db, "questions"),
    where("studentEmail", "==", state.currentUser.email),
    where("isResolved", "==", true),
    where("isNotified", "==", false) // Only get un-notified resolved answers
  );

  questionListenerUnsubscribe = onSnapshot(
    q,
    (snapshot) => {
      console.log(
        `Answer listener snapshot received (${
          snapshot.docChanges().length
        } changes).`
      ); // Log snapshot activity
      snapshot.docChanges().forEach((change) => {
        const questionData = change.doc.data();
        const questionId = change.doc.id;
        console.log(
          `Change type: ${change.type}, Doc ID: ${questionId}, Data:`,
          questionData
        ); // Log each change

        // Process new or modified documents that fit the criteria
        if (change.type === "added" || change.type === "modified") {
          console.log(`New answer detected for question ID: ${questionId}`);
          const img = document.getElementById("notification-char-img");
          const bub = document.getElementById("notification-bubble");

          if (img) {
            img.src =
              IMAGE_URLS[questionData.characterContext] || IMAGE_URLS.profKim; // Use fallback
          } else {
            console.warn("Notification image element not found.");
          }
          if (bub) {
            bub.textContent = "교수님 답변이 등록되었습니다.";
          } else {
            console.warn("Notification bubble element not found.");
          }

          // Show the notification element
          answerNotification.classList.remove("hidden");
          console.log("Answer notification displayed.");

          // Mark as notified in Firestore to prevent re-notification
          const questionRef = doc(db, "questions", questionId);
          updateDoc(questionRef, { isNotified: true })
            .then(() => {
              console.log(
                `Successfully marked question ${questionId} as notified.`
              );
            })
            .catch((err) => {
              // Log error, but don't block UI. Might cause re-notification if update fails persistently.
              console.error(
                `Failed to update notification status for question ${questionId}:`,
                err
              );
            });
        }
        // Handle removals if necessary (though unlikely for this query)
        // if (change.type === "removed") {
        //   console.log(`Question ${questionId} removed from listener results.`);
        // }
      });
    },
    (error) => {
      // Handle listener errors (e.g., permissions)
      console.error("Answer listener encountered an error: ", error);
      // Optionally notify the user
      if (answerNotification) {
        answerNotification.innerHTML =
          '<p class="text-xs text-red-400">알림 수신 오류</p>';
        answerNotification.classList.remove("hidden");
      }
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
    sessionStorage.setItem("currentUser", JSON.stringify(state.currentUser)); // Update session storage
    console.log(`Progress saved: Week ${week}, Cycle ${cycle}`);
  } catch (err) {
    console.error("Failed to save progress:", err);
    alert("학습 진행 상황 저장에 실패했습니다."); // Notify user
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
    sessionStorage.setItem("currentUser", JSON.stringify(state.currentUser)); // Update session storage
    console.log("Pause state saved.");
  } catch (err) {
    console.error("Failed to save pause state:", err);
    alert("현재 상태 저장에 실패했습니다."); // Notify user
  }
}

/**
 * Firestore에서 일시정지 상태를 삭제합니다.
 */
export async function clearPauseState() {
  if (!state.currentUser || !state.currentUser.email || !db) return;
  try {
    const userRef = doc(db, "users", state.currentUser.email);
    await updateDoc(userRef, { pauseState: deleteField() }); // Use deleteField()
    // 로컬 상태 업데이트
    delete state.currentUser.pauseState;
    sessionStorage.setItem("currentUser", JSON.stringify(state.currentUser)); // Update session storage
    console.log("Pause state cleared.");
  } catch (err) {
    console.error("Failed to clear pause state:", err);
    alert("업무 복귀 처리 중 오류가 발생했습니다."); // Notify user
  }
}

// Optional: Function to log submissions directly to Firestore (alternative to API)
// export async function logSubmissionToFirestore(isSuccess, errorDetails = "") {
//     if (!state.currentUser || state.currentUser.role !== 'student' || !state.currentUser.classId || !db) return;
//     try {
//         const logRef = doc(collection(db, 'submission_logs'));
//         await setDoc(logRef, {
//             logId: logRef.id,
//             studentEmail: state.currentUser.email,
//             classId: state.currentUser.classId,
//             week: state.currentWeek,
//             cycle: state.currentCycleIndex,
//             isSuccess: isSuccess,
//             error: String(errorDetails),
//             submittedAt: serverTimestamp()
//         });
//         console.log("Submission logged successfully via Firestore.");
//     } catch (err) {
//         console.error("Failed to log submission via Firestore:", err);
//     }
// }
