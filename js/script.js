history.scrollRestoration = "manual";
 
function showSection(sectionId, updateHash = true){

  document.querySelectorAll('.section').forEach(section=>{
    section.classList.remove('active');
  });

  document.getElementById(sectionId)
    .classList.add('active');

  document.querySelectorAll(
    '.sidebar button, .quick-menu button'
  ).forEach(btn=>{
    btn.classList.remove('active-tab');
  });

  const activeBtns = document.querySelectorAll(
    `[data-section="${sectionId}"]`
  );

  activeBtns.forEach(btn=>{
    btn.classList.add('active-tab');
  });

  // URL変更
  if(updateHash){

    // homeだけはハッシュなし
    if(sectionId === "home"){

      history.replaceState(
        null,
        "",
        location.pathname
      );

    }else{

      history.pushState(
        null,
        "",
        `#${sectionId}`
      );

    }

  }

  if(sectionId==="mylist"){
    loadMyList();
  }

  if(sectionId==="news"){
    loadNewsPage();
  }

  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
  });

}

function openMenuModal(){
  document.getElementById("menuModal")
    .classList.add("active");
}

function closeMenuModal(){
  document.getElementById("menuModal")
    .classList.remove("active");
}

/* 背景クリックで閉じる */
document.getElementById("menuModal")
  .addEventListener("click", function(e){

    if(e.target === this){
      closeMenuModal();
    }

});
  
const eventsURL="https://docs.google.com/spreadsheets/d/e/2PACX-1vQeScX6j_3nRvOlYuVa0P4wGG6piBpQ2ZwXzZxEPscII79uBByy9Z8_MDND2wouDZboQQon7XVVN4Gp/pub?gid=0&single=true&output=csv";
const goodsURL="https://docs.google.com/spreadsheets/d/e/2PACX-1vQeScX6j_3nRvOlYuVa0P4wGG6piBpQ2ZwXzZxEPscII79uBByy9Z8_MDND2wouDZboQQon7XVVN4Gp/pub?gid=1794976478&single=true&output=csv";
const videosURL="https://docs.google.com/spreadsheets/d/e/2PACX-1vQeScX6j_3nRvOlYuVa0P4wGG6piBpQ2ZwXzZxEPscII79uBByy9Z8_MDND2wouDZboQQon7XVVN4Gp/pub?gid=594878538&single=true&output=csv";
const wordsURL="https://docs.google.com/spreadsheets/d/e/2PACX-1vQeScX6j_3nRvOlYuVa0P4wGG6piBpQ2ZwXzZxEPscII79uBByy9Z8_MDND2wouDZboQQon7XVVN4Gp/pub?gid=1791332374&single=true&output=csv";
const charactersURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQeScX6j_3nRvOlYuVa0P4wGG6piBpQ2ZwXzZxEPscII79uBByy9Z8_MDND2wouDZboQQon7XVVN4Gp/pub?gid=219033798&single=true&output=csv";
const seriesURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQeScX6j_3nRvOlYuVa0P4wGG6piBpQ2ZwXzZxEPscII79uBByy9Z8_MDND2wouDZboQQon7XVVN4Gp/pub?gid=1118324026&single=true&output=csv";
const plannedURL="https://docs.google.com/spreadsheets/d/e/2PACX-1vQeScX6j_3nRvOlYuVa0P4wGG6piBpQ2ZwXzZxEPscII79uBByy9Z8_MDND2wouDZboQQon7XVVN4Gp/pub?gid=1152267879&single=true&output=csv";
const newsURL="https://docs.google.com/spreadsheets/d/e/2PACX-1vQeScX6j_3nRvOlYuVa0P4wGG6piBpQ2ZwXzZxEPscII79uBByy9Z8_MDND2wouDZboQQon7XVVN4Gp/pub?gid=99757782&single=true&output=csv";

const GAS_URL = "https://script.google.com/macros/s/AKfycbwtbohoKr3svQsqGLq1Ces4OjERJbFJlOlg0NEFBcybJD8yWSfLz33yftJE7U-EEoYTgg/exec";
  
function parseCSV(text){

  const rows = text.trim().split("\n");
  const headers = rows.shift().split(",");

  return rows.map(row=>{

    const values = row.split(","); // ← シンプルにする

    let obj = {};

    headers.forEach((header,i)=>{
      obj[header.trim()] = values[i] ? values[i].replace(/^"|"$/g,"") : "";
    });

    return obj;

  });
}

function formatDate(dateStr){
const d=new Date(dateStr);
return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
}

function formatEventPeriod(start, end){

  if(!end || end.trim() === ""){
    // 終了日なし
    return `${formatDate(start)}〜`;
  }

  if(start === end){
    // 同日
    return formatDate(start);
  }

  // 通常
  return `${formatDate(start)}〜${formatDate(end)}`;
}
  
function getGoodsStatus(start, end){

  if(!start || !end) return "販売終了";

  const now = new Date();
  const startTime = new Date(start);
  const endTime = new Date(end);

  if(now < startTime){
    return "販売前";
  }

  if(now >= startTime && now <= endTime){
    return "販売中";
  }

  return "販売終了";
}

function formatGoodsDateTime(startStr, endStr){

  if(!startStr) return "";

  function formatOne(dateStr){

    const date = new Date(dateStr);
    if(isNaN(date)) return dateStr; // 不正データ対策

    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const day = ["日","月","火","水","木","金","土"][date.getDay()];

    const hh = String(date.getHours()).padStart(2,"0");
    const mm = String(date.getMinutes()).padStart(2,"0");

    return `${y}年${m}月${d}日(${day})${hh}:${mm}`;
  }

  const startText = formatOne(startStr);

  if(!endStr || endStr.trim()===""){
    return `${startText}～`;
  }

  const endText = formatOne(endStr);

  return `${startText}～${endText}`;
}
  
