async function runSearch() {
  const keyword = document.getElementById("keyword").value;
  document.getElementById("output").innerHTML = "검색 중…";

  const youtubeData = await fetchYouTube(keyword);
  const naverData = await fetchNaver(keyword);

  document.getElementById("output").innerHTML =
    "<h2>결과</h2>" +
    renderResults("YouTube", youtubeData) +
    renderResults("Naver 블로그/카페", naverData);
}

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

function extract(text, regex) {
  const m = text.match(regex);
  return m ? m[1] : "-";
}

function renderResults(platform, items) {
  let html = `<h3>${platform}</h3><div class="result">`;

  items.forEach(item => {
    html += `
      <div>
        <b>${item.title}</b><br>
        <a href="${item.link}" target="_blank">${item.link}</a><br>
        조회수: ${item.views || '-'} / 업로드: ${item.published || '-'}
        <hr>
      </div>
    `;
  });
  return html + "</div>";
}
