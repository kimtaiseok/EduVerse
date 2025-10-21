// /static/learningModal.js

import { state } from "./state.js";
import { CURRICULUM, IMAGE_URLS } from "./config.js";
import { loadAndStartCycle, proceedToCycle } from "./main.js";
import { saveProgress, markCodingIntroAsSeen } from "./firebase.js";
import { runPythonCode, parseErrorMessage } from "./codeEditor.js";
import {
  showView,
  updateDashboardUI,
  updateSyntaxIndex,
  showDashboardForCurrentUser,
} from "./ui.js";

const modalContainer = document.getElementById("modal-container");
const modalContentWrapper = document.getElementById("modal-content-wrapper");
const dashboard = document.getElementById("dashboard");

export function showWeeklyIntroModal() {
  showModal("weeklyIntro");
}

export function showCodingIntroModal() {
  showModal("codingIntro");
}

export async function showModal(type, options = {}) {
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
    case "weeklyIntro":
      if (!state.currentUser) return;
      templateHtml = templates.weeklyIntro(
        state.currentUser.progress.week,
        state.currentUser.name
      );
      if (modalBg)
        modalBg.style.backgroundImage = `url(${IMAGE_URLS.officeBg})`;
      break;
    case "codingIntro":
      templateHtml = templates.codingIntro();
      if (modalBg) modalBg.style.backgroundImage = "none";
      break;
    case "ask_question":
      templateHtml = templates.ask_question();
      if (modalBg)
        modalBg.style.backgroundImage = `url(${IMAGE_URLS.officeBg})`;
      break;
    case "reflection":
      templateHtml = templates.reflection(options.content, options.userName);
      if (modalBg)
        modalBg.style.backgroundImage = `url(${IMAGE_URLS.officeBg})`;
      break;
    case "feedback":
      if (!cycleData) return showView("start-screen");
      const feedbackType = options.feedbackType || "success";

      // Submission logging is now handled in codeEditor.js's submitCode function

      feedbackData = cycleData.feedback[feedbackType] ||
        cycleData.feedback["success"] || {
          character: "alex",
          subtitle: "Completed",
          title: "Good Job",
          content: "Proceed to the next step.",
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
    case "task":
    case "briefing":
    case "lecture":
      if (!cycleData) return showView("start-screen");
      templateHtml = templates[type](cycleData);
      if (modalBg)
        modalBg.style.backgroundImage = `url(${
          type === "lecture" ? IMAGE_URLS.lectureBg : IMAGE_URLS.officeBg
        })`;
      break;
    default:
      if (modalContainer) modalContainer.classList.add("hidden");
      return;
  }

  modalContentWrapper.innerHTML = templateHtml;
  if (typeof lucide !== "undefined") lucide.createIcons();

  handleModalPostRender(type, cycleData, feedbackData, templates);
}