function loadTodayContent(){

  const categories = ["video","word","character","series"];
  const category = categories[Math.floor(Math.random()*categories.length)];

  if(category === "video"){

    fetch(videosURL).then(r=>r.text()).then(text=>{

      const data = parseCSV(text);
      if(!data.length) return;

      const random = data[Math.floor(Math.random()*data.length)];
      const thumb = getYouTubeThumbnail(random.url);

      todayBox.innerHTML = `

        <div class="random-section-title">
          <span class="material-symbols-outlined">
            bar_chart_4_bars
          </span>
          ランダムドズル社データ【動画】
        </div>

        <div class="random-card ${thumb ? "" : "no-image"}">

          ${thumb ? `
            <div class="random-thumb-box">
              <img src="${thumb}" class="random-thumb">
            </div>
          ` : ""}

          <div class="random-content">
            <p class="random-title">${random.title}</p>

            ${random.url && random.url.trim() !== "" ?
              `<a href="${random.url}" target="_blank" class="random-link">
                <span class="material-symbols-outlined link-icon">
                  open_in_new
                </span>
                動画を見る
              </a>`
            : ""}
          </div>

          ${createLikeButton(random.id)}

          <button class="random-reload-btn" onclick="loadTodayContent()">
            <span class="material-symbols-outlined">refresh</span>
            もう一回ランダム
          </button>

        </div>
      `;

      loadAllLikes();

    });

  }else if(category === "word"){

    fetch(wordsURL).then(r=>r.text()).then(text=>{

      const data = parseCSV(text);
      if(!data.length) return;

      const random = data[Math.floor(Math.random()*data.length)];

      const thumb = random.url ? getYouTubeThumbnail(random.url) : null;

      todayBox.innerHTML = `

        <div class="random-section-title">
          <span class="material-symbols-outlined">
            bar_chart_4_bars
          </span>
          ランダムドズル社データ【用語】
        </div>

        <div class="random-card ${thumb ? "" : "no-image"}">

          ${thumb ? `
            <div class="random-thumb-box">
              <img src="${thumb}" class="random-thumb">
            </div>
          ` : ""}

          <div class="random-content">

            <p class="random-title">${random.word}</p>

            ${random.description ? `
              <p class="random-description">
                ${random.description}
              </p>
            ` : ""}

            ${random.url && random.url.trim() !== "" ? `
              <a href="${random.url}" target="_blank" class="random-link">
                <span class="material-symbols-outlined link-icon">
                  open_in_new
                </span>
                関連動画を見る
              </a>
            ` : ""}

          </div>

          ${createLikeButton(random.id)}

          <button class="random-reload-btn" onclick="loadTodayContent()">
            <span class="material-symbols-outlined">refresh</span>
            もう一回ランダム
          </button>

        </div>
      `;

      loadAllLikes();

    });

  }else if(category === "character"){

    fetch(charactersURL).then(r=>r.text()).then(text=>{

      const data = parseCSV(text);
      if(!data.length) return;

      const random = data[Math.floor(Math.random()*data.length)];

      const thumb = random.url ? getYouTubeThumbnail(random.url) : null;

      todayBox.innerHTML = `

        <div class="random-section-title">
          <span class="material-symbols-outlined">
            bar_chart_4_bars
          </span>
          ランダムドズル社データ【キャラ】
        </div>

        <div class="random-card ${thumb ? "" : "no-image"}">

          ${thumb ? `
            <div class="random-thumb-box">
              <img src="${thumb}" class="random-thumb">
            </div>
          ` : ""}

          <div class="random-content">

            <p class="random-title">${random.name}</p>

            <p class="random-meta">
            演者：${random.actor}
            </p>

            ${random.description ? `
              <p class="random-description">
                ${random.description}
              </p>
            ` : ""}

            ${random.url && random.url.trim() !== "" ? `
              <a href="${random.url}" target="_blank" class="random-link">
                <span class="material-symbols-outlined link-icon">
                  open_in_new
                </span>
                出演動画を見る
              </a>
            ` : ""}

          </div>

          ${createLikeButton(random.id)}

          <button class="random-reload-btn" onclick="loadTodayContent()">
            <span class="material-symbols-outlined">refresh</span>
            もう一回ランダム
          </button>

        </div>
      `;

      loadAllLikes();

    });

  }else if(category === "series"){

    fetch(seriesURL).then(r=>r.text()).then(text=>{

      const data = parseCSV(text);
      if(!data.length) return;

      const random = data[Math.floor(Math.random()*data.length)];

      todayBox.innerHTML = `

        <div class="random-section-title">
          <span class="material-symbols-outlined">
            bar_chart_4_bars
          </span>
          ランダムドズル社データ【シリーズ】
        </div>

        <div class="random-card no-image">

          <div class="random-content">

            <p class="random-title">${random.name}</p>

            ${random.description ? `
              <p class="random-description">
                ${random.description}
              </p>
            ` : ""}

            ${random.playlist && random.playlist.trim() !== "" ? `
              <a href="${random.playlist}" target="_blank" class="random-link">
                <span class="material-symbols-outlined link-icon">
                  open_in_new
                </span>
                再生リストを見る
              </a>
            ` : ""}

          </div>

          ${createLikeButton(random.id)}

          <button class="random-reload-btn" onclick="loadTodayContent()">
            <span class="material-symbols-outlined">refresh</span>
            もう一回ランダム
          </button>

        </div>
      `;

      loadAllLikes();

    });
  }
}
  
const todayBox=document.getElementById("todayBox");
  
