document.addEventListener("DOMContentLoaded", async () => {
  const subtitle = document.getElementById("chart-subtitle");
  const chartCanvas = document.getElementById("growth-chart");
  // --- ★★★★★ 여기부터 수정된 부분입니다 (HTML 요소 추가) ★★★★★ ---
  const topicsContainer = document.getElementById("weekly-topics-container");
  const topicsDiv = document.getElementById("weekly-topics");
  // --- ★★★★★ 수정 완료 ★★★★★ ---
  let growthChart = null;

  // 1. 세션 스토리지에서 사용자 정보 가져오기
  const savedUserJSON = sessionStorage.getItem("currentUser");
  if (!savedUserJSON) {
    subtitle.textContent = "사용자 정보를 찾을 수 없습니다. 로그인해주세요.";
    // --- ★★★★★ 여기부터 수정된 부분입니다 (오류 시 내용 영역 숨김) ★★★★★ ---
    if (topicsContainer) topicsContainer.classList.add("hidden");
    // --- ★★★★★ 수정 완료 ★★★★★ ---
    return;
  }

  const currentUser = JSON.parse(savedUserJSON);
  if (!currentUser || !currentUser.email) {
    subtitle.textContent = "사용자 이메일 정보가 없습니다.";
    // --- ★★★★★ 여기부터 수정된 부분입니다 (오류 시 내용 영역 숨김) ★★★★★ ---
    if (topicsContainer) topicsContainer.classList.add("hidden");
    // --- ★★★★★ 수정 완료 ★★★★★ ---
    return;
  }

  // 2. API로 데이터 가져오기
  try {
    const response = await fetch(
      `/api/analytics/my-growth?email=${currentUser.email}`
    );
    const result = await response.json();

    if (!response.ok) throw new Error(result.message);

    const growthData = result.data;
    if (!growthData || growthData.length === 0) {
      subtitle.textContent = "아직 작성된 업무일지가 없습니다.";
      // --- ★★★★★ 여기부터 수정된 부분입니다 (데이터 없을 시 내용 영역 숨김) ★★★★★ ---
      if (topicsContainer) topicsContainer.classList.add("hidden");
      // --- ★★★★★ 수정 완료 ★★★★★ ---
      return;
    }

    // 3. 차트 데이터 가공
    const labels = growthData.map((d) => `${d.week}주차`);
    const comprehensionScores = [];
    const applicationScores = [];
    // --- ★★★★★ 여기부터 수정된 부분입니다 (주차별 학습 내용 저장) ★★★★★ ---
    const weeklyTopicsHtml = growthData
      .map((weekData) => {
        const week = weekData.week;
        const weekTitle = weekData.weekTitle || `${week}주차 제목 없음`;
        const cycleTitles = weekData.cycleTitles || [];
        // 사이클 제목 목록을 간단한 문자열로 만듭니다. (예: "주제1, 주제2, ...")
        const cycleTitlesString =
          cycleTitles.length > 0 ? cycleTitles.join(", ") : "학습 내용 없음";

        return `
            <div class="pb-2 border-b border-gray-700 last:border-b-0">
                <p><strong class="text-yellow-300">${week}주차:</strong> ${weekTitle}</p>
                <p class="text-xs text-gray-400 ml-2">- ${cycleTitlesString}</p>
            </div>
        `;
      })
      .join("");
    // --- ★★★★★ 수정 완료 ★★★★★ ---

    growthData.forEach((weekData) => {
      const ratings = weekData.ratings || [];
      let totalComp = 0,
        totalApp = 0,
        count = 0;
      ratings.forEach((r) => {
        if (
          typeof r.comprehension === "number" &&
          typeof r.application === "number"
        ) {
          totalComp += r.comprehension;
          totalApp += r.application;
          count++;
        }
      });
      comprehensionScores.push(count > 0 ? totalComp / count : 0);
      applicationScores.push(count > 0 ? totalApp / count : 0);
    });

    // 4. 차트 그리기
    const ctx = chartCanvas.getContext("2d");
    if (growthChart) {
      growthChart.destroy(); // 기존 차트 파괴
    }
    growthChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "개념 이해도 (평균)",
            data: comprehensionScores,
            backgroundColor: "rgba(59, 130, 246, 0.7)",
            borderColor: "rgba(96, 165, 250, 1)",
            borderWidth: 1,
          },
          {
            label: "코드 활용도 (평균)",
            data: applicationScores,
            type: "line",
            borderColor: "rgba(234, 179, 8, 1)",
            backgroundColor: "rgba(234, 179, 8, 0.5)",
            tension: 0.1,
            fill: false,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: 5,
            ticks: { color: "#9ca3af", stepSize: 1 },
          },
          x: { ticks: { color: "#9ca3af" } },
        },
        plugins: {
          legend: { labels: { color: "#9ca3af" } },
          tooltip: { mode: "index", intersect: false },
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    // --- ★★★★★ 여기부터 수정된 부분입니다 (학습 내용 표시) ★★★★★ ---
    // 5. 주차별 학습 내용 표시
    if (topicsDiv && topicsContainer) {
      topicsDiv.innerHTML = weeklyTopicsHtml;
      topicsContainer.classList.remove("hidden"); // 컨테이너 보이기
    }
    // --- ★★★★★ 수정 완료 ★★★★★ ---
  } catch (error) {
    subtitle.textContent = `오류: 성장 기록을 불러오지 못했습니다. (${error.message})`;
    // --- ★★★★★ 여기부터 수정된 부분입니다 (오류 시 내용 영역 숨김) ★★★★★ ---
    if (topicsContainer) topicsContainer.classList.add("hidden");
    // --- ★★★★★ 수정 완료 ★★★★★ ---
  }
});