function handleModalPostRender(type, cycleData, feedbackData, templates) {
  const charImg = modalContentWrapper.querySelector(".character-img");
  const mainDialogueSpan = modalContentWrapper.querySelector(
    ".content-pop-in > p > .dialogue-text, .content-pop-in > div > p > .dialogue-text"
  );
  const keyPointDialogueSpan = modalContentWrapper.querySelector(
    ".bg-yellow-900\\/50 .dialogue-text"
  );

  let mainDialogueContent = "";
  let keyPointContent = "";

  if (type === "task" && cycleData?.task?.content)
    mainDialogueContent = templates.renderContent(cycleData.task.content);
  else if (type === "briefing" && cycleData?.briefing?.content)
    mainDialogueContent = templates.renderContent(cycleData.briefing.content);
  else if (type === "feedback" && feedbackData?.content)
    mainDialogueContent = templates.renderContent(feedbackData.content);
  else if (type === "weeklyIntro" && state.currentUser) {
    const week = state.currentUser.progress.week;
    mainDialogueContent =
      week === 1
        ? `{{USERNAME}}씨, 반가워요. LogiCore Tech OJT에 온 것을 환영합니다. 저는 당신의 OJT를 담당할 팀장 Alex입니다. 앞으로 당신의 성장을 옆에서 돕겠습니다. 우선, 회사에서 제공한 **업무용 플래너**를 통해 오늘 수행해야 할 첫 업무와 전체 OJT 과정을 확인해주십시오.`
        : `좋은 아침입니다, {{USERNAME}}씨. 지난주 수고 많았어요. 이번 ${week}주차에는 '${
            CURRICULUM[week] || "새로운 주제"
          }'에 대해 학습하며 한 단계 더 성장하게 될 겁니다. 자, 이제 **업무용 플래너**를 확인하고 오늘 업무를 시작해봅시다.`;
    mainDialogueContent = mainDialogueContent.replace(
      /{{USERNAME}}/g,
      state.currentUser.name
    );
  } else if (type === "codingIntro") {
    const monologues = [
      `(팀장님과 선임님의 설명을 들었는데... 막상 코드를 짜려니 조금 막연하네.)\n(어떻게 시작해야 할지 감이 잘 안 잡히는데...)\n아, 맞다! 이 내용은 학교 수업에서 배운 기억이 나. 그때 교수님이 설명해주신 자료를 다시 떠올려보면 해결할 수 있을 것 같아!`,
      `(좋아, 이번 업무는 해볼 만 하겠는데?)\n(그래도 시작하기 전에, 관련된 개념을 확실하게 한번 더 짚고 넘어가는 게 좋겠어.)\n실수하지 않으려면 복습이 중요하지. 학교에서 배운 내용을 다시 떠올려보자!`,
      `(흠... 이번 과업은 처음 보는 개념이 조금 섞여 있네.)\n(이걸 어떻게 해결해야 가장 효율적일까? 관련된 수업 내용이 있었던 것 같은데...)\n그래, 무작정 시작하기 전에 강의 내용을 다시 회상하며 전략을 세워보는 거야!`,
    ];
    mainDialogueContent =
      monologues[Math.floor(Math.random() * monologues.length)];
  }

  if (charImg) {
    setTimeout(() => {
      charImg.classList.add("visible");
    }, 100);
  } else if (
    ["task", "briefing", "feedback", "lecture", "weeklyIntro"].includes(type)
  ) {
    // console.warn(`Character image element not found for modal type: ${type}`);
  }

  if (
    ["task", "briefing", "feedback", "weeklyIntro", "codingIntro"].includes(
      type
    )
  ) {
    if (mainDialogueSpan && mainDialogueContent) {
      setTimeout(() => {
        mainDialogueContent = mainDialogueContent
          .replace(/{?\/\*.*?\*\/}?/g, "")
          .replace(/\n/g, "<br>");
        try {
          const nextButton = modalContentWrapper.querySelector(
            ".content-pop-in button"
          );
          new Typed(mainDialogueSpan, {
            strings: [mainDialogueContent],
            typeSpeed: 25,
            showCursor: false,
            disableBackspacing: true,
            onComplete: () => {
              if (nextButton) {
                nextButton.classList.add("animate-pulse");
              }
            },
          });
        } catch (e) {
          console.error(`Typed.js failed for ${type}:`, e, mainDialogueSpan);
          if (mainDialogueSpan)
            mainDialogueSpan.innerHTML = mainDialogueContent;
          const nextButton = modalContentWrapper.querySelector(
            ".content-pop-in button"
          );
          if (nextButton) nextButton.classList.add("animate-pulse");
        }
      }, 500);
    } else if (mainDialogueSpan) {
      mainDialogueSpan.innerHTML = "";
      const nextButton = modalContentWrapper.querySelector(
        ".content-pop-in button"
      );
      if (nextButton)
        setTimeout(() => nextButton.classList.add("animate-pulse"), 500);
    } else {
      console.warn(
        `Main dialogue span element not found for modal type: ${type}`
      );
      const nextButton = modalContentWrapper.querySelector(
        ".content-pop-in button"
      );
      if (nextButton)
        setTimeout(() => nextButton.classList.add("animate-pulse"), 500);
    }
  }

  if (type === "lecture" && cycleData) {
    keyPointContent = templates.renderContent(cycleData.lecture.keyTakeaway);
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
  }
}