fetch(plannedURL).then(r=>r.text()).then(text=>{
const data=parseCSV(text);

const box1 = document.getElementById("plannedFeatures");
const box2 = document.getElementById("plannedFeaturesPage");

if(!data.length){
if(box1) box1.innerHTML="<p>現在検討中の機能はありません。</p>";
if(box2) box2.innerHTML="<p>現在検討中の機能はありません。</p>";
return;
}

data.forEach(item=>{

const html = `
<div class="planned-card" data-status="${item.status}">
  <div class="planned-header">
    <span class="planned-title">${item.title}</span>
    <span class="planned-badge">${item.status}</span>
  </div>
  ${item.note ? `<div class="planned-note">${item.note}</div>` : ""}
</div>
`;

if(box1) box1.innerHTML += html;
if(box2) box2.innerHTML += html;

});
});
  
function getYouTubeThumbnail(url){

if(!url) return "";

// 通常のwatch?v=形式
let videoId = null;

if(url.includes("watch?v=")){
videoId = url.split("watch?v=")[1].split("&")[0];
}

// youtu.be形式
if(url.includes("youtu.be/")){
videoId = url.split("youtu.be/")[1].split("?")[0];
}

if(!videoId) return "";

return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
  
function filterPlanned(status){

const buttons = document.querySelectorAll(".filter-btn");
buttons.forEach(btn=>btn.classList.remove("active"));

event.target.classList.add("active");

const cards = document.querySelectorAll(".planned-card");

cards.forEach(card=>{
if(status==="all"){
card.style.display="block";
}else{
if(card.dataset.status===status){
card.style.display="block";
}else{
card.style.display="none";
}
}
});

}

// ===== お気に入り =====
function getFavorites(){
  return JSON.parse(localStorage.getItem("favorites") || "[]");
}

function isFav(title){
  return getFavorites().includes(title);
}

function toggleFavorite(title){
  let favs = getFavorites();

  if(favs.includes(title)){
    favs = favs.filter(t=>t!==title);
  }else{
    favs.push(title);
  }

  localStorage.setItem("favorites", JSON.stringify(favs));
  location.reload();
}


// ===== 参加ステータス =====
function getStatus(title){
  const data = JSON.parse(localStorage.getItem("eventStatus") || "{}");
  return data[title] || "";
}

function saveStatus(title,value){
  const data = JSON.parse(localStorage.getItem("eventStatus") || "{}");
  data[title] = value;
  localStorage.setItem("eventStatus", JSON.stringify(data));
}

function loadMyList(filter="all"){

  if(currentMyListType === "event"){
    loadEventMyList(filter);
  }else{
    loadGoodsMyList(filter);
  }
}
                       
function loadEventMyList(filter="all"){

  fetch(eventsURL).then(r=>r.text()).then(text=>{
    const data=parseCSV(text);

    const favs = JSON.parse(localStorage.getItem("favorites") || "[]");
    const statusData = JSON.parse(localStorage.getItem("eventStatus") || "{}");

    let html="";
    let countParticipated=0;

    data.forEach(event=>{

      const isFavorite = favs.includes(event.title);
      const status = statusData[event.title] || "";

      if(status==="済") countParticipated++;

      let show=false;

      if(filter==="all"){
        if(isFavorite || status==="予定" || status==="済"){
          show=true;
        }
      }
      else if(filter==="fav"){
        show=isFavorite;
      }
      else if(filter==="予定"){
        show=status==="予定";
      }
      else if(filter==="済"){
        show=status==="済";
      }

      if(!show) return;

      html+=`
        <div class="mylist-card-new">

          <div class="mylist-flex">

            <img src="${event.image}" class="mylist-thumb">

            <div class="mylist-meta">

              <h3 class="mylist-title">${event.title}</h3>

              <p class="meta-row">
                <span class="material-symbols-outlined meta-icon">calendar_month</span>
                ${formatEventPeriod(event.start_date,event.end_date)}
              </p>

              <p class="meta-row">
                <span class="material-symbols-outlined meta-icon">location_on</span>
                ${event.location}
              </p>

              <p class="meta-row">
                <span class="material-symbols-outlined meta-icon">description</span>
                ${event.note || ""}
              </p>

              <p class="latest-note">
                公式リンク・マイリスト追加はイベントページをご覧ください
              </p>

              ${(isFavorite || status) ? `
                <div class="my-status-box">

                  ${isFavorite ? `
                    <span class="my-badge fav-badge">
                      ♡ お気に入り
                    </span>
                  ` : ""}

                  ${status ? `
                    <span class="my-badge status-badge">
                      ${status==="予定"?"参加予定":"参加済"}
                    </span>
                  ` : ""}

                </div>
              ` : ""}

            </div>

          </div>

        </div>
      `;
    });

    document.getElementById("mylist-container").innerHTML=
      html || "<p>該当イベントなし</p>";

    document.getElementById("mylist-count").innerText=
      `これまでに参加したイベント：${countParticipated}件`;

  });
}

function loadGoodsMyList(filter="all"){

  fetch(goodsURL).then(r=>r.text()).then(text=>{

    const data = parseCSV(text);

    const favs = getGoodsFavorites();
    const statusData = JSON.parse(localStorage.getItem("goodsStatus") || "{}");

    let html = "";
    let countPurchased = 0;

    data.forEach(item=>{

      const title = item.series; // ← 統一！

      const isFavorite = favs.includes(title);
      const status = statusData[title] || "";

      // 🔥 販売状態自動判定
      const saleStatus = getGoodsSaleStatus(
        item.start_datetime,
        item.end_datetime
      );

      const statusClass =
        saleStatus === "販売中" ? "sale-now" :
        saleStatus === "販売前" ? "sale-before" :
        "sale-end";

      if(status==="済") countPurchased++;

      // フィルター
      if(
        filter==="fav" && !isFavorite ||
        filter==="予定" && status!=="予定" ||
        filter==="済" && status!=="済"
      ){
        return;
      }

      // 「すべて」はお気に入り or ステータスあるもののみ
      if(filter==="all" && !isFavorite && !status){
        return;
      }

      html+=`
      <div class="mylist-card">

        <div class="mylist-img-box">
          <img src="${item.image}" class="mylist-img">
        </div>

        <div class="mylist-info">

          <h3 class="mylist-title">${title}</h3>

          <p class="meta-row">
            <span class="material-symbols-outlined meta-icon">schedule</span>
            ${formatGoodsDateTime(item.start_datetime, item.end_datetime)}
          </p>

          <p class="meta-row">
            <span class="material-symbols-outlined meta-icon">store</span>
            ${item.site_name || ""}
          </p>

          <p class="meta-row">
            <span class="material-symbols-outlined meta-icon">description</span>
            ${item.description || ""}
          </p>

          <p class="meta-row ${statusClass}">
            <span class="material-symbols-outlined meta-icon">sell</span>
            販売状態：${saleStatus}
          </p>

          <p class="latest-note">
            公式リンク・マイリスト追加はイベントページをご覧ください
          </p>

          ${(isFavorite || status) ? `
            <div class="my-status-box">

              ${isFavorite ? `
                <span class="my-badge fav-badge">
                  ♡ お気に入り
                </span>
              ` : ""}

              ${status ? `
                <span class="my-badge status-badge">
                  ${status==="予定"?"購入予定":"購入済"}
                </span>
              ` : ""}

            </div>
          ` : ""}

        </div>

      </div>
      `;
    });

    document.getElementById("mylist-container").innerHTML =
      html || "<p>該当グッズなし</p>";

    document.getElementById("mylist-count").innerText =
      `これまでに購入したグッズシリーズ：${countPurchased}件`;

  });
}
  
function filterMyList(type, el){

  document.querySelectorAll(".filter-btn")
    .forEach(btn=>btn.classList.remove("active"));

  el.classList.add("active");

  loadMyList(type);
}
  
/* ===== グッズ お気に入り ===== */
function getGoodsFavorites(){
  return JSON.parse(localStorage.getItem("goodsFavorites") || "[]");
}

function isGoodsFav(title){
  return getGoodsFavorites().includes(title);
}

function toggleGoodsFavorite(title){
  let favs = getGoodsFavorites();

  if(favs.includes(title)){
    favs = favs.filter(t=>t!==title);
  }else{
    favs.push(title);
  }

  localStorage.setItem("goodsFavorites", JSON.stringify(favs));
  location.reload();
}


/* ===== グッズ 購入ステータス ===== */
function getGoodsStatus(title){
  const data = JSON.parse(localStorage.getItem("goodsStatus") || "{}");
  return data[title] || "";
}

function saveGoodsStatus(title,value){
  const data = JSON.parse(localStorage.getItem("goodsStatus") || "{}");
  data[title] = value;
  localStorage.setItem("goodsStatus", JSON.stringify(data));
}

let currentMyListType = "event";

function switchMyListType(type){

  currentMyListType = type;

  document.querySelectorAll(".mylist-type-tabs button")
    .forEach(btn=>btn.classList.remove("active-type"));

  document.getElementById("tab-"+type)
    .classList.add("active-type");

  /* 🔥 フィルター名を変更 */
  const planLabel = document.getElementById("filter-plan-label");
  const doneLabel = document.getElementById("filter-done-label");

  if(type==="event"){
    planLabel.textContent = "参加予定";
    doneLabel.textContent = "参加済";
  }else{
    planLabel.textContent = "購入予定";
    doneLabel.textContent = "購入済";
  }

  loadMyList("all");
}

function getGoodsSaleStatus(start, end){

  const now = new Date();

  const startDate = new Date(start);
  const endDate = new Date(end);

  if(now < startDate) return "販売前";
  if(now > endDate) return "販売終了";
  return "販売中";
}

let calendarData = {};

function formatJP(dateStr){

  if(!dateStr || dateStr.trim()==="") return "";

  const clean = dateStr.trim().split("T")[0];

  const parts = clean.split("-");

  if(parts.length !== 3) return "";

  const y = parts[0];
  const m = Number(parts[1]);
  const d = Number(parts[2]);

  if(!y || !m || !d) return "";

  return `${y}/${m}/${d}`;
}

function openCalendarModal(title,start,end,location,details){

  calendarData = { title, start, end, location, details };

  document.getElementById("calendarTitle").innerText = title;

  const startText = start ? `(${formatJP(start)})` : "";
  const endText   = end ? `(${formatJP(end)})` : "";
  const periodText = (start && end)
    ? `(${formatJP(start)}〜${formatJP(end)})`
    : startText;

  document.getElementById("startDateText").innerText = startText;
  document.getElementById("endDateText").innerText = endText;
  document.getElementById("periodText").innerText = periodText;

  document.getElementById("calendarModal").classList.add("active");
}

function closeCalendarModal(){
  document.getElementById("calendarModal").classList.remove("active");
}

function formatAllDay(dateStr, addDay=false){
  if(!dateStr || dateStr.trim()==="") return "";

  // YYYY-MM-DD のみ取得
  const clean = dateStr.trim().split("T")[0];

  let [y,m,d] = clean.split("-").map(Number);

  if(addDay){
    const date = new Date(y, m-1, d);
    date.setDate(date.getDate() + 1);
    y = date.getFullYear();
    m = date.getMonth() + 1;
    d = date.getDate();
  }

  const mm = String(m).padStart(2,"0");
  const dd = String(d).padStart(2,"0");

  return `${y}${mm}${dd}`;
}

function addToGoogleCalendar(){

  const type = document.querySelector('input[name="calType"]:checked').value;

  const start = calendarData.start;
  const end   = calendarData.end;

  let dates = "";

  if(type === "start"){
    const s = formatAllDay(start);
    const next = formatAllDay(start,true);
    dates = `${s}/${next}`;
  }
  else if(type === "end" && end){
    const e = formatAllDay(end);
    const next = formatAllDay(end,true);
    dates = `${e}/${next}`;
  }
  else if(type === "period" && end){
    const s = formatAllDay(start);
    const e = formatAllDay(end,true);
    dates = `${s}/${e}`;
  }
  else{
    const s = formatAllDay(start);
    const next = formatAllDay(start,true);
    dates = `${s}/${next}`;
  }

  const url =
    "https://www.google.com/calendar/render?action=TEMPLATE" +
    "&text=" + encodeURIComponent(calendarData.title) +
    "&dates=" + dates +
    "&details=" + encodeURIComponent(calendarData.details || "") +
    "&location=" + encodeURIComponent(calendarData.location || "");

  window.open(url,"_blank");

  closeCalendarModal();
}

async function loadAllLikes(){

  const res = await fetch(GAS_URL);
  const data = await res.json();

  Object.keys(data).forEach(id=>{

    if(!id) return;

    document.querySelectorAll(`#like-count-${id}`)
      .forEach(el => {
        el.innerText = data[id];
      });

  });

}
  
function sendLike(id){

  const el = document.getElementById("like-count-"+id);

  // ★① 先に増やす（これがポイント）
  if(el){
    el.innerText = parseInt(el.innerText) + 1;
  }

  const btn = document.querySelector(`[data-like="${id}"]`);

  if(btn){
    btn.classList.remove("liked");
    void btn.offsetWidth;
    btn.classList.add("liked");
  }

  // ★② 後から送信（awaitなし）
  fetch(GAS_URL,{
    method:"POST",
    body:new URLSearchParams({id:id})
  });

}

function createLikeButton(id){

  return `
    <button class="like-btn" data-like="${id}" onclick="sendLike('${id}')">

      <span class="material-symbols-outlined">
        thumb_up
      </span>

      <span id="like-count-${id}">-</span>

    </button>
  `;
}

function renderNews(newsData, showAll = false, prefix = ""){

  const now = new Date();

  let html = "";
  let count = 0; // ←追加
  
  newsData.forEach(item => {

    let isExpired = false;

    if(item.end_date){
      const end = new Date(item.end_date);
      if(end < now){
        isExpired = true;
      }
    }

    if(isExpired && !showAll) return;

    count++; // ←追加

    // ===== NEW判定 =====
    let isNew = false;
    if(item.start_date){
      const start = new Date(item.start_date);
      const diff = (now - start) / (1000 * 60 * 60 * 24);
      if(diff <= 3) isNew = true;
    }
    
    html += `
      <div class="news-card ${isExpired && showAll ? "expired" : ""}">

        <div class="news-header">
          <span class="material-symbols-outlined news-icon">feed</span>
          <span class="news-date">${item.start_date || ""}</span>
          ${isNew ? `<span class="news-badge">NEW</span>` : ""}
        </div>

        <div class="news-title">${item.title}</div>

        <div class="news-content">
          ${item.content || ""}
        </div>

        ${item.link ? `
          <a href="${item.link}" target="_blank" class="news-link">
            <span class="material-symbols-outlined link-icon">open_in_new</span>
            詳しく見る
          </a>
        ` : ""}

        ${showAll ? createLikeButton(item.id) : ""}

      </div>
    `;
  });

  // ★ここ追加（超重要）
  if(count === 0 && !showAll){
    return `<div class="no-event-message">表示するニュースがありません</div>`;
  }

  return html;
}

function loadNews(){

  fetch(newsURL).then(r=>r.text()).then(text=>{

    const data = parseCSV(text);
    if(!data.length) return;
    
    // 日付ソート
    data.sort((a,b)=>{
      return new Date(b.start_date) - new Date(a.start_date);
    });

    // ★ここを丸ごと置き換え
    document.getElementById("newsBox").innerHTML = `
      <div class="news-section-title">
        <span class="material-symbols-outlined">
          campaign
        </span>
        ドズル社の最新ニュース
      </div>

      <div class="news-scroll-box">
        ${renderNews(data, false, "home_")}
      </div>
    `;

  });
}
  
function loadNewsPage(){

  fetch(newsURL)
    .then(r => r.text())
    .then(text => {

      const data = parseCSV(text);

      // 日付降順
      data.sort((a,b)=> new Date(b.start_date) - new Date(a.start_date));

      // ★全表示（期間制限なし）
      document.getElementById("newsPageList").innerHTML =
        renderNews(data, true, "newsPage_");

      loadAllLikes();

    });
}

async function loadYouTubeStats(){

  const res = await fetch("https://script.google.com/macros/s/AKfycbz9CeRlFJEi66SLpncw2L5u93cMXKVnLf2q7cMf_d-jUyOqiRZbbMObuqSWN7d2kBbykA/exec");
  const data = await res.json();

  // ドズル社
  document.getElementById("subCount").innerText = formatNumber(data.subscriber);
  document.getElementById("videoCount").innerText = formatNumber(data.video);
  document.getElementById("viewCount").innerText = formatNumber(data.view);

  // メンバー合計
  document.getElementById("memberSub").innerText = formatNumber(data.member_subscriber);
  document.getElementById("memberVideo").innerText = formatNumber(data.member_video);
  document.getElementById("memberView").innerText = formatNumber(data.member_view);
}

function formatNumber(num){
  return Number(num).toLocaleString();
}

function switchAboutTab(tabId, updateHash = true){

  // 全タブ非表示
  document.querySelectorAll(".tab-content")
    .forEach(el=>{
      el.classList.remove("active");
    });

  // 全ボタン非active
  document.querySelectorAll(".tab-btn")
    .forEach(btn=>{
      btn.classList.remove("active");
    });

  // タブ表示
  document.getElementById(tabId)
    .classList.add("active");

  // ボタンactive
  const btn = document.querySelector(
    `[data-tab="${tabId}"]`
  );

  if(btn){
    btn.classList.add("active");
  }

  // Aboutページ表示
  showSection("about", false);

  // URL変更
  if(updateHash){

    const tabMap = {
      aboutTab: "about",
      memberTab: "member",
      portalTab: "portal",
      channelTab: "channel",
      historyTab: "history"
    };

    history.pushState(
      null,
      "",
      `#about-${tabMap[tabId]}`
    );
   
  }

}

const cardState = {
  bg: 1,
  creator: "",
  oshi: "",
  history: "",
  pair: "",
  reason: "",
  video: "",
  character: "",
  series: ""
};
  
function openCardTool(){
  const area = document.getElementById("cardToolArea");

  area.innerHTML = `

    <div class="card-tool-wrap">

      <!-- 左 -->
      <div class="card-left">

        <!-- 背景選択 -->
        <div class="form-group">
          <h3>背景を選択</h3>

          <select onchange="selectBg(this.value)" id="bgSelect">
            <option value="1">ドズルカラー</option>
            <option value="2">ぼんじゅうるカラー</option>
            <option value="3">おんりーカラー</option>
            <option value="4">おらふくんカラー</option>
            <option value="5">MENカラー</option>
            <option value="6">集合①（黒）</option>
            <option value="7">集合②（カラフル）</option>
          </select>

        </div>

        <!-- 入力フォーム -->
        <h3>情報を入力</h3>
        
        <div class="form-group">
          <label>作成者</label>
          <small>名前やIDなど</small>
          <input type="text" id="creator" oninput="updateState()">
        </div>

        <div class="form-group">
          <label>推し</label>
          <small>複数OK・自由入力</small>
          <input type="text" id="oshi" oninput="updateState()">
        </div>

        <div class="form-group">
          <label>推し歴</label>
          <input type="text" id="history" oninput="updateState()">
        </div>

        <div class="form-group">
          <label>好きなペア</label>
          <small>選択式</small>
          <select id="pair" onchange="updateState()">
            <option value="">選択してください</option>
            <option>箱推し🦍🍆🍌☃️🐷</option>
            <option>ドズ🦍ぼん🍆</option>
            <option>ドズ🦍おん🍌</option>
            <option>ドズ🦍おら☃️</option>
            <option>ドズ🦍MEN🐷</option>
            <option>ぼん🍆おん🍌</option>
            <option>ぼん🍆おら☃️</option>
            <option>ぼん🍆MEN🐷</option>
            <option>おん🍌おら☃️</option>
            <option>おん🍌MEN🐷</option>
            <option>おら☃️MEN🐷</option>
            <option>ドズ🦍ぼん🍆おん🍌</option>
            <option>ドズ🦍ぼん🍆おら☃️</option>
            <option>ドズ🦍ぼん🍆MEN🐷</option>
            <option>ドズ🦍おん🍌おら☃️</option>
            <option>ドズ🦍おん🍌MEN🐷</option>
            <option>ドズ🦍おら☃️MEN🐷</option>
            <option>ぼん🍆おん🍌おら☃️</option>
            <option>ぼん🍆おん🍌MEN🐷</option>
            <option>ぼん🍆おら☃️MEN🐷</option>
            <option>おん🍌おら☃️MEN🐷</option>
            <option>ぼん🍆おら☃️ネコ😼</option>
          </select>
        </div>

        <div class="form-group">
          <label>好きなところ・きっかけ</label>
          <small>長文OK・改行はスペースで</small>
          <textarea id="reason" oninput="updateState()"></textarea>
        </div>

        <div class="form-group">
          <label>好きな動画</label>
          <small>長文OK・コピペ推奨</small>
          <textarea id="video" oninput="updateState()"></textarea>
        </div>

        <div class="form-group">
          <label>好きなキャラ</label>
          <input type="text" id="character" oninput="updateState()">
        </div>

        <div class="form-group">
          <label>好きなシリーズ</label>
          <input type="text" id="series" oninput="updateState()">
        </div>

      </div>

      <!-- 右 -->
      <div class="card-right">

        <h3>プレビュー</h3>

        <canvas id="cardCanvas" width="2000" height="1126"></canvas>

        <div class="card-actions">

          <button onclick="downloadCard()" class="card-btn">
            画像を保存する
          </button>
          <p class="card-note">
            作成したカードの画像のダウンロードが始まります
          </p>

          <button onclick="shareToX()" class="card-btn x-btn">
            Xに投稿する
          </button>
          <p class="card-note">
            <strong>画像を保存してから</strong>開き、手動で添付してください
          </p>

        </div>

      </div>

    </div>

  `;

  // 🔥 ここから追加
  const saved = localStorage.getItem("cardData");

  if(saved){
    const data = JSON.parse(saved);

    Object.assign(cardState, data);
  }

  // 🔥 ここが超重要（外に出す）
  document.getElementById("bgSelect").value = cardState.bg;

  // 入力欄に反映
  document.getElementById("creator").value = cardState.creator || "";
  document.getElementById("oshi").value = cardState.oshi || "";
  document.getElementById("history").value = cardState.history || "";
  document.getElementById("pair").value = cardState.pair || "";
  document.getElementById("reason").value = cardState.reason || "";
  document.getElementById("video").value = cardState.video || "";
  document.getElementById("character").value = cardState.character || "";
  document.getElementById("series").value = cardState.series || "";

  drawCanvas();
}

async function drawCanvas(){

  const canvas = document.getElementById("cardCanvas");
  if(!canvas) return;

  const ctx = canvas.getContext("2d");

  // 🔥 フォント読み込み待機（超重要）
  await Promise.all([
    document.fonts.load("bold 65px 'M PLUS Rounded 1c'"),
    document.fonts.load("bold 60px 'M PLUS Rounded 1c'"),
    document.fonts.load("bold 50px 'M PLUS Rounded 1c'"),
    document.fonts.load("bold 45px 'M PLUS Rounded 1c'")
  ]);

  // 背景画像
  const img = new Image();
  img.src = `bg${cardState.bg}.jpg`;

  // 🔥 画像読み込みもawait
  await new Promise((resolve) => {
    img.onload = resolve;
  });

  // 背景描画
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img, 0, 0, 2000, 1126);

  // 🔥 うっすら白レイヤー
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // フォント設定
  ctx.fillStyle = "#000";

  // --- テキスト描画 ---
  ctx.textAlign = "left";
  ctx.font = "bold 65px 'M PLUS Rounded 1c'";
  drawText(ctx, cardState.creator, 1290, 100, 1200);

  ctx.textAlign = "center";
  ctx.font = "bold 65px 'M PLUS Rounded 1c'";
  drawText(ctx, cardState.oshi, 1217, 217, 1200);

  ctx.font = "bold 60px 'M PLUS Rounded 1c'";
  drawText(ctx, cardState.history, 598, 369, 1200);

  ctx.font = "bold 60px 'M PLUS Rounded 1c'";
  drawText(ctx, cardState.pair, 1587, 369, 1200);

  ctx.textAlign = "left";
  ctx.font = "bold 45px 'M PLUS Rounded 1c'";
  drawMultilineText(ctx, cardState.reason, 105, 569, 666, 70);

  ctx.font = "bold 45px 'M PLUS Rounded 1c'";
  drawMultilineText(ctx, cardState.video, 903, 560, 1000, 70);

  ctx.font = "bold 50px 'M PLUS Rounded 1c'";
  drawText(ctx, cardState.character, 903, 827, 1200);

  ctx.font = "bold 50px 'M PLUS Rounded 1c'";
  drawText(ctx, cardState.series, 903, 1044, 1200);
}
  
