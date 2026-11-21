/* ========================================
   素材配布：設定
======================================== */

// 素材個別設定のCSV URL
const STORE_ITEM_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQNyn-_qWO7N6ybif2WPvVNMfaCLwNWEr-3nV6i0yqq6DhMaG8CIVfz4GGTcHEJd4vOYACjuFkj5qZ9/pub?gid=0&single=true&output=csv";

// グループ全体設定のCSV URL
const STORE_GROUP_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQNyn-_qWO7N6ybif2WPvVNMfaCLwNWEr-3nV6i0yqq6DhMaG8CIVfz4GGTcHEJd4vOYACjuFkj5qZ9/pub?gid=1179761870&single=true&output=csv";

// GASのウェブアプリURL
const STORE_GAS_URL = "https://script.google.com/macros/s/AKfycbyzpW7-Z9hGoDDyOR6x4tMF4JyNjFWGhiuy_jBucYIQs6qyeNQ8584UUU-Veh3HkkNH/exec";

// 素材画像フォルダ
const STORE_IMAGE_PATH = "sozai/";

/* ========================================
   素材配布：CSV読み込み
======================================== */

// CSVを取得
async function fetchStoreCSV(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("CSVの読み込みに失敗しました");
  }

  const text = await response.text();

  return parseStoreCSV(text);
}


// CSV解析
function parseStoreCSV(text) {

  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {

    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i++;
    }

    else if (char === '"') {
      inQuotes = !inQuotes;
    }

    else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    }

    else if ((char === "\n" || char === "\r") && !inQuotes) {

      if (char === "\r" && next === "\n") {
        i++;
      }

      row.push(value);
      rows.push(row);

      row = [];
      value = "";
    }

    else {
      value += char;
    }
  }

  if (value !== "" || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows.shift().map(h => h.trim());

  return rows
    .filter(row => row.some(cell => cell.trim() !== ""))
    .map(row => {

      const object = {};

      headers.forEach((header, index) => {
        object[header] = (row[index] || "").trim();
      });

      return object;
    });
}


/* ========================================
   素材配布：初期化
======================================== */

async function loadFreeStore() {

  const container = document.getElementById("freeStoreContent");

  if (!container) return;

  container.innerHTML = `
    <div class="store-loading">
      素材を読み込んでいます...
    </div>
  `;

  try {

    const [items, groups] = await Promise.all([
      fetchStoreCSV(STORE_ITEM_CSV_URL),
      fetchStoreCSV(STORE_GROUP_CSV_URL)
    ]);

    // 公開設定が「公開」の素材だけを表示
    const publicItems = items.filter(item =>
      item["公開設定"] === "公開"
    );

    renderFreeStore(publicItems, groups);

  } catch (error) {

    console.error("素材配布の読み込みエラー:", error);

    container.innerHTML = `
      <p class="store-loading">
        素材の読み込みに失敗しました。<br>
        しばらくしてから再度お試しください。
      </p>
    `;
  }
}


/* ========================================
   素材配布：表示
======================================== */

