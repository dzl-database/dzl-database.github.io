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

  // グループ設定を検索
  function findGroupSetting(type, group) {
    return groupSettings.find(setting =>
      setting["タイプ"] === type &&
      (setting["グループ"] || "") === group
    );
  }

  // 表示順番を取得
  function getDisplayOrder(type, group) {
    const setting = findGroupSetting(type, group);
    const order = Number(setting?.["表示順番"]);
    return Number.isFinite(order) && order > 0 ? order : 999999;
  }

  // タイプ・グループに分類
  const typeMap = new Map();

  items.forEach(item => {

    const type = item["タイプ"] || "その他";
    const group = item["グループ"] || "";

    if (!typeMap.has(type)) {
      typeMap.set(type, new Map());
    }

    const groupMap = typeMap.get(type);

    if (!groupMap.has(group)) {
      groupMap.set(group, []);
    }

    groupMap.get(group).push(item);
  });

  // 全体説明・利用規約カード
  function createGroupInfo(setting) {

    if (!setting) return "";

    const description = setting["全体_説明"] || "";
    const terms = setting["全体_利用規約"] || "";

    if (!description && !terms) return "";

    return `
      <div class="store-group-info">

        ${description ? `
          <div class="store-group-description">
            <div class="store-info-label">
              <span class="material-symbols-outlined">info</span>
              説明
            </div>
            <div class="store-info-text">${escapeStoreHTML(description)}</div>
          </div>
        ` : ""}

        ${terms ? `
          <div class="store-group-terms">
            <div class="store-info-label">
              <span class="material-symbols-outlined">description</span>
              利用規約
            </div>
            <div class="store-info-text">${escapeStoreHTML(terms)}</div>
          </div>
        ` : ""}

      </div>
    `;
  }

  // タイプの表示順を計算
  const sortedTypes = [...typeMap.entries()].sort((a, b) => {

    const orderA = Math.min(
      ...[...a[1].keys()].map(group => getDisplayOrder(a[0], group))
    );

    const orderB = Math.min(
      ...[...b[1].keys()].map(group => getDisplayOrder(b[0], group))
    );

    return orderA - orderB;
  });

  let html = "";

  sortedTypes.forEach(([type, groupMap]) => {

    html += `
      <section class="store-type-section">

        <h3 class="store-type-title">
          <span class="material-symbols-outlined">folder</span>
          ${escapeStoreHTML(type)}
        </h3>
    `;

    // タイプ全体設定（グループ空欄）
    html += createGroupInfo(findGroupSetting(type, ""));

    // グループを表示順番で並べる
    const sortedGroups = [...groupMap.entries()].sort((a, b) => {
      return getDisplayOrder(type, a[0]) - getDisplayOrder(type, b[0]);
    });

    sortedGroups.forEach(([groupName, groupItems]) => {

      // 番号順
      groupItems.sort((a, b) => {
        return Number(a["番号"] || 0) - Number(b["番号"] || 0);
      });

      html += `<div class="store-group">`;

      if (groupName) {

        html += `
          <h4 class="store-group-title">
            <span class="material-symbols-outlined">folder_open</span>
            ${escapeStoreHTML(groupName)}
          </h4>
        `;

        html += createGroupInfo(findGroupSetting(type, groupName));
      }

      html += `<div class="store-item-list">`;

      groupItems.forEach(item => {
        html += createStoreItemCard(item);
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `</section>`;
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

  const itemId = item["素材ID"] || "";

  const creator = item["制作者"] || "";
  const creatorId = item["制作者X ID"] || "";

  const creatorUrl = creatorId
    ? "https://x.com/" + encodeURIComponent(creatorId.replace(/^@/, ""))
    : "";

  const likeCount = Number(item["いいね数"] || 0);

  const title = item["タイトル"] || "";
  const description = item["個別_説明"] || "";
  const terms = item["個別_利用規約"] || "";

  const encodedId = encodeURIComponent(itemId);
  const encodedImageUrl = escapeStoreAttribute(imageUrl);
  const encodedFileName = escapeStoreAttribute(fileName);

  return `
    <article class="store-item-card">

      <div class="store-like-area">
        <button
          class="store-like-btn"
          data-item-id="${escapeStoreAttribute(itemId)}"
          data-like-count="${likeCount}"
          onclick="likeStoreItem(this)"
          aria-label="いいね"
        >
          <span class="material-symbols-outlined">favorite</span>
          <span class="store-like-count">${likeCount}</span>
        </button>
      </div>

      <div
        class="store-item-image"
        onclick="openStoreImage('${encodedImageUrl}')"
      >
        <img
          src="${encodedImageUrl}"
          alt="${escapeStoreAttribute(title || "素材画像")}"
          loading="lazy"
        >
      </div>

      ${title ? `
        <h5 class="store-item-title">
          ${escapeStoreHTML(title)}
        </h5>
      ` : ""}

      ${description ? `<p class="store-item-description">${escapeStoreHTML(description)}</p>` : ""}

      <div class="store-creator">

        ${creator ? `
          <div>制作者：${escapeStoreHTML(creator)}</div>
        ` : ""}

        ${creatorId ? `
          <div>
            X：
            <a
              href="${escapeStoreAttribute(creatorUrl)}"
              target="_blank"
              rel="noopener noreferrer"
            >${escapeStoreHTML(creatorId)}</a>
          </div>
        ` : ""}

      </div>

      <div class="store-item-actions">

        <button
          class="store-download-btn"
          onclick="downloadStoreItem(
            '${encodedId}',
            '${encodedImageUrl}',
            '${encodedFileName}'
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

// ローカルストレージから取得
function getStoreLikedItems() {

  try {
    return JSON.parse(
      localStorage.getItem("storeLikedItems") || "[]"
    );
  } catch {
    return [];
  }
}


// ローカルストレージに保存
function saveStoreLikedItems(items) {

  localStorage.setItem(
    "storeLikedItems",
    JSON.stringify([...new Set(items)])
  );
}


// 素材ごとの通信キュー
const storeActionQueues = new Map();


// いいね
function likeStoreItem(button) {

  const itemId = button.dataset.itemId;

  if (!itemId) return;

  const likedItems = getStoreLikedItems();
  const wasLiked = likedItems.includes(itemId);

  // 今回の操作後の状態
  const willBeLiked = !wasLiked;

  // ローカルストレージを即時更新
  const newLikedItems = willBeLiked
    ? [...likedItems, itemId]
    : likedItems.filter(id => id !== itemId);

  saveStoreLikedItems(newLikedItems);

  // 見た目を即時更新
  button.classList.toggle("liked", willBeLiked);

  // 数字を即時更新
  const countElement = button.querySelector(".store-like-count");

  const currentCount = Number(button.dataset.likeCount || 0);

  const newCount = Math.max(
    0,
    currentCount + (willBeLiked ? 1 : -1)
  );

  button.dataset.likeCount = newCount;

  if (countElement) {
    countElement.textContent = newCount;
  }

  // 裏側でGASへ送信
  enqueueStoreAction(
    willBeLiked ? "like" : "unlike",
    itemId
  );
}


// 素材ごとに通信を順番に処理
function enqueueStoreAction(action, itemId) {

  const previous = storeActionQueues.get(itemId) || Promise.resolve();

  const next = previous
    .catch(error => {
      console.error("前回の素材通信エラー:", error);
    })
    .then(async () => {

      const result = await sendStoreAction(action, itemId);

      if (!result.success) {
        throw new Error(result.message || "通信に失敗しました");
      }

      // GASから返された数字で表示を補正
      const buttons = document.querySelectorAll(
        ".store-like-btn"
      );

      buttons.forEach(button => {

        if (button.dataset.itemId !== itemId) return;

        // 通信中に次の操作が発生している可能性があるため、
        // 現在の表示状態は変更せず、カウントだけ確認する。
        const countElement = button.querySelector(".store-like-count");

        if (countElement) {
          // 連続操作による表示の巻き戻りを防ぐため、
          // ここではGASの値で上書きしない。
        }

      });

    })
    .catch(error => {
      console.error("素材アクションの送信に失敗:", error);
    });

  storeActionQueues.set(itemId, next);

  next.finally(() => {
    if (storeActionQueues.get(itemId) === next) {
      storeActionQueues.delete(itemId);
    }
  });
}


// ダウンロード
async function downloadStoreItem(itemId, imageUrl, fileName) {

  try {

    const result = await sendStoreAction(
      "download",
      decodeURIComponent(itemId)
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

    alert(
      "ダウンロードの記録に失敗しました。時間をおいて再度お試しください。"
    );

  }
}


// GASへ送信
async function sendStoreAction(action, itemId) {

  const response = await fetch(STORE_GAS_URL, {

    method: "POST",

    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },

    body: JSON.stringify({
      action: action,
      itemId: itemId
    })

  });

  return await response.json();
}


// いいね状態を反映
function updateStoreLikedButtons() {

  const likedItems = getStoreLikedItems();

  document.querySelectorAll(".store-like-btn").forEach(button => {

    const itemId = button.dataset.itemId;

    button.classList.toggle(
      "liked",
      likedItems.includes(itemId)
    );

  });
}