function updateState(){

  cardState.creator = document.getElementById("creator").value;
  cardState.oshi = document.getElementById("oshi").value;
  cardState.history = document.getElementById("history").value;
  cardState.pair = document.getElementById("pair").value;
  cardState.reason = document.getElementById("reason").value;
  cardState.video = document.getElementById("video").value;
  cardState.character = document.getElementById("character").value;
  cardState.series = document.getElementById("series").value;

  localStorage.setItem("cardData", JSON.stringify(cardState));

  drawCanvas();
}

function selectBg(num){
  cardState.bg = Number(num);

  // 🔥 追加（保存）
  localStorage.setItem("cardData", JSON.stringify(cardState));

  drawCanvas();
}

function drawText(ctx, text, x, y, maxWidth){
  ctx.fillText(text || "", x, y, maxWidth);
}

function drawMultilineText(ctx, text, x, y, maxWidth, lineHeight){

  if(!text) return;

  const chars = text.split("");
  let line = "";
  let currentY = y;

  for(let i=0; i<chars.length; i++){
    const testLine = line + chars[i];
    const metrics = ctx.measureText(testLine);

    if(metrics.width > maxWidth){
      ctx.fillText(line, x, currentY);
      line = chars[i];
      currentY += lineHeight;
    }else{
      line = testLine;
    }
  }

  ctx.fillText(line, x, currentY);
}