function setupLectureAnimation(
  cycleData,
  templates,
  keyPointDialogueSpan,
  keyPointContent
) {
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
                }
              } else {
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
        }
      }
      return;
    }

    const section = lectureSections[index];
    const buttonTexts = ["이해했습니다.", "확인했습니다.", "알겠습니다."];
    const randomButtonText =
      buttonTexts[Math.floor(Math.random() * buttonTexts.length)];
    explanationContainer.innerHTML = `<h3 class="font-bold text-white text-xl mb-2">${section.heading}</h3><div class="text-sm"><span id="explanation-text"></span></div><div id="explanation-confirm" class="text-right mt-4 opacity-0 transition-opacity duration-500"><button id="explanation-confirm-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-sm">${randomButtonText}</button></div>`;
    const explanationTextSpan =
      explanationContainer.querySelector("#explanation-text");

    if (explanationTextSpan) {
      try {
        new Typed(explanationTextSpan, {
          strings: [templates.renderContent(section.text) || ""],
          typeSpeed: 20,
          showCursor: false,
          onComplete: () => {
            const confirmDiv = document.getElementById("explanation-confirm");
            if (confirmDiv) {
              confirmDiv.style.opacity = "1";
              const confirmBtn = confirmDiv.querySelector("button");
              if (confirmBtn) confirmBtn.classList.add("animate-pulse");
            }
          },
        });
      } catch (e) {
        console.error("Typed.js explanation failed:", e);
        if (explanationTextSpan)
          explanationTextSpan.innerHTML =
            templates.renderContent(section.text) || "";
        const confirmDiv = document.getElementById("explanation-confirm");
        if (confirmDiv) {
          confirmDiv.style.opacity = "1";
          const confirmBtn = confirmDiv.querySelector("button");
          if (confirmBtn) confirmBtn.classList.add("animate-pulse");
        }
      }
    } else {
      const confirmDiv = document.getElementById("explanation-confirm");
      if (confirmDiv) {
        confirmDiv.style.opacity = "1";
        const confirmBtn = confirmDiv.querySelector("button");
        if (confirmBtn) confirmBtn.classList.add("animate-pulse");
      }
    }

    explanationConfirmBtn = document.getElementById("explanation-confirm-btn");
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

function setupLectureSandbox(cycleData) {
  if (cycleData?.lecture?.sandboxCode) {
    const miniRunBtn = document.getElementById("mini-run-btn");
    const backToDashboardBtn = document.getElementById("back-to-dashboard-btn");
    miniRunBtn?.addEventListener("click", async () => {
      const btn = miniRunBtn;
      const outputEl = document.getElementById("mini-output");
      if (!outputEl) return;
      btn.disabled = true;
      btn.classList.remove("animate-pulse");
      outputEl.textContent = "Executing...";
      const result = await runPythonCode(cycleData.lecture.sandboxCode);
      outputEl.textContent = result.success || result.error;
      btn.disabled = false;
      if (backToDashboardBtn) {
        backToDashboardBtn.classList.remove("opacity-30");
        backToDashboardBtn.classList.add("animate-pulse");
      }
    });
  }
}

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

