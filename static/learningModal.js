// /static/learningModal.js

import { state } from "./state.js";
import { CURRICULUM, IMAGE_URLS } from "./config.js";
import { loadAndStartCycle } from "./main.js"; // next_cycle에서 사용
// 👇👇👇 필요한 함수들을 import 합니다.
import {
  saveProgress,
  markCodingIntroAsSeen, // 여기서 사용하기 위해 import
  savePauseState,
  clearPauseState,
} from "./firebase.js";
import { runPythonCode, parseErrorMessage } from "./codeEditor.js";
import {
  showView,
  updateDashboardUI,
  updateSyntaxIndex,
  showDashboardForCurrentUser,
} from "./ui.js";

const modalContainer = document.getElementById("modal-container");
const modalContentWrapper = document.getElementById("modal-content-wrapper");
const dashboard = document.getElementById("dashboard"); // dashboard 참조 유지

// showWeeklyIntroModal, showCodingIntroModal 함수는 변경 없음
export function showWeeklyIntroModal() {
  showModal("weeklyIntro");
}
export function showCodingIntroModal() {
  showModal("codingIntro");
}

// getTemplates 함수는 변경 없음
function getTemplates(userName) {
  const renderContent = (text) =>
    text ? text.replace(/{{USERNAME}}/g, userName).replace(/"/g, "&quot;") : "";
  const initialButtonClasses =
    "opacity-0 pointer-events-none transition-opacity duration-300";
  // ★★★★★ '질문하기' 버튼의 z-index를 'z-[70]'으로 상향 조정 (대시보드 버튼(z-40)보다 높게) ★★★★★
  const qaButton = `<button onclick="handleAction('ask_question', event)" class="fixed bottom-8 right-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-full z-[70] shadow-lg flex items-center space-x-2"><i data-lucide="help-circle" class="w-6 h-6"></i><span class="hidden md:block">교수님께 질문하기</span></button>`;
  const pauseButton = `<button onclick="handleAction('pause_task', event)" class="fixed top-6 left-6 bg-gray-600/50 hover:bg-gray-700/70 text-white font-bold py-2 px-4 rounded-full z-[70] shadow-lg flex items-center space-x-2"><i data-lucide="pause" class="w-5 h-5"></i><span>일시정지</span></button>`;
  return {
    renderContent,
    weeklyIntro: (week, userName, alexImagePath) => {
      const isFirstWeek = week === 1;
      const title = isFirstWeek
        ? `LogiCore Tech OJT 환영!`
        : `좋은 아침, ${userName}님.`;
      const buttonText = isFirstWeek
        ? "업무용 플래너 확인"
        : "네, 팀장님! 확인하겠습니다!";
      return `<div class="absolute bottom-0 right-10"><img src="${alexImagePath}" class="character-img"></div><div class="relative w-full h-full flex flex-col justify-end items-start p-10 md:p-20"><div class="content-pop-in bg-gray-800/80 backdrop-blur-md max-w-2xl rounded-2xl p-6 md:p-8 border border-gray-600 shadow-2xl"><h2 class="text-2xl md:text-3xl font-bold text-white mt-1">${title}</h2><p class="mt-4 text-gray-300"><span class="dialogue-text"></span></p><div class="mt-6"><button id="modal-primary-button" onclick="handleAction('confirm_weekly_intro', event)" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg ${initialButtonClasses}">${buttonText}</button></div></div></div>`;
    },
    codingIntro: () => {
      return `<div class="relative w-full h-full flex items-center justify-center p-4"><div class="content-pop-in max-w-lg w-full flex justify-center"><div class="speech-bubble bg-gray-800/90 text-gray-300 italic p-6 md:p-8 rounded-2xl border border-gray-600 shadow-2xl relative"><span class="dialogue-text"></span><div class="absolute bottom-[-10px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-t-[10px] border-t-gray-800/90 border-r-[10px] border-r-transparent"></div><div class="mt-6 flex justify-end"><button id="modal-primary-button" onclick="handleAction('confirm_coding_intro', event)" class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-6 rounded-lg ${initialButtonClasses}">에디터 아래쪽에 있는 "강의회상"을 클릭하세요!</button></div></div></div></div>`;
    },
    task: (cycleData) => {
      return `${pauseButton}${qaButton}<div class="absolute bottom-0 right-10"><img data-character-key="${
        cycleData.task.character || "alex"
      }" src="" class="character-img"></div><div class="relative w-full h-full flex flex-col justify-end items-start p-10 md:p-20"><div class="content-pop-in bg-gray-800/80 backdrop-blur-md max-w-2xl rounded-2xl p-6 md:p-8 border border-gray-600 shadow-2xl"><p class="font-semibold text-indigo-400">${
        cycleData.task.subtitle
      }</p><h2 class="text-2xl md:text-3xl font-bold text-white mt-1">${
        cycleData.task.title
      }</h2><p class="mt-4 text-gray-300"><span class="dialogue-text"></span></p><div class="mt-6"><button id="modal-primary-button" onclick="handleAction('show_briefing', event)" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg ${initialButtonClasses}">선임 브리핑 듣기</button></div></div></div>`;
    },
    briefing: (cycleData) => {
      return `${pauseButton}${qaButton}<div class="absolute bottom-0 right-10"><img data-character-key="${
        cycleData.briefing.character || "sena"
      }" src="" class="character-img"></div><div class="relative w-full h-full flex flex-col justify-end items-start p-10 md:p-20"><div class="content-pop-in bg-gray-800/80 backdrop-blur-md max-w-2xl rounded-2xl p-6 md:p-8 border border-gray-600 shadow-2xl"><p class="font-semibold text-teal-400">${
        cycleData.briefing.subtitle
      }</p><h2 class="text-2xl md:text-3xl font-bold text-white mt-1">${
        cycleData.briefing.title
      }</h2><p class="mt-4 text-gray-300"><span class="dialogue-text"></span></p><div class="mt-6"><button id="modal-primary-button" onclick="handleAction('start_coding', event)" class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-lg ${initialButtonClasses}">네, 알겠습니다</button></div></div></div>`;
    },
    lecture: (cycleData) => {
      return `${pauseButton}${qaButton}<div class="absolute bottom-0 left-10"><img data-character-key="${
        cycleData.lecture.character || "profKim"
      }" src="" class="character-img"></div><div class="relative w-full h-full flex justify-end items-center p-4 md:p-10"><div class="content-pop-in bg-gray-800/80 backdrop-blur-md w-full max-w-4xl rounded-2xl shadow-2xl p-6 md:p-8 border border-gray-600 flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-8"><div class="w-full md:w-2/3 space-y-4 flex flex-col max-h-[70vh]"><h2 class="text-2xl md:text-3xl font-bold text-white text-yellow-300">${
        cycleData.lecture.title
      }</h2><div id="lecture-explanation" class="bg-black/20 p-4 rounded-lg min-h-[150px]"></div><div id="lecture-chalkboard" class="flex-grow p-4 rounded-lg overflow-y-auto"></div></div><div class="w-full md:w-1/3 flex flex-col space-y-4 md:border-l md:border-gray-700 md:pl-8"><div class="bg-yellow-900/50 p-3 rounded-lg"><h4 class="font-bold text-yellow-300">⭐ Key Point</h4><p class="text-xs mt-1"><span class="dialogue-text key-point-dialogue"></span></p></div><div class="bg-gray-900 p-3 rounded-lg flex-grow"><h4 class="font-bold text-white">📝 Try It Yourself!</h4><p class="text-xs mt-1 mb-2">코드 실행</p><div class="code-highlight text-xs mb-2 whitespace-pre-wrap">${
        cycleData.lecture.sandboxCode || ""
      }</div><button id="mini-run-btn" class="text-xs bg-blue-600 w-full py-1 rounded hover:bg-blue-700 ${initialButtonClasses}">실행</button><pre id="mini-output" class="text-xs mt-2 h-24 bg-black rounded p-1 whitespace-pre-wrap"></pre></div><div class="mt-auto flex flex-col space-y-2"><button id="back-to-dashboard-btn" onclick="handleAction('back_to_dashboard', event)" class="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg text-sm ${initialButtonClasses}">대시보드로 돌아가기</button></div></div></div></div>`;
    },
    feedback: (feedbackData, feedbackType) => {
      const isSuccess = feedbackType === "success";
      const cycleData = state.weekData?.cycles[state.currentCycleIndex];
      const editButtonHtml = `<button id="feedback-edit-button" onclick="handleAction('edit_code', event)" class="w-1/2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg ${initialButtonClasses}">코드 수정</button>`;
      const nextButtonHtml = `<button id="feedback-next-button" onclick="handleAction('next_cycle', event)" class="${
        isSuccess ? "w-full" : "w-1/2"
      } bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg ${initialButtonClasses}">${
        cycleData?.feedback?.success?.nextActionText || "다음 진행"
      }</button>`;
      return `<div class="absolute bottom-0 right-10"><img data-character-key="${
        feedbackData.character || "alex"
      }" src="" class="character-img"></div><div class="relative w-full h-full flex flex-col justify-end items-start p-10 md:p-20"><div class="content-pop-in bg-gray-800/80 backdrop-blur-md max-w-2xl rounded-2xl p-6 md:p-8 border border-gray-600 shadow-2xl"><p class="font-semibold text-green-400">${
        feedbackData.subtitle
      }</p><h2 class="text-2xl md:text-3xl font-bold text-white mt-1">${
        feedbackData.title
      }</h2><p class="mt-4 text-gray-300"><span class="dialogue-text"></span></p><div class="mt-6 flex space-x-4">${
        !isSuccess ? editButtonHtml : ""
      }${nextButtonHtml}</div></div></div>`;
    },
    reflection: (content, userName) => {
      return `<div class="w-full h-full flex items-center justify-center p-4"><div class="content-pop-in bg-gray-800 backdrop-blur-md max-w-4xl w-full rounded-2xl p-6 md:p-8 border border-gray-600 shadow-2xl overflow-y-auto max-h-[90vh]"><div class="flex items-center space-x-4"><img src="${IMAGE_URLS.alex}" class="w-16 h-16 rounded-full"><div><h2 class="text-2xl md:text-3xl font-bold text-white">주간 업무 회고</h2><p class="mt-1 text-gray-400">${userName}님, 고생했어요. 성장을 위해 잠시 업무일지를 작성해주세요.</p></div></div><hr class="border-gray-700 my-6"><p class="mt-2 text-gray-400">${content}</p><div id="journal-error-message" class="mt-2 text-sm text-red-400"></div><div id="journal-topics-container" class="mt-6 space-y-4"></div><div class="mt-8 space-y-6"><div><label class="font-bold text-lg text-white flex items-center"><i data-lucide="lightbulb" class="w-5 h-5 mr-2 text-yellow-400"></i>가장 의미있던 내용은?</label><textarea id="journal-meaningful" class="w-full mt-2 p-2 bg-gray-700 rounded-md text-white" rows="3"></textarea></div><div><label class="font-bold text-lg text-white flex items-center"><i data-lucide="alert-triangle" class="w-5 h-5 mr-2 text-red-400"></i>제일 어려웠던 내용은?</label><textarea id="journal-difficult" class="w-full mt-2 p-2 bg-gray-700 rounded-md text-white" rows="3"></textarea></div><div><label class="font-bold text-lg text-white flex items-center"><i data-lucide="search" class="w-5 h-5 mr-2 text-blue-400"></i>궁금한 점이 있다면?</label><textarea id="journal-curious" class="w-full mt-2 p-2 bg-gray-700 rounded-md text-white" rows="3"></textarea></div></div><div class="mt-8 flex justify-end"><button onclick="handleAction('submit_journal', event)" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg text-lg">제출하고 퇴근하기</button></div></div></div>`;
    },
    ask_question: () => {
      return `<div class="w-full h-full flex items-center justify-center"><div class="content-pop-in bg-gray-800 backdrop-blur-md max-w-2xl w-full rounded-2xl p-8 border border-gray-600 shadow-2xl"><h2 class="text-3xl font-bold text-white">교수님께 질문하기</h2><p class="mt-2 text-gray-400">(${
        state.currentWeek
      }주차 ${
        state.currentCycleIndex + 1
      }사이클) 질문 남기기.</p><textarea id="question-textarea" class="w-full mt-4 p-3 h-40 bg-gray-700 rounded-md text-white" placeholder="질문 입력..."></textarea><div id="question-message" class="mt-2 text-sm"></div><div class="mt-6 flex justify-end space-x-4"><button onclick="handleAction('cancel_question', event)" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg">취소</button><button onclick="handleAction('submit_question', event)" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg">제출</button></div></div></div>`;
    },
  };
}

// showModal 함수는 변경 없음
export async function showModal(type, options = {}) {
  state.currentModalType = type;
  if (!modalContainer || !modalContentWrapper) {
    console.error("Modal container or wrapper not found!");
    return;
  }
  modalContainer.classList.remove("hidden");
  const templates = getTemplates(
    state.currentUser ? state.currentUser.name : "User"
  );
  let templateHtml = "";
  const cycleData = state.weekData?.cycles[state.currentCycleIndex];
  let feedbackData;
  const modalBg = document.getElementById("modal-bg");
  switch (type) {
    case "weeklyIntro":
      if (!state.currentUser || !state.currentUser.progress) {
        console.error(
          "Cannot show weekly intro: currentUser or progress missing."
        );
        return;
      }
      const currentWeek = state.currentUser.progress.week;
      const isFirstWeek = currentWeek === 1;
      const bgImage = isFirstWeek ? IMAGE_URLS.introBg : IMAGE_URLS.morningBg;
      const alexImage = isFirstWeek
        ? IMAGE_URLS.introAlex
        : IMAGE_URLS.alexMorning;
      templateHtml = templates.weeklyIntro(
        currentWeek,
        state.currentUser.name,
        alexImage
      );
      if (modalBg) modalBg.style.backgroundImage = `url(${bgImage})`;
      break;
    case "codingIntro":
      templateHtml = templates.codingIntro();
      if (modalBg)
        modalBg.style.backgroundImage = `url(${IMAGE_URLS.selfTalkBg})`;
      break;
    case "task":
      if (!cycleData) return showView("start-screen");
      templateHtml = templates.task(cycleData);
      if (modalBg)
        modalBg.style.backgroundImage = `url(${IMAGE_URLS.officeBg})`;
      break;
    case "briefing":
      if (!cycleData) return showView("start-screen");
      templateHtml = templates.briefing(cycleData);
      if (modalBg)
        modalBg.style.backgroundImage = `url(${IMAGE_URLS.officeBg})`;
      break;
    case "lecture":
      if (!cycleData) return showView("start-screen");
      templateHtml = templates.lecture(cycleData);
      if (modalBg)
        modalBg.style.backgroundImage = `url(${IMAGE_URLS.lectureBg})`;
      break;
    case "feedback":
      if (!cycleData) return showView("start-screen");
      const feedbackType = options.feedbackType || "success";
      feedbackData = cycleData.feedback?.[feedbackType] ||
        cycleData.feedback?.["success"] || {
          character: "alex",
          subtitle: "Completed",
          title: "Good Job",
          content: "Proceed.",
        };
      if (
        options.errorMessage &&
        feedbackData.content?.includes("{{ERROR_MESSAGE}}")
      ) {
        feedbackData = JSON.parse(JSON.stringify(feedbackData));
        feedbackData.content = feedbackData.content.replace(
          "{{ERROR_MESSAGE}}",
          options.errorMessage
        );
      }
      templateHtml = templates.feedback(feedbackData, feedbackType);
      if (modalBg)
        modalBg.style.backgroundImage = `url(${IMAGE_URLS.officeBg})`;
      break;
    case "reflection":
      templateHtml = templates.reflection(
        options.content || "Please reflect.",
        options.userName || state.currentUser?.name || "User"
      );
      if (modalBg)
        modalBg.style.backgroundImage = `url(${IMAGE_URLS.officeBg})`;
      break;
    case "ask_question":
      templateHtml = templates.ask_question();
      if (modalBg)
        modalBg.style.backgroundImage = `url(${IMAGE_URLS.officeBg})`;
      break;
    default:
      console.warn(`Unknown modal type: ${type}`);
      if (modalContainer) modalContainer.classList.add("hidden");
      return;
  }
  modalContentWrapper.innerHTML = templateHtml;
  if (typeof lucide !== "undefined") lucide.createIcons();
  handleModalPostRender(type, cycleData, feedbackData, templates);
}

// handleModalPostRender 함수는 변경 없음
function handleModalPostRender(type, cycleData, feedbackData, templates) {
  const charImg = modalContentWrapper.querySelector(".character-img");
  const mainDialogueSpan = modalContentWrapper.querySelector(
    ".content-pop-in .dialogue-text:not(.key-point-dialogue), .speech-bubble .dialogue-text:not(.key-point-dialogue)"
  );
  const keyPointDialogueSpan = modalContentWrapper.querySelector(
    ".key-point-dialogue"
  );
  let mainDialogueContent = "";
  if (type === "task" && cycleData?.task?.content)
    mainDialogueContent = templates.renderContent(cycleData.task.content);
  else if (type === "briefing" && cycleData?.briefing?.content)
    mainDialogueContent = templates.renderContent(cycleData.briefing.content);
  else if (type === "feedback" && feedbackData?.content)
    mainDialogueContent = templates.renderContent(feedbackData.content);
  else if (type === "weeklyIntro" && state.currentUser?.progress) {
    const week = state.currentUser.progress.week;
    mainDialogueContent =
      week === 1
        ? `{{USERNAME}}씨, 반가워요. LogiCore Tech OJT에 온 것을 환영합니다. 저는 당신의 OJT를 담당할 팀장 Alex입니다. 앞으로 당신의 성장을 옆에서 돕겠습니다. 우선, 회사에서 제공한 **업무용 플래너**를 통해 오늘 수행해야 할 첫 업무와 전체 OJT 과정을 확인해주십시오.`
        : `좋은 아침입니다, {{USERNAME}}씨. 지난주 수고 많았어요. 이번 ${week}주차에는 '${
            CURRICULUM[week] || "새로운 주제"
          }'에 대해 학습하며 한 단계 더 성장하게 될 겁니다. 자, 이제 **업무용 플래너**를 확인하고 오늘 업무를 시작해봅시다. 이번 주도 힘내세요!`;
    mainDialogueContent = mainDialogueContent.replace(
      /{{USERNAME}}/g,
      state.currentUser.name || "User"
    );
  } else if (type === "codingIntro") {
    const monologues = [
      `(팀장님과 선임님의 설명을 들었는데... 막상 코드를 짜려니 조금 막연하네.)<br>(어떻게 시작해야 할지 감이 잘 안 잡히는데...)<br>아, 맞다! 이 내용은 학교 수업에서 배운 기억이 나. 그때 교수님이 설명해주신 강의 내용을 다시 회상해보면 해결할 수 있을 것 같아!`,
      `(좋아, 이번 업무는 해볼 만 하겠는데?)<br>(그래도 시작하기 전에, 관련된 개념을 확실하게 한번 더 짚고 넘어가는 게 좋겠어.)<br>실수하지 않으려면 복습이 중요하지. 교수님께 배웠던 내용을 다시 회상해보자!`,
      `(흠... 이번 과업은 처음 보는 개념이 조금 섞여 있네.)<br>(이걸 어떻게 해결해야 가장 효율적일까? 관련된 수업 내용이 있었던 것 같은데...)\n그래, 무작정 시작하기 전에 강의 내용을 다시 회상하며 전략을 세워보는 거야!`,
    ];
    mainDialogueContent =
      monologues[Math.floor(Math.random() * monologues.length)];
  }
  if (charImg) {
    let characterKey = "alex";
    if (type === "weeklyIntro") {
    } else if (type === "task" && cycleData?.task?.character) {
      characterKey = cycleData.task.character;
    } else if (type === "briefing" && cycleData?.briefing?.character) {
      characterKey = cycleData.briefing.character;
    } else if (type === "lecture" && cycleData?.lecture?.character) {
      characterKey = cycleData.lecture.character;
    } else if (type === "feedback" && feedbackData?.character) {
      characterKey = feedbackData.character;
    }
    if (type !== "weeklyIntro") {
      charImg.src = IMAGE_URLS[characterKey] || IMAGE_URLS.alex;
    }
    setTimeout(() => {
      charImg.classList.add("visible");
    }, 100);
  }
  const typesNeedingTyping = [
    "task",
    "briefing",
    "feedback",
    "weeklyIntro",
    "codingIntro",
  ];
  if (typesNeedingTyping.includes(type)) {
    if (mainDialogueSpan && mainDialogueContent) {
      setTimeout(() => {
        mainDialogueContent = mainDialogueContent.replace(
          /{?\/\*.*?\*\/}?/g,
          ""
        );
        let primaryButton = modalContentWrapper.querySelector(
          "#modal-primary-button"
        );
        let feedbackNextButton = modalContentWrapper.querySelector(
          "#feedback-next-button"
        );
        let feedbackEditButton = modalContentWrapper.querySelector(
          "#feedback-edit-button"
        );
        const buttonsToShow = [];
        if (type === "feedback") {
          if (feedbackNextButton) buttonsToShow.push(feedbackNextButton);
          if (feedbackEditButton) buttonsToShow.push(feedbackEditButton);
        } else if (primaryButton) {
          buttonsToShow.push(primaryButton);
        }
        try {
          new Typed(mainDialogueSpan, {
            strings: [mainDialogueContent],
            typeSpeed: 25,
            showCursor: false,
            disableBackspacing: true,
            onComplete: () => {
              buttonsToShow.forEach((button) => {
                if (button) {
                  button.classList.remove("opacity-0", "pointer-events-none");
                  setTimeout(() => {
                    button.classList.add("animate-pulse");
                  }, 150);
                }
              });
            },
          });
        } catch (e) {
          console.error(`Typed.js failed for ${type}:`, e, mainDialogueSpan);
          if (mainDialogueSpan)
            mainDialogueSpan.innerHTML = mainDialogueContent;
          buttonsToShow.forEach((button) => {
            if (button) {
              button.classList.remove("opacity-0", "pointer-events-none");
              setTimeout(() => {
                button.classList.add("animate-pulse");
              }, 150);
            }
          });
        }
      }, 500);
    } else {
      let primaryButton = modalContentWrapper.querySelector(
        "#modal-primary-button"
      );
      let feedbackNextButton = modalContentWrapper.querySelector(
        "#feedback-next-button"
      );
      let feedbackEditButton = modalContentWrapper.querySelector(
        "#feedback-edit-button"
      );
      const buttonsToShow = [];
      if (type === "feedback") {
        if (feedbackNextButton) buttonsToShow.push(feedbackNextButton);
        if (feedbackEditButton) buttonsToShow.push(feedbackEditButton);
      } else if (primaryButton) {
        buttonsToShow.push(primaryButton);
      }
      setTimeout(() => {
        buttonsToShow.forEach((button) => {
          if (button) {
            button.classList.remove("opacity-0", "pointer-events-none");
            button.classList.add("animate-pulse");
          }
        });
      }, 500);
    }
  }
  if (type === "lecture" && cycleData) {
    const keyPointContent = templates.renderContent(
      cycleData.lecture.keyTakeaway
    );
    setupLectureAnimation(
      cycleData,
      templates,
      keyPointDialogueSpan,
      keyPointContent
    );
    setupLectureSandbox(cycleData);
  }
  if (type === "reflection") {
    setupReflectionForm();
    const submitJournalBtn = modalContentWrapper.querySelector(
      "button[onclick*='submit_journal']"
    );
    if (submitJournalBtn) {
      submitJournalBtn.classList.remove("opacity-0", "pointer-events-none");
    }
  }
  if (type === "ask_question") {
    const cancelBtn = modalContentWrapper.querySelector(
      "button[onclick*='cancel_question']"
    );
    const submitBtn = modalContentWrapper.querySelector(
      "button[onclick*='submit_question']"
    );
    if (cancelBtn)
      cancelBtn.classList.remove("opacity-0", "pointer-events-none");
    if (submitBtn)
      submitBtn.classList.remove("opacity-0", "pointer-events-none");
  }
}

// setupLectureAnimation 함수는 변경 없음
function setupLectureAnimation(
  cycleData,
  templates,
  keyPointDialogueSpan,
  keyPointContent
) {
  const lectureSections = cycleData.lecture?.sections || [];
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
    let noteHtml = lectureSections
      .map(
        (section, index) =>
          `<div class="mb-2"><h4 class="font-bold text-yellow-400">${
            index + 1
          }. ${
            section.heading || "Section"
          }</h4><p class="text-xs text-gray-400">${templates.renderContent(
            section.text || ""
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
  const miniRunBtn = modalContentWrapper.querySelector("#mini-run-btn");
  const backToDashboardBtn = modalContentWrapper.querySelector(
    "#back-to-dashboard-btn"
  );
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
                      if (miniRunBtn) {
                        miniRunBtn.classList.remove(
                          "opacity-0",
                          "pointer-events-none"
                        );
                        setTimeout(
                          () => miniRunBtn.classList.add("animate-pulse"),
                          150
                        );
                      }
                    },
                  });
                } catch (e) {
                  console.error("Typed.js KP failed:", e);
                  if (keyPointDialogueSpan)
                    keyPointDialogueSpan.innerHTML = keyPointContent;
                  if (miniRunBtn) {
                    miniRunBtn.classList.remove(
                      "opacity-0",
                      "pointer-events-none"
                    );
                    setTimeout(
                      () => miniRunBtn.classList.add("animate-pulse"),
                      150
                    );
                  }
                }
              } else {
                if (miniRunBtn) {
                  miniRunBtn.classList.remove(
                    "opacity-0",
                    "pointer-events-none"
                  );
                  setTimeout(
                    () => miniRunBtn.classList.add("animate-pulse"),
                    150
                  );
                }
              }
            },
          });
        } catch (e) {
          console.error("Typed.js final failed:", e);
          if (finalTextSpan) finalTextSpan.innerHTML = finalMessage;
          if (miniRunBtn) {
            miniRunBtn.classList.remove("opacity-0", "pointer-events-none");
            setTimeout(() => miniRunBtn.classList.add("animate-pulse"), 150);
          }
        }
      }
      return;
    }
    const section = lectureSections[index];
    const buttonTexts = ["이해했습니다.", "확인했습니다.", "알겠습니다."];
    const randomButtonText =
      buttonTexts[Math.floor(Math.random() * buttonTexts.length)];
    explanationContainer.innerHTML = `<h3 class="font-bold text-white text-xl mb-2">${section.heading}</h3><div class="text-sm"><span id="explanation-text"></span></div><div id="explanation-confirm" class="text-right mt-4"><button id="explanation-confirm-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-sm opacity-0 pointer-events-none transition-opacity duration-300">${randomButtonText}</button></div>`;
    const explanationTextSpan =
      explanationContainer.querySelector("#explanation-text");
    const explanationConfirmBtn = document.getElementById(
      "explanation-confirm-btn"
    );
    if (explanationTextSpan) {
      try {
        new Typed(explanationTextSpan, {
          strings: [templates.renderContent(section.text) || ""],
          typeSpeed: 20,
          showCursor: false,
          onComplete: () => {
            if (explanationConfirmBtn) {
              explanationConfirmBtn.classList.remove(
                "opacity-0",
                "pointer-events-none"
              );
              setTimeout(
                () => explanationConfirmBtn.classList.add("animate-pulse"),
                150
              );
            }
          },
        });
      } catch (e) {
        console.error("Typed.js expl failed:", e);
        if (explanationTextSpan)
          explanationTextSpan.innerHTML =
            templates.renderContent(section.text) || "";
        if (explanationConfirmBtn) {
          explanationConfirmBtn.classList.remove(
            "opacity-0",
            "pointer-events-none"
          );
          setTimeout(
            () => explanationConfirmBtn.classList.add("animate-pulse"),
            150
          );
        }
      }
    } else {
      if (explanationConfirmBtn) {
        setTimeout(() => {
          explanationConfirmBtn.classList.remove(
            "opacity-0",
            "pointer-events-none"
          );
          explanationConfirmBtn.classList.add("animate-pulse");
        }, 300);
      }
    }
    if (explanationConfirmBtn) {
      explanationConfirmBtn.onclick = () => {
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
            chalkboardContainer.scrollTop = chalkboardContainer.scrollHeight;
          }, 100);
          setTimeout(() => {
            renderLectureStep(index + 1);
          }, 500);
        }, 300);
      };
    }
  }
  setTimeout(() => {
    renderLectureStep(0);
  }, 1200);
}

// setupLectureSandbox 함수는 변경 없음
function setupLectureSandbox(cycleData) {
  if (cycleData?.lecture?.sandboxCode) {
    const miniRunBtn = document.getElementById("mini-run-btn");
    const backToDashboardBtn = document.getElementById("back-to-dashboard-btn");
    const miniOutputEl = document.getElementById("mini-output");
    miniRunBtn?.addEventListener("click", async () => {
      const btn = miniRunBtn;
      if (!miniOutputEl) return;
      btn.disabled = true;
      btn.classList.remove("animate-pulse");
      miniOutputEl.textContent = "Executing...";
      miniOutputEl.classList.remove("text-red-400");
      const result = await runPythonCode(cycleData.lecture.sandboxCode);
      if (result.error) {
        miniOutputEl.classList.add("text-red-400");
        miniOutputEl.textContent = result.error;
      } else {
        miniOutputEl.textContent = result.success || "(출력 결과 없음)";
      }
      btn.disabled = false;
      if (backToDashboardBtn) {
        backToDashboardBtn.classList.remove("opacity-0", "pointer-events-none");
        setTimeout(
          () => backToDashboardBtn.classList.add("animate-pulse"),
          150
        );
      }
    });
  }
}

// setupReflectionForm 함수는 변경 없음
function setupReflectionForm() {
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
          cyc.title || "Topic"
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

// --- handleAction FUNCTION ---
window.handleAction = async (action, event) => {
  const clickedButton = event?.target.closest("button");
  if (clickedButton) {
    clickedButton.classList.remove("animate-pulse");
  }
  const cycleData = state.weekData?.cycles[state.currentCycleIndex];

  switch (action) {
    case "confirm_weekly_intro":
      if (modalContainer) modalContainer.classList.add("hidden");
      showDashboardForCurrentUser();
      break;

    case "confirm_coding_intro":
      if (modalContainer) modalContainer.classList.add("hidden");
      showView("dashboard");
      document
        .querySelectorAll(".hint-btn-action")
        .forEach((btn) => btn.classList.add("animate-pulse"));
      if (cycleData) {
        updateSyntaxIndex(cycleData.syntax_key);
        updateDashboardUI(cycleData);
      }
      requestAnimationFrame(() => {
        if (state.monacoEditor) state.monacoEditor.layout();
        if (state.monacoEditorMobile) state.monacoEditorMobile.layout();
        setTimeout(() => {
          if (state.monacoEditor) state.monacoEditor.focus();
        }, 100);
      });
      break;

    case "pause_task":
      if (confirm("현재 진행 상황을 저장하고 업무를 중단하시겠습니까?")) {
        const currentView = dashboard?.classList.contains("hidden")
          ? state.currentModalType
          : "dashboard";
        let currentCode = "";
        if (window.innerWidth >= 768 && state.monacoEditor) {
          currentCode = state.monacoEditor.getValue();
        } else if (window.innerWidth < 768 && state.monacoEditorMobile) {
          currentCode = state.monacoEditorMobile.getValue();
        } else if (state.monacoEditor) {
          currentCode = state.monacoEditor.getValue();
        }
        const pauseStateData = { view: currentView, code: currentCode };
        try {
          await savePauseState(pauseStateData);
          if (modalContainer) modalContainer.classList.add("hidden");
          showDashboardForCurrentUser();
        } catch (e) {
          console.error("Pause task failed:", e);
        }
      }
      break;

    case "show_briefing":
      showModal("briefing");
      break;

    case "start_coding":
      const introKey = `week${state.currentWeek}_cycle${state.currentCycleIndex}`;
      const seenIntros = state.currentUser?.seenCodingIntros || [];
      const resumeState = state.currentUser?.pauseState;
      const shouldShowCodingIntro =
        state.currentCycleIndex === 0 &&
        !seenIntros.includes(introKey) &&
        !resumeState;

      if (shouldShowCodingIntro) {
        console.log("Showing coding intro modal before dashboard...");
        showCodingIntroModal();
        markCodingIntroAsSeen(introKey);
      } else {
        console.log("Skipping coding intro, showing dashboard...");
        if (modalContainer) modalContainer.classList.add("hidden");
        showView("dashboard");
        if (cycleData) {
          updateSyntaxIndex(cycleData.syntax_key);
          updateDashboardUI(cycleData);
        }
        requestAnimationFrame(() => {
          if (state.monacoEditor) state.monacoEditor.layout();
          if (state.monacoEditorMobile) state.monacoEditorMobile.layout();
          setTimeout(() => {
            if (state.monacoEditor) state.monacoEditor.focus();
          }, 100);
        });
      }
      break;

    case "back_to_dashboard":
    case "edit_code":
      if (modalContainer) modalContainer.classList.add("hidden");
      showView("dashboard");
      requestAnimationFrame(() => {
        if (state.monacoEditor) state.monacoEditor.layout();
        if (state.monacoEditorMobile) state.monacoEditorMobile.layout();
        setTimeout(() => {
          if (state.monacoEditor) state.monacoEditor.focus();
        }, 100);
      });
      break;

    // ★★★★★ 여기부터 "cancel_question" 수정 ★★★★★
    case "cancel_question":
      // 'dashboard'에서 왔는지 확인
      if (state.previousModalType === "dashboard") {
        if (modalContainer) modalContainer.classList.add("hidden");
        showView("dashboard"); // 'dashboard' 뷰를 다시 보여줌
      } else {
        // 기존 로직 (다른 모달에서 왔을 경우)
        showModal(state.previousModalType || "task");
      }
      break;
    // ★★★★★ "cancel_question" 수정 완료 ★★★★★

    case "next_cycle":
      state.currentCycleIndex++;
      if (
        state.weekData &&
        state.currentCycleIndex < state.weekData.cycles.length
      ) {
        saveProgress(state.currentWeek, state.currentCycleIndex);
        loadAndStartCycle(state.currentWeek, state.currentCycleIndex); // main.js의 함수 사용
      } else {
        showReflectionModal();
      }
      break;

    // ★★★★★ 여기부터 "ask_question" 수정 ★★★★★
    case "ask_question":
      // state.currentModalType이 null이면(ui.js에서 설정됨) 'dashboard'에서 온 것으로 간주
      state.previousModalType = state.currentModalType || "dashboard";
      showModal("ask_question");
      break;
    // ★★★★★ "ask_question" 수정 완료 ★★★★★

    case "submit_question":
      const textarea = document.getElementById("question-textarea");
      const messageDiv = document.getElementById("question-message");
      if (!textarea || !messageDiv) return;
      const questionText = textarea.value.trim();
      if (questionText.length < 10) {
        messageDiv.textContent = "10자 이상";
        messageDiv.className = "mt-2 text-sm text-red-400";
        return;
      }
      if (!state.currentUser || !state.currentUser.classId) {
        messageDiv.textContent = "수업 참여 필요";
        messageDiv.className = "mt-2 text-sm text-red-400";
        return;
      }
      let characterContext = "profKim";
      // ★★★★★ 'dashboard'에서 질문 시 'profKim'으로 기본 설정 ★★★★★
      if (state.previousModalType === "task") characterContext = "alex";
      if (state.previousModalType === "briefing") characterContext = "sena";
      if (state.previousModalType === "lecture") characterContext = "profKim";
      if (state.previousModalType === "dashboard") characterContext = "profKim";
      // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

      if (clickedButton) clickedButton.disabled = true;
      messageDiv.textContent = "제출 중...";
      messageDiv.className = "mt-2 text-sm text-yellow-400";
      try {
        const response = await fetch("/api/question/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: state.currentUser.email,
            classId: state.currentUser.classId,
            question: questionText,
            characterContext: characterContext,
            progress: {
              week: state.currentWeek,
              cycle: state.currentCycleIndex,
              title:
                state.weekData?.cycles[state.currentCycleIndex]?.title ||
                CURRICULUM[state.currentWeek] ||
                "N/A",
            },
          }),
        });
        const result = await response.json();
        if (response.ok) {
          messageDiv.textContent = "제출 성공";
          messageDiv.className = "mt-2 text-sm text-green-400";
          textarea.value = "";
          setTimeout(() => {
            // ★★★★★ 여기부터 "submit_question" 콜백 수정 ★★★★★
            if (state.previousModalType === "dashboard") {
              if (modalContainer) modalContainer.classList.add("hidden");
              showView("dashboard");
            } else {
              showModal(state.previousModalType || "task");
            }
            // ★★★★★ "submit_question" 콜백 수정 완료 ★★★★★
          }, 1500);
        } else {
          throw new Error(result.message || "제출 실패");
        }
      } catch (err) {
        messageDiv.textContent = `오류: ${err.message}`;
        messageDiv.className = "mt-2 text-sm text-red-400";
        if (clickedButton) clickedButton.disabled = false;
      }
      break;

    case "submit_journal":
      // submit_journal 로직은 변경 없음
      const ratings = [];
      if (!state.weekData || !state.weekData.cycles) {
        alert("데이터 오류");
        return;
      }
      const topics = state.weekData.cycles.map((c) => c.title || "Topic");
      let allRated = true;
      for (let i = 0; i < topics.length; i++) {
        const comp = document.querySelector(
          `input[name="comprehension-${i}"]:checked`
        );
        const app = document.querySelector(
          `input[name="application-${i}"]:checked`
        );
        if (!comp || !app) {
          allRated = false;
          break;
        }
        ratings.push({
          topic: topics[i],
          comprehension: parseInt(comp.value),
          application: parseInt(app.value),
        });
      }
      const journalErrorDiv = document.getElementById("journal-error-message");
      if (!journalErrorDiv) return;
      if (!allRated) {
        journalErrorDiv.textContent = "모든 항목 평가 필요";
        return;
      }
      const feedback = {
        meaningful:
          document.getElementById("journal-meaningful")?.value.trim() || "",
        difficult:
          document.getElementById("journal-difficult")?.value.trim() || "",
        curious: document.getElementById("journal-curious")?.value.trim() || "",
      };
      if (!state.currentUser?.classId) {
        journalErrorDiv.textContent = "수업 참여 필요";
        return;
      }
      if (clickedButton) clickedButton.disabled = true;
      journalErrorDiv.textContent = "제출 중...";
      journalErrorDiv.className = "mt-2 text-sm text-yellow-400";
      try {
        const response = await fetch("/api/log/reflection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: state.currentUser.email,
            classId: state.currentUser.classId,
            week: state.currentWeek,
            ratings: ratings,
            feedback: feedback,
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "제출 실패");
        }
        const isFinalWeek = state.currentWeek >= Object.keys(CURRICULUM).length;
        const nextWeek = isFinalWeek
          ? state.currentWeek + 1
          : state.currentWeek + 1;
        const nextCycle = 0;
        await saveProgress(nextWeek, nextCycle);
        if (modalContainer) modalContainer.classList.add("hidden");
        showDashboardForCurrentUser();
      } catch (e) {
        journalErrorDiv.textContent = `오류: ${e.message}`;
        journalErrorDiv.className = "mt-2 text-sm text-red-400";
        if (clickedButton) clickedButton.disabled = false;
      }
      break;

    default:
      console.warn(`Unhandled action: ${action}`);
  }
};
// --- handleAction FUNCTION 수정 완료 ---

// showReflectionModal 함수는 변경 없음
export function showReflectionModal(isFinal = false) {
  const finalWeekNumber = Object.keys(CURRICULUM).length;
  const isActuallyFinal = state.currentWeek >= finalWeekNumber;
  const content = isActuallyFinal
    ? "모든 커리큘럼 완료! 마지막 업무일지 작성"
    : `${state.currentWeek}주차 업무 완료. 업무일지 작성`;
  if (!state.currentUser) {
    showView("auth-container");
    alert("로그인 정보 없음");
    return;
  }
  showModal("reflection", {
    content: content,
    userName: state.currentUser.name || "User",
  });
}