async function downloadCard(){

  // 🔥 描画完了を保証
  await drawCanvas();

  const canvas = document.getElementById("cardCanvas");

  canvas.toBlob(function(blob){

    // ❗ 失敗時の保険
    if(!blob){
      alert("保存に失敗しました");
      return;
    }

    const link = document.createElement("a");
    link.download = "ドズル社自己紹介カード.jpg"; // ← JPEGに変更

    const url = URL.createObjectURL(blob);
    link.href = url;

    link.click();

    // メモリ解放（地味に重要）
    URL.revokeObjectURL(url);

  }, "image/jpeg", 0.8); // ← JPEG＋画質指定
}

function shareToX(){

  const text = `非公式ファンサイトで #ドズル社自己紹介カード を作成しました！
https://dzl-database.github.io/
#ドズル社データベース`;

  const url = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text);

  window.open(url, "_blank");
}

/* =========================
   ドズル社 年表
========================= */

const HISTORY_CSV =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQxedYEVWEoSt0nOsPLScn4qxcYh9eWu2EVRVVBXRfhHzgeGpyoP2SZ0PmMuOJQGytZ623VH25rmlQ9/pub?gid=0&single=true&output=csv";

/* 色 */

const historyColors = {
  "ドズル社":"#222",
  "ドズル":"#C80000",
  "ぼんじゅうる":"#733C93",
  "おんりー":"#FCC700",
  "おらふくん":"#54C3F1",
  "おおはらMEN":"#EB6D9A"
};