window.handleAction = async (action, event) => {
  const clickedButton = event?.target.closest("button");
  if (clickedButton) {
    clickedButton.classList.remove("animate-pulse");
  }

  const cycleData = state.weekData?.cycles[state.currentCycleIndex];
  switch (action) {
    case "confirm_weekly_intro":
      showDashboardForCurrentUser();
      break;
    case "confirm_coding_intro":
      if (modalContainer) modalContainer.classList.add("hidden");

      showView("dashboard");

      document.querySelectorAll(".hint-btn-action").forEach((btn) => {
        btn.classList.add("animate-pulse");
      });

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
    case "pause_task":
      if (confirm("현재 진행 상황을 저장하고 업무를 중단하시겠습니까?")) {
        const currentView = dashboard?.classList.contains("hidden")
          ? state.currentModalType
          : "dashboard";
        let currentCode = "";
        if (state.monacoEditor) currentCode = state.monacoEditor.getValue();
        const pauseStateData = { view: currentView, code: currentCode };
        try {
          await fetch("/api/pause/set", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: state.currentUser.email,
              pauseState: pauseStateData,
            }),
          });
          state.currentUser.pauseState = pauseStateData;
          sessionStorage.setItem(
            "currentUser",
            JSON.stringify(state.currentUser)
          );
          showDashboardForCurrentUser();
        } catch (e) {
          alert("상태 저장에 실패했습니다.");
        }
      }
      break;
    case "show_briefing":
      showModal("briefing");
      break;
    case "start_coding":
      const introKey = `week${state.currentWeek}_cycle${state.currentCycleIndex}`;
      const seenIntros = state.currentUser.seenCodingIntros || [];
      const shouldShowCodingIntro =
        state.currentCycleIndex === 0 && !seenIntros.includes(introKey);

      if (shouldShowCodingIntro) {
        showCodingIntroModal();
        markCodingIntroAsSeen(introKey);
      } else {
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
      }
      break;
    case "back_to_dashboard":
    case "edit_code":
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
      const textarea = document.getElementById("question-textarea");
      const messageDiv = document.getElementById("question-message");
      if (!textarea || !messageDiv) return;
      const questionText = textarea.value.trim();
      if (questionText.length < 10) {
        messageDiv.textContent = "질문은 10자 이상 입력해주세요.";
        messageDiv.className = "mt-2 text-sm text-red-400";
        return;
      }
      if (!state.currentUser || !state.currentUser.classId) {
        messageDiv.textContent = "수업에 참여한 학생만 질문할 수 있습니다.";
        messageDiv.className = "mt-2 text-sm text-red-400";
        return;
      }
      let characterContext = "profKim";
      if (state.previousModalType === "task") characterContext = "alex";
      if (state.previousModalType === "briefing") characterContext = "sena";
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
              title: CURRICULUM[state.currentWeek] || "N/A",
            },
          }),
        });
        const result = await response.json();
        if (response.ok) {
          messageDiv.textContent = "질문이 성공적으로 제출되었습니다.";
          messageDiv.className = "mt-2 text-sm text-green-400";
          setTimeout(() => {
            showModal(state.previousModalType);
          }, 1500);
        } else {
          throw new Error(result.message);
        }
      } catch (err) {
        messageDiv.textContent = `오류: ${err.message}`;
        messageDiv.className = "mt-2 text-sm text-red-400";
      }
      break;
    case "submit_journal":
      const ratings = [];
      if (!state.weekData || !state.weekData.cycles) return;
      const topics = state.weekData.cycles.map((c) => c.title);
      let allRated = true;
      for (let i = 0; i < topics.length; i++) {
        const comprehensionRadio = document.querySelector(
          `input[name="comprehension-${i}"]:checked`
        );
        const applicationRadio = document.querySelector(
          `input[name="application-${i}"]:checked`
        );
        if (!comprehensionRadio || !applicationRadio) {
          allRated = false;
          break;
        }
        ratings.push({
          topic: topics[i],
          comprehension: parseInt(comprehensionRadio.value),
          application: parseInt(applicationRadio.value),
        });
      }
      const journalErrorDiv = document.getElementById("journal-error-message");
      if (!journalErrorDiv) return;
      if (!allRated) {
        journalErrorDiv.textContent = "모든 항목에 대해 평가를 완료해주세요.";
        return;
      }
      const feedback = {
        meaningful: document.getElementById("journal-meaningful")?.value || "",
        difficult: document.getElementById("journal-difficult")?.value || "",
        curious: document.getElementById("journal-curious")?.value || "",
      };
      if (!state.currentUser.classId) {
        journalErrorDiv.textContent =
          "수업에 참여한 학생만 업무일지를 제출할 수 있습니다.";
        return;
      }
      journalErrorDiv.textContent = "제출 중...";
      try {
        await fetch("/api/log/reflection", {
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
        const isFinalWeek = state.currentWeek >= 12;
        if (!isFinalWeek) {
          saveProgress(state.currentWeek + 1, 0);
        } else {
          saveProgress(13, 0);
        }
        showDashboardForCurrentUser();
      } catch (e) {
        journalErrorDiv.textContent = "업무일지 제출 중 오류가 발생했습니다.";
      }
      break;
  }
};