function renderFreeStore(items, groupSettings) {

  const container = document.getElementById("freeStoreContent");

  if (!container) return;

  if (items.length === 0) {

    container.innerHTML = `
      <p class="store-loading">
        現在公開されている素材はありません。
      </p>
    `;

    return;
  }

  // タイプごとに分類
  const typeMap = new Map();

  items.forEach(item => {

    const type = item["タイプ"] || "その他";

    if (!typeMap.has(type)) {
      typeMap.set(type, new Map());
    }

    const group = item["グループ"] || "";

    if (!typeMap.get(type).has(group)) {
      typeMap.get(type).set(group, []);
    }

    typeMap.get(type).get(group).push(item);
  });


  // グループ設定を検索
  function findGroupSetting(type, group) {

    return groupSettings.find(setting =>
      setting["タイプ"] === type &&
      (setting["グループ"] || "") === group
    );
  }


  // グループ全体設定のHTML
  function createGroupInfo(setting) {

    if (!setting) return "";

    let html = "";

    if (setting["全体_説明"]) {
      html += `<div class="store-description"><span class="store-info-label">説明</span>${escapeStoreHTML(setting["全体_説明"])}</div>`;
    }

    if (setting["全体_利用規約"]) {
      html += `<div class="store-terms"><span class="store-info-label">利用規約</span>${escapeStoreHTML(setting["全体_利用規約"])}</div>`;
    }

    return html;
  }


  let html = "";


  // タイプごとに表示
  typeMap.forEach((groupMap, type) => {

    html += `
      <section class="store-type-section">

        <h3 class="store-type-title">
          ${escapeStoreHTML(type)}
        </h3>
    `;


    // タイプ全体設定（グループが空欄）
    const typeSetting = findGroupSetting(type, "");

    html += createGroupInfo(typeSetting);


    // グループごとに表示
    groupMap.forEach((groupItems, groupName) => {

      // 番号順に並べる
      groupItems.sort((a, b) => {
        return Number(a["番号"] || 0) - Number(b["番号"] || 0);
      });


      html += `
        <div class="store-group">
      `;


      // グループ名がある場合だけタイトルを表示
      if (groupName) {

        html += `
          <h4 class="store-group-title">
            ${escapeStoreHTML(groupName)}
          </h4>
        `;
      }


      // グループ個別の全体設定
      if (groupName) {

        const setting = findGroupSetting(type, groupName);

        html += createGroupInfo(setting);
      }


      html += `
          <div class="store-item-list">
      `;


      groupItems.forEach(item => {

        html += createStoreItemCard(item);

      });


      html += `
          </div>
        </div>
      `;

    });


    html += `
      </section>
    `;

  });


  container.innerHTML = html;
  updateStoreLikedButtons();
}


/* ========================================
   素材カード
======================================== */

function createStoreItemCard(item) {

  const fileName = item["ファイル名"] || "";
  const imageUrl = STORE_IMAGE_PATH + encodeURIComponent(fileName);

  const creator = item["制作者"] || "";
  const creatorId = item["制作者X ID"] || "";

  const creatorUrl = creatorId
    ? "https://x.com/" + encodeURIComponent(creatorId.replace(/^@/, ""))
    : "";

  const likeCount = Number(item["いいね数"] || 0);

  const member = item["メンバー"] || "";
  const description = item["個別_説明"] || "";
  const terms = item["個別_利用規約"] || "";

  // 素材を識別するキー
  const itemKey = [
    item["タイプ"],
    item["グループ"],
    item["番号"],
    fileName
  ].join("|");

  const encodedKey = encodeURIComponent(itemKey);

  return `

    <article class="store-item-card">

      <div class="store-like-area">

        <button
          class="store-like-btn"
          data-item-key="${encodedKey}"
          onclick="likeStoreItem(this)"
        >
          <span class="material-symbols-outlined">favorite</span>
          <span class="store-like-count">${likeCount}</span>
        </button>

      </div>


      <div
        class="store-item-image"
        onclick="openStoreImage('${escapeStoreAttribute(imageUrl)}')"
      >
        <img
          src="${escapeStoreAttribute(imageUrl)}"
          alt="${escapeStoreAttribute(fileName)}"
          loading="lazy"
        >
      </div>


      <p class="store-file-name">
        ${escapeStoreHTML(fileName)}
      </p>


      ${member ? `
        <p class="store-member">
          ${escapeStoreHTML(member)}
        </p>
      ` : ""}


      ${description ? `<p class="store-item-description">${escapeStoreHTML(description)}</p>` : ""}


      <div class="store-creator">

        ${creator ? `
          <div>
            制作者：${escapeStoreHTML(creator)}
          </div>
        ` : ""}

        ${creatorId ? `
          <div>
            X：
            <a
              href="${escapeStoreAttribute(creatorUrl)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              ${escapeStoreHTML(creatorId)}
            </a>
          </div>
        ` : ""}

      </div>


      <div class="store-item-actions">

        <button
          class="store-download-btn"
          onclick="downloadStoreItem(
            '${escapeStoreAttribute(encodedKey)}',
            '${escapeStoreAttribute(imageUrl)}',
            '${escapeStoreAttribute(fileName)}'
          )"
        >
          ダウンロード
        </button>

        ${terms ? `
          <button
            class="store-terms-btn"
            onclick="toggleStoreTerms(this)"
          >
            利用規約
          </button>
        ` : ""}

      </div>


      ${terms ? `<div class="store-item-terms">${escapeStoreHTML(terms)}</div>` : ""}

    </article>

  `;
}