/* 読み込み */

async function loadHistoryTimeline(){

  const container =
    document.getElementById("historyTimeline");

  try{

    const res = await fetch(HISTORY_CSV);
    const text = await res.text();

    const rows = text.trim().split("\n");

    /* ヘッダー除外 */
    rows.shift();

    let html = "";

    let currentYear = "";

    let yearButtons = "";

    rows.forEach(row=>{

      const cols = row.split(",");

      const date = cols[0] || "";
      const title = cols[1] || "";
      const first = cols[2] || "";
      const colorName = cols[3] || "";
      const category = cols[4] || "";
      const link = cols[5] || "";
      const linkTitle = cols[6] || "";

      const color =
        historyColors[colorName] || "#999";

      /* 年取得 */
      const year =
        date.split("/")[0];

      /* 年切り替え */
      if(year !== currentYear){

        currentYear = year;

        html += `
          <div
            class="history-year-heading"
            id="history-year-${year}">
            ${year}年
          </div>
        `;

        yearButtons += `
          <button class="history-year-btn"
            onclick="scrollToHistoryYear('${year}')">
            ${year}
          </button>
        `;
      }

      html += `

      <div class="history-item">

        <div class="history-dot"
          style="border-color:${color}">
        </div>

        <div class="history-card"
          style="border-left-color:${color}">

          <div class="history-meta-row">

            <div class="history-date">
              ${date}
            </div>

            ${
              category
              ? `
              <div class="history-category">
                <span class="material-symbols-outlined history-category-icon">
                  sell
                </span>

                ${category}
              </div>
              `
              : ``
            }

          </div>

          <div class="history-title-row">

            ${
              first === "初"
              ? `<div class="history-first">初</div>`
              : ``
            }

            <div class="history-title">
              ${title}
            </div>

          </div>

          ${
            link
            ? `
            <div class="history-link">
              <a href="${link}"
                 target="_blank">

                <span class="material-symbols-outlined history-link-icon">
                  open_in_new
                </span>

                ${linkTitle || "リンクを開く"}

              </a>
            </div>
            `
            : ``
          }

        </div>

      </div>

      `;

    });

    container.innerHTML = html;

    document.getElementById(
      "historyYearNav"
    ).innerHTML = yearButtons;

    setupHistoryFade();

  }catch(err){

    console.error(err);

    container.innerHTML = `
      <div class="no-event-message">
        年表を読み込めませんでした。
      </div>
    `;
  }

}

