// -------------------------
// 검색 실행
// -------------------------
async function runSearch() {
  const keyword = document.getElementById("keyword").value;
  document.getElementById("output").innerHTML = "검색 중…";

  const youtubeData = await fetchYouTube(keyword);
  const naverData = await fetchNaver(keyword);

  // 1) 먼저 결과를 AI 없이 화면에 즉시 출력
  document.getElementById("output").innerHTML =
    "<h2>결과</h2>" +
    renderResultsImmediate("YouTube", youtubeData, "yt") +
    renderResultsImmediate("Naver 블로그/카페", naverData, "nv");

  // 2) 이후 AI 분석은 비동기로 실행하여 각 아이템의 div를 업데이트
  runAIUpdates(youtubeData, "yt");
  runAIUpdates(naverData, "nv");
}

// -------------------------
// YouTube 검색 결과 가져오기
// -------------------------
async function fetchYouTube(keyword) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`;
  const html = await fetch(url).then(r => r.text());

  const videoRegex = /"videoRenderer":\{([\s\S]*?)\}/g;
  const results = [...html.matchAll(videoRegex)].slice(0, 5);

  return results.map(x => {
    const block = x[1];
    return {
      title: extract(block, /"text":"([^"]+)/),
      link: "https://www.youtube.com/watch?v=" + extract(block, /"videoId":"([^"]+)/),
      views: extract(block, /"viewCountText":\{"simpleText":"([^"]+)/),
      published: extract(block, /"publishedTimeText":\{"simpleText":"([^"]+)/)
    };
  });
}

// -------------------------
// 네이버 검색 결과 가져오기
// -------------------------
async function fetchNaver(keyword) {
  const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`;
  const html = await fetch(url).then(r => r.text());

  const postRegex = /<a href="(https?:\/\/blog\.naver\.com[^"]+)"[\s\S]*?title="([^"]+)"/g;
  const results = [...html.matchAll(postRegex)].slice(0, 5);

  return results.map(x => ({
    link: x[1],
    title: x[2]
  }));
}

// -------------------------
// 텍스트 추출 보조 함수
// -------------------------
function extract(text, regex) {
  const m = text.match(regex);
  return m ? m[1] : "-";
}

// -------------------------
// 결과 즉시 렌더링 버전 (빠르게 먼저 보여줌)
// -------------------------
function renderResultsImmediate(platform, items, prefix) {
  let html = `<h3>${platform}</h3><div class="result">`;

  items.forEach((item, idx) => {
    html += `
      <div>
        <b>${item.title}</b><br>
        <a href="${item.link}" target="_blank">${item.link}</a><br>
        조회수: ${item.views || '-'} / 업로드: ${item.published || '-'}
        <hr>
        <div id="${prefix}-analysis-${idx}">AI 분석 중…</div>
      </div>
    `;
  });

  return html + "</div>";
}

// -------------------------
// AI 분석 비동기 업데이트 실행
// -------------------------
async function runAIUpdates(items, prefix) {
  for (let i = 0; i < items.length; i++) {
    const target = document.getElementById(`${prefix}-analysis-${i}`);
    const text = items[i].title;

    try {
      const analysis = await analyzeText(text);
      target.innerHTML = `<pre>${analysis}</pre>`;
    } catch (e) {
      target.innerHTML = "AI 분석 실패";
    }
  }
}

// -------------------------
// AI 분석 함수 (Ollama llama3)
// -------------------------
async function analyzeText(text) {
  const prompt = `
  아래 텍스트를 분석해줘.

  1) 핵심 요약  
  2) 밀리의서재 언급 맥락  
  3) 도서/브랜드 이미지 분석  
  4) 감성(긍정/부정/중립)  
  5) 주요 키 메시지 3개  
  6) 마케팅 관점 인사이트 3개  
  7) 리스크 포인트 2개

  ---
  분석할 텍스트:
  ${text}
  `;

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3",
      prompt: prompt
    })
  });

  const result = await response.json();
  return result.response;
}