/* ========================================
   HTMLエスケープ
======================================== */

function escapeStoreHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


function escapeStoreAttribute(value) {
  return escapeStoreHTML(value);
}


/* ========================================
   個別利用規約
======================================== */

function toggleStoreTerms(button) {

  const card = button.closest(".store-item-card");

  if (!card) return;

  const terms = card.querySelector(".store-item-terms");

  if (!terms) return;

  terms.classList.toggle("open");

  button.textContent = terms.classList.contains("open")
    ? "利用規約を閉じる"
    : "利用規約";
}


/* ========================================
   画像拡大
======================================== */

function openStoreImage(imageUrl) {

  const modal = document.getElementById("storeImageModal");
  const image = document.getElementById("storeLargeImage");

  if (!modal || !image) return;

  image.src = imageUrl;
  modal.classList.add("open");
}


function closeStoreImage() {

  const modal = document.getElementById("storeImageModal");

  if (modal) {
    modal.classList.remove("open");
  }
}


// モーダルの背景クリックで閉じる
document.getElementById("storeImageModal")?.addEventListener("click", function(e) {

  if (e.target === this) {
    closeStoreImage();
  }

});


/* ========================================
   いいね・ダウンロード
======================================== */

function getStoreLikedItems() {

  try {
    return JSON.parse(localStorage.getItem("storeLikedItems") || "[]");
  } catch {
    return [];
  }
}


// いいね
async function likeStoreItem(button) {

  const key = decodeURIComponent(button.dataset.itemKey);

  const likedItems = getStoreLikedItems();

  if (likedItems.includes(key)) {
    alert("この素材には、すでにいいねしています。");
    return;
  }

  button.disabled = true;

  try {

    const result = await sendStoreAction("like", key);

    if (!result.success) {
      throw new Error(result.message || "いいねに失敗しました");
    }

    likedItems.push(key);

    localStorage.setItem(
      "storeLikedItems",
      JSON.stringify(likedItems)
    );

    button.classList.add("liked");

    const count = button.querySelector(".store-like-count");

    if (count) {
      count.textContent = result.likeCount;
    }

  } catch (error) {

    console.error(error);
    alert("いいねに失敗しました。時間をおいて再度お試しください。");

  } finally {

    button.disabled = false;

  }
}


// ダウンロード
async function downloadStoreItem(key, imageUrl, fileName) {

  try {

    const result = await sendStoreAction(
      "download",
      decodeURIComponent(key)
    );

    if (!result.success) {
      throw new Error(result.message || "ダウンロードに失敗しました");
    }

    const link = document.createElement("a");

    link.href = imageUrl;
    link.download = fileName;

    document.body.appendChild(link);

    link.click();

    link.remove();

  } catch (error) {

    console.error(error);

    alert("ダウンロードの記録に失敗しました。時間をおいて再度お試しください。");

  }
}


// GASへ送信
async function sendStoreAction(action, itemKey) {

  const response = await fetch(STORE_GAS_URL, {

    method: "POST",

    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },

    body: JSON.stringify({
      action: action,
      itemKey: itemKey
    })

  });

  return await response.json();
}


// 素材配布ページを開いたときに読み込む


function updateStoreLikedButtons() {

  const likedItems = getStoreLikedItems();

  document.querySelectorAll(".store-like-btn").forEach(button => {

    const key = decodeURIComponent(button.dataset.itemKey);

    if (likedItems.includes(key)) {
      button.classList.add("liked");
    }

  });

}