/* フェード表示 */

function setupHistoryFade(){

  const items =
    document.querySelectorAll(".history-item");

  const observer = new IntersectionObserver(entries=>{

    entries.forEach(entry=>{

      if(entry.isIntersecting){

        entry.target.classList.add("show");

      }

    });

  },{
    threshold:0.12
  });

  items.forEach(item=>{
    observer.observe(item);
  });

}

/* =========================
   年へスクロール
========================= */

function scrollToHistoryYear(year){

  const target =
    document.getElementById(
      `history-year-${year}`
    );

  if(target){

    /* ヘッダー分の余白 */
    const offset = 150;

    /* 要素位置取得 */
    const top =
      target.getBoundingClientRect().top
      + window.pageYOffset
      - offset;

    window.scrollTo({
      top: top,
      behavior:"smooth"
    });

  }

}

/* =========================
   一番上へスクロール
========================= */

function scrollHistoryTop(){

  const tab =
    document.getElementById("historyTab");

  if(tab){

    const top =
      tab.getBoundingClientRect().top
      + window.pageYOffset
      - 300;

    window.scrollTo({
      top: top,
      behavior:"smooth"
    });

  }

}

/* =========================
   ボタン表示制御
========================= */

window.addEventListener("scroll", ()=>{

  const btn =
    document.getElementById("historyTopBtn");

  const historyTab =
    document.getElementById("historyTab");

  if(!btn || !historyTab) return;

  /* Historyタブ開いてる？ */
  const isActive =
    historyTab.classList.contains("active");

  /* スクロール量 */
  const show =
    window.scrollY > 500;

  if(isActive && show){

    btn.classList.add("show");

  }else{

    btn.classList.remove("show");

  }

});
 
