document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get("classId");

  const classTitle = document.getElementById("class-title");

  if (!classId) {
    classTitle.textContent = "오류: 수업 ID가 없습니다.";
    return;
  }

  try {
    const response = await fetch(`/api/analytics/class/${classId}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message);
    }

    const data = result;

    // 1. 제목 및 핵심 통계 업데이트
    classTitle.textContent = `${data.className} - 학습 분석 리포트`;
    document.getElementById("total-submissions").textContent =
      data.totalSubmissions;
    document.getElementById(
      "success-rate"
    ).textContent = `${data.successRate} %`;

    // 2. 주차별 성공률 차트 렌더링
    const weeklyCtx = document
      .getElementById("weekly-success-chart")
      .getContext("2d");
    const sortedWeeks = Object.keys(data.weeklySuccessRate).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );

    new Chart(weeklyCtx, {
      type: "bar",
      data: {
        labels: sortedWeeks,
        datasets: [
          {
            label: "성공률 (%)",
            data: sortedWeeks.map((week) => data.weeklySuccessRate[week]),
            backgroundColor: "rgba(79, 70, 229, 0.8)",
            borderColor: "rgba(129, 140, 248, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { color: "#9ca3af" },
          },
          x: {
            ticks: { color: "#9ca3af" },
          },
        },
        plugins: {
          legend: {
            labels: { color: "#9ca3af" },
          },
        },
      },
    });

    // 3. 테이블 렌더링
    const mostFailedTable = document.getElementById("most-failed-table");
    if (data.mostFailedCycles.length > 0) {
      mostFailedTable.innerHTML = data.mostFailedCycles
        .map(
          (item) => `
                <tr class="border-b border-gray-700">
                    <td class="py-2 px-4">${item[0]}</td>
                    <td class="py-2 px-4 text-red-400 font-bold">${item[1]} 회</td>
                </tr>
            `
        )
        .join("");
    } else {
      mostFailedTable.innerHTML =
        '<tr><td colspan="2" class="py-2 px-4 text-gray-500">실패 기록이 없습니다.</td></tr>';
    }

    const studentProgressTable = document.getElementById(
      "student-progress-table"
    );
    if (data.studentProgress.length > 0) {
      studentProgressTable.innerHTML = data.studentProgress
        .map(
          (student) => `
                 <tr class="border-b border-gray-700">
                    <td class="py-2 px-4">${student.name} (${student.email})</td>
                    <td class="py-2 px-4">${student.week}주차 ${student.cycle}사이클</td>
                </tr>
            `
        )
        .join("");
    } else {
      studentProgressTable.innerHTML =
        '<tr><td colspan="2" class="py-2 px-4 text-gray-500">학생 정보가 없습니다.</td></tr>';
    }

    // 4. [추가] 업무일지 분석 렌더링
    const weekSelector = document.getElementById("week-selector");
    const reflectionContainer = document.getElementById(
      "reflection-analysis-container"
    );
    const noReflectionData = document.getElementById("no-reflection-data");
    let selfAssessmentChart = null;

    const reflectionWeeks = Object.keys(data.reflectionAnalysis).sort(
      (a, b) => a - b
    );
    if (reflectionWeeks.length > 0) {
      reflectionWeeks.forEach((week) => {
        const option = document.createElement("option");
        option.value = week;
        option.textContent = `${week}주차`;
        weekSelector.appendChild(option);
      });

      weekSelector.addEventListener("change", (e) => {
        renderReflectionData(e.target.value);
      });

      renderReflectionData(reflectionWeeks[0]);
    } else {
      weekSelector.style.display = "none";
    }

    function renderReflectionData(week) {
      const weekData = data.reflectionAnalysis[week];
      if (!weekData) {
        reflectionContainer.classList.add("hidden");
        noReflectionData.classList.remove("hidden");
        return;
      }

      reflectionContainer.classList.remove("hidden");
      noReflectionData.classList.add("hidden");

      document.getElementById("participant-count").textContent =
        weekData.participant_count;

      const topics = Object.keys(weekData.topics);
      const comprehensionData = topics.map(
        (t) => weekData.topics[t].comprehension_avg
      );
      const applicationData = topics.map(
        (t) => weekData.topics[t].application_avg
      );

      if (selfAssessmentChart) {
        selfAssessmentChart.destroy();
      }
      const assessmentCtx = document
        .getElementById("self-assessment-chart")
        .getContext("2d");
      selfAssessmentChart = new Chart(assessmentCtx, {
        type: "bar",
        data: {
          labels: topics,
          datasets: [
            {
              label: "이해도 평균",
              data: comprehensionData,
              backgroundColor: "rgba(59, 130, 246, 0.7)",
              borderColor: "rgba(96, 165, 250, 1)",
              borderWidth: 1,
            },
            {
              label: "활용도 평균",
              data: applicationData,
              type: "line",
              borderColor: "rgba(234, 179, 8, 1)",
              backgroundColor: "rgba(234, 179, 8, 0.5)",
              tension: 0.1,
            },
          ],
        },
        options: {
          scales: {
            y: { beginAtZero: true, max: 5, ticks: { color: "#9ca3af" } },
            x: { ticks: { color: "#9ca3af" } },
          },
          plugins: { legend: { labels: { color: "#9ca3af" } } },
        },
      });

      // 텍스트 피드백 렌더링
      const renderFeedback = (elementId, feedbackArray) => {
        const container = document.getElementById(elementId);
        if (feedbackArray.length > 0) {
          container.innerHTML = feedbackArray
            .map((fb) => `<p class="bg-gray-700/50 p-2 rounded-md">${fb}</p>`)
            .join("");
        } else {
          container.innerHTML =
            '<p class="text-gray-500">작성된 내용이 없습니다.</p>';
        }
      };

      renderFeedback(
        "feedback-meaningful",
        weekData.feedback_summary.meaningful
      );
      renderFeedback("feedback-difficult", weekData.feedback_summary.difficult);
      renderFeedback("feedback-curious", weekData.feedback_summary.curious);
    }
  } catch (error) {
    classTitle.textContent = "리포트 로딩 실패";
    classTitle.nextElementSibling.textContent = error.message;
  }
});