export function showReflectionModal(isFinal = false) {
  const content = isFinal
    ? "모든 커리큘럼을 완료하셨습니다! 마지막 업무일지를 작성해주세요."
    : `${state.currentWeek}주차의 모든 업무를 완료했습니다. 업무일지를 작성해주세요.`;
  if (!state.currentUser) return;
  showModal("reflection", {
    content: content,
    userName: state.currentUser.name,
  });
}

function getTemplates(userName) {
  const renderContent = (text) =>
    text ? text.replace(/{{USERNAME}}/g, userName).replace(/"/g, "&quot;") : "";
  const qaButton = `<button onclick="handleAction('ask_question', event)" class="fixed bottom-8 right-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-full z-[70] shadow-lg flex items-center space-x-2"><i data-lucide="help-circle" class="w-6 h-6"></i><span>교수님께 질문</span></button>`;
  const pauseButton = `<button onclick="handleAction('pause_task', event)" class="fixed top-6 left-6 bg-gray-600/50 hover:bg-gray-700/70 text-white font-bold py-2 px-4 rounded-full z-[70] shadow-lg flex items-center space-x-2"><i data-lucide="pause" class="w-5 h-5"></i><span>일시정지</span></button>`;

  return {
    renderContent,
    weeklyIntro: (week, userName) => {
      const isFirstWeek = week === 1;
      const title = isFirstWeek
        ? `LogiCore Tech OJT에 오신 것을 환영합니다!`
        : `좋은 아침입니다, ${userName}님.`;
      return `<div class="absolute bottom-0 right-10"><img src="${IMAGE_URLS.alex}" class="character-img"></div><div class="relative w-full h-full flex flex-col justify-end items-start p-10 md:p-20"><div class="content-pop-in bg-gray-800/80 backdrop-blur-md max-w-2xl rounded-2xl p-6 md:p-8 border border-gray-600 shadow-2xl"><h2 class="text-2xl md:text-3xl font-bold text-white mt-1">${title}</h2><p class="mt-4 text-gray-300"><span class="dialogue-text"></span></p><div class="mt-6"><button onclick="handleAction('confirm_weekly_intro', event)" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg">업무 플래너 확인하기</button></div></div></div>`;
    },
    codingIntro: () => {
      return `<div class="relative w-full h-full flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"><div class="content-pop-in bg-gray-800/90 max-w-lg w-full rounded-2xl p-6 md:p-8 border border-gray-600 shadow-2xl flex items-start space-x-4"><i data-lucide="lightbulb" class="w-10 h-10 text-yellow-300 flex-shrink-0 mt-1"></i><div><p class="text-gray-300 italic"><span class="dialogue-text"></span></p><div class="mt-6 flex justify-end"><button onclick="handleAction('confirm_coding_intro', event)" class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-6 rounded-lg">좋았어, 강의를 다시 떠올려보자!</button></div></div></div></div>`;
    },
    task: (cycleData) =>
      `${pauseButton}${qaButton}<div class="absolute bottom-0 right-10"><img src="${
        IMAGE_URLS[cycleData.task.character]
      }" class="character-img"></div><div class="relative w-full h-full flex flex-col justify-end items-start p-10 md:p-20"><div class="content-pop-in bg-gray-800/80 backdrop-blur-md max-w-2xl rounded-2xl p-6 md:p-8 border border-gray-600 shadow-2xl"><p class="font-semibold text-indigo-400">${
        cycleData.task.subtitle
      }</p><h2 class="text-2xl md:text-3xl font-bold text-white mt-1">${
        cycleData.task.title
      }</h2><p class="mt-4 text-gray-300"><span class="dialogue-text"></span></p><div class="mt-6"><button onclick="handleAction('show_briefing', event)" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg">선임 브리핑 듣기</button></div></div></div>`,
    briefing: (cycleData) =>
      `${pauseButton}${qaButton}<div class="absolute bottom-0 right-10"><img src="${
        IMAGE_URLS[cycleData.briefing.character]
      }" class="character-img"></div><div class="relative w-full h-full flex flex-col justify-end items-start p-10 md:p-20"><div class="content-pop-in bg-gray-800/80 backdrop-blur-md max-w-2xl rounded-2xl p-6 md:p-8 border border-gray-600 shadow-2xl"><p class="font-semibold text-teal-400">${
        cycleData.briefing.subtitle
      }</p><h2 class="text-2xl md:text-3xl font-bold text-white mt-1">${
        cycleData.briefing.title
      }</h2><p class="mt-4 text-gray-300"><span class="dialogue-text"></span></p><div class="mt-6"><button onclick="handleAction('start_coding', event)" class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-lg">네, 알겠습니다</button></div></div></div>`,
    lecture: (cycleData) =>
      `${pauseButton}${qaButton}<div class="absolute bottom-0 left-10"><img src="${
        IMAGE_URLS[cycleData.lecture.character]
      }" class="character-img"></div><div class="relative w-full h-full flex justify-end items-center p-4 md:p-10"><div class="content-pop-in bg-gray-800/80 backdrop-blur-md w-full max-w-4xl rounded-2xl shadow-2xl p-6 md:p-8 border border-gray-600 flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-8"><div class="w-full md:w-2/3 space-y-4 flex flex-col max-h-[70vh]"><h2 class="text-2xl md:text-3xl font-bold text-white text-yellow-300">${
        cycleData.lecture.title
      }</h2><div id="lecture-explanation" class="bg-black/20 p-4 rounded-lg min-h-[150px]"></div><div id="lecture-chalkboard" class="flex-grow p-4 rounded-lg overflow-y-auto"></div></div><div class="w-full md:w-1/3 flex flex-col space-y-4 md:border-l md:border-gray-700 md:pl-8"><div class="bg-yellow-900/50 p-3 rounded-lg"><h4 class="font-bold text-yellow-300">⭐ Key Point</h4><p class="text-xs mt-1"><span class="dialogue-text"></span></p></div><div class="bg-gray-900 p-3 rounded-lg flex-grow"><h4 class="font-bold text-white">📝 Try It Yourself!</h4><p class="text-xs mt-1 mb-2">아래 코드를 실행해보세요.</p><div class="code-highlight text-xs mb-2 whitespace-pre-wrap">${
        cycleData.lecture.sandboxCode || ""
      }</div><button id="mini-run-btn" class="text-xs bg-blue-600 w-full py-1 rounded hover:bg-blue-700">실행</button><pre id="mini-output" class="text-xs mt-2 h-24 bg-black rounded p-1 whitespace-pre-wrap"></pre></div><div class="mt-auto flex flex-col space-y-2"><button id="back-to-dashboard-btn" onclick="handleAction('back_to_dashboard', event)" class="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg text-sm">대시보드로 돌아가기</button></div></div></div></div>`,
    feedback: (feedbackData, feedbackType) => {
      const isSuccess = feedbackType === "success";
      const cycleData = state.weekData?.cycles[state.currentCycleIndex];
      const editButtonHtml = `<button onclick="handleAction('edit_code', event)" class="w-1/2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg">코드 수정하기</button>`;
      const nextButtonHtml = `<button onclick="handleAction('next_cycle', event)" class="${
        isSuccess ? "w-full" : "w-1/2"
      } bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg">${
        cycleData?.feedback?.success?.nextActionText || "다음 업무 진행"
      }</button>`;
      return `<div class="absolute bottom-0 right-10"><img src="${
        IMAGE_URLS[feedbackData.character]
      }" class="character-img"></div><div class="relative w-full h-full flex flex-col justify-end items-start p-10 md:p-20"><div class="content-pop-in bg-gray-800/80 backdrop-blur-md max-w-2xl rounded-2xl p-6 md:p-8 border border-gray-600 shadow-2xl"><p class="font-semibold text-green-400">${
        feedbackData.subtitle
      }</p><h2 class="text-2xl md:text-3xl font-bold text-white mt-1">${
        feedbackData.title
      }</h2><p class="mt-4 text-gray-300"><span class="dialogue-text"></span></p><div class="mt-6 flex space-x-4">${
        !isSuccess ? editButtonHtml : ""
      }${nextButtonHtml}</div></div></div>`;
    },
    reflection: (content, userName) =>
      `<div class="w-full h-full flex items-center justify-center p-4"><div class="content-pop-in bg-gray-800 backdrop-blur-md max-w-4xl w-full rounded-2xl p-6 md:p-8 border border-gray-600 shadow-2xl overflow-y-auto max-h-[90vh]"><div class="flex items-center space-x-4"><img src="${IMAGE_URLS.alex}" class="w-16 h-16 rounded-full"><div><h2 class="text-2xl md:text-3xl font-bold text-white">주간 업무 회고 및 성장 리포트</h2><p class="mt-1 text-gray-400">${userName}님, 한 주간 고생 많으셨습니다. 다음 주 업무에 더 잘 적응하고, ${userName}님의 성장을 돕기 위해 잠시 시간을 내어 주간 업무일지를 작성해주세요.</p></div></div><hr class="border-gray-700 my-6"><p class="mt-2 text-gray-400">${content}</p><div id="journal-error-message" class="mt-2 text-sm text-red-400"></div><div id="journal-topics-container" class="mt-6 space-y-4"></div><div class="mt-8 space-y-6"><div><label class="font-bold text-lg text-white flex items-center"><i data-lucide="lightbulb" class="w-5 h-5 mr-2 text-yellow-400"></i>가장 의미있었던 내용은 무엇인가요?</label><textarea id="journal-meaningful" class="w-full mt-2 p-2 bg-gray-700 rounded-md text-white" rows="3"></textarea></div><div><label class="font-bold text-lg text-white flex items-center"><i data-lucide="alert-triangle" class="w-5 h-5 mr-2 text-red-400"></i>가장 어려웠던 점은 무엇인가요?</label><textarea id="journal-difficult" class="w-full mt-2 p-2 bg-gray-700 rounded-md text-white" rows="3"></textarea></div><div><label class="font-bold text-lg text-white flex items-center"><i data-lucide="search" class="w-5 h-5 mr-2 text-blue-400"></i>더 알아보고 싶은 것은 무엇인가요?</label><textarea id="journal-curious" class="w-full mt-2 p-2 bg-gray-700 rounded-md text-white" rows="3"></textarea></div></div><div class="mt-8 flex justify-end"><button onclick="handleAction('submit_journal', event)" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg text-lg">업무일지 제출 및 퇴근하기</button></div></div></div>`,
    ask_question: () =>
      `<div class="w-full h-full flex items-center justify-center"><div class="content-pop-in bg-gray-800 backdrop-blur-md max-w-2xl w-full rounded-2xl p-8 border border-gray-600 shadow-2xl"><h2 class="text-3xl font-bold text-white">교수님께 질문하기</h2><p class="mt-2 text-gray-400">현재 학습 내용(${
        state.currentWeek
      }주차 ${
        state.currentCycleIndex + 1
      }사이클)과 관련된 질문을 남겨주세요.</p><textarea id="question-textarea" class="w-full mt-4 p-3 h-40 bg-gray-700 rounded-md text-white" placeholder="여기에 질문을 입력하세요..."></textarea><div id="question-message" class="mt-2 text-sm"></div><div class="mt-6 flex justify-end space-x-4"><button onclick="handleAction('cancel_question', event)" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg">취소</button><button onclick="handleAction('submit_question', event)" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg">질문 제출</button></div></div></div>`,
  };
}