/* 起動 */
loadHistoryTimeline();

window.addEventListener("DOMContentLoaded", ()=>{

  const hash =
    location.hash.replace("#","");

  // ハッシュなし
  if(!hash){
    showSection("home", false);
    return;
  }

  // イベント詳細
  if(hash.startsWith("event_")){

    showEventDetail(hash);

    return;

  }

  // グッズ詳細
  if(hash.startsWith("goods_")){

    showGoodsDetail(hash);

    return;

  }

  // About系
  if(hash.startsWith("about-")){

    const tabName =
      hash.replace("about-","");

    const tabMap = {
      about: "aboutTab",
      member: "memberTab",
      portal: "portalTab",
      channel: "channelTab",
      history: "historyTab"
    };

    const tabId = tabMap[tabName];

    if(tabId){
      switchAboutTab(tabId, false);
      return;
    }
  }

  // 通常ページ
  showSection(hash, false);

});

window.addEventListener("hashchange", ()=>{

  const hash = location.hash.replace("#","");

  // ハッシュなし
  if(!hash){
    showSection("home", false);
    return;
  }

  // イベント詳細
  if(hash.startsWith("event_")){
    showEventDetail(hash);
    return;
  }

  // グッズ詳細
  if(hash.startsWith("goods_")){
    showGoodsDetail(hash);
    return;
  }

  // About
  if(hash.startsWith("about-")){

    const tabName = hash.replace("about-","");

    const tabMap = {
      about:"aboutTab",
      member:"memberTab",
      portal:"portalTab",
      channel:"channelTab",
      history:"historyTab"
    };

    const tabId = tabMap[tabName];

    if(tabId){
      switchAboutTab(tabId,false);
      return;
    }

  }

  showSection(hash,false);

});

// =========================
// 日本時間の日付フォーマット
// =========================

function formatJapaneseDate(dateStr){

  if(!dateStr) return "";

  const date = new Date(dateStr + "T00:00:00+09:00");

  const week = [
    "日",
    "月",
    "火",
    "水",
    "木",
    "金",
    "土"
  ];

  return `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日(${week[date.getDay()]})`;

}

// =========================
// イベント期間表示
// =========================

function formatEventPeriod(event){

  const startDate = formatJapaneseDate(event.start_date);
  const endDate   = formatJapaneseDate(event.end_date);

  const startTime = event.start_time?.trim();
  const endTime   = event.end_time?.trim();

  // 開始日のみ
  if(!event.end_date){

    if(startTime){

      return `${startDate} ${startTime}～`;

    }

    return startDate;

  }

  // 同じ日
  if(event.start_date === event.end_date){

    if(startTime && endTime){

      return `${startDate} ${startTime}～${endTime}`;

    }

    if(startTime){

      return `${startDate} ${startTime}～`;

    }

    return startDate;

  }

  // 日付が違う

  let startText = startDate;
  let endText = endDate;

  if(startTime){

    startText += ` ${startTime}`;

  }

  if(endTime){

    endText += ` ${endTime}`;

  }

  return `${startText}～${endText}`;

}
 
loadNews();
loadTodayContent();
loadAllLikes();
loadYouTubeStats();

