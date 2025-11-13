// ========================
//  YouTube API 설정
// ========================
const API_KEY = "AIzaSyDDWh0l7ysHwn86_pXvR_dMYd69ARdhBjw";
const YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YT_VIDEO_URL = "https://www.googleapis.com/youtube/v3/videos";

// ========================
//  검색 실행
// ========================
async function runSearch() {
  const keyword = document.getElementById("keyword").value;
  document.getElementById("output").innerHTML = "검색 중…";

  // 1) 유튜브 검색 결과 불러오기
  const youtubeData = await fetchYouTube(keyword);

  // 2) 결과 먼저 화면에 즉시 표시
  document.getElementById("output").innerHTML =
    "<h2>검색 결과</h2>" + renderResultsImmediate(youtubeData);

  // 3) 각 영상에 대해 AI 분석 비동기 실행
  runAIUpdates(youtubeData);
}

// ========================
//  YouTube 검색 API 호출
// ========================
async function fetchYouTube(keyword) {
  const url =
    `${YT_SEARCH_URL}?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(keyword)}&key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  const videoIds = data.items.map(item => item.id.videoId).join(",");

  const detailUrl =
    `${YT_VIDEO_URL}?part=statistics,contentDetails,snippet&id=${videoIds}&key=${API_KEY}`;

  const detailRes = await fetch(detailUrl);
  const detailData = await detailRes.json();

  return detailData.items.map(item => ({
    id: item.id,
    title: item.snippet.title,
    desc: item.snippet.description,
    channel: item.snippet.channelTitle,
    thumb: item.snippet.thumbnails.medium.url,
    published: item.snippet.publishedAt,
    views: item.statistics.viewCount,
    likes: item.statistics.likeCount,
    comments: item.statistics.commentCount,
    link: `https://www.youtube.com/watch?v=${item.id}`
  }));
}

// ========================
//  결과 즉시 렌더링 (AI 없음)
// ========================
function renderResultsImmediate(items) {
  let html = `<div class="result">`;

  items.forEach((item, idx) => {
    html += `
      <div>
        <b>${item.title}</b><br>
        채널: ${item.channel}<br>
        조회수: ${item.views} / 좋아요: ${item.likes} / 댓글: ${item.comments}<br>
        업로드: ${item.published}<br>
        <a href="${item.link}" target="_blank">${item.link}</a><br>
        <img src="${item.thumb}">
        <hr>
        <div id="analysis-${idx}">AI 분석 중…</div>
      </div>
    `;
  });

  return html + "</div>";
}

// ========================
//  각 아이템에 대해 AI 분석 실행
// ========================
async function runAIUpdates(items) {
  for (let i = 0; i < items.length; i++) {
    const target = document.getElementById(`analysis-${i}`);
    const text = `${items[i].title}\n${items[i].desc}`;

    try {
      const analysis = await analyzeText(text);
      target.innerHTML = `<pre>${analysis}</pre>`;
    } catch (e) {
      target.innerHTML = "AI 분석 실패";
    }
  }
}

// ========================
//  로컬 AI 분석 (Ollama Llama3)
// ========================
async function analyzeText(text) {
  const prompt = `
  아래 텍스트를 분석해줘.

  1) 핵심 요약  
  2) 주요 키 메시지 3개  
  3) 감성(긍정/부정/중립)  
  4) 논조 분석  
  5) 콘텐츠 성격(정보성/오락성/홍보성 등)  
  6) 인사이트 3개  
  7) 리스크 포인트 2개  
  8) '밀리의서재'와의 연관성 자동 판단

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
