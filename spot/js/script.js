// ======================================================
// URLハッシュによるページ移動
// ======================================================

let isApplyingHashRoute = false;


// ------------------------------------------------------
// URLのハッシュを変更
// ------------------------------------------------------

function navigateHash(hash) {

  const nextHash =
    hash
      ? `#${String(hash).replace(/^#/, "")}`
      : "";

  if (location.hash === nextHash) {
    applyHashRoute();
    return;
  }

  location.hash =
    nextHash || "";
}


// ------------------------------------------------------
// URLから現在のルートを取得
// ------------------------------------------------------

function getHashRoute() {

  let hash =
    location.hash.replace(/^#/, "");

  try {
    hash = decodeURIComponent(hash);
  } catch(error) {
    console.warn("URLの解析に失敗しました:", error);
  }

  // ハッシュなし
  if (!hash) {
    return {
      type: "map"
    };
  }

  // #spot_XXXX
  if (hash.startsWith("spot_")) {
    return {
      type: "spot",
      spotId: hash
    };
  }

  return {
    type: "unknown"
  };

}


// ------------------------------------------------------
// スポットIDからスポットを探す
// ------------------------------------------------------

function findSpotById(spotId) {

  if (!Array.isArray(dataList)) {
    return null;
  }

  const id =
    String(spotId || "").trim();

  return dataList.find(spot => {

    return String(
      spot["スポットID"] || ""
    ).trim() === id;

  }) || null;

}


// ------------------------------------------------------
// URLルートを実際の画面に反映
// ------------------------------------------------------

function applyHashRoute() {

  const route =
    getHashRoute();

  isApplyingHashRoute = true;

  try {

    // ------------------------------
    // 通常のマップ
    // ------------------------------

    if(route.type === "map") {

      closeAllBottomNavModals();
      closeDetail();

      showSection("map");

      return;

    }


    // ------------------------------
    // スポット詳細
    // ------------------------------

    if(route.type === "spot") {

      const spot =
        findSpotById(
          route.spotId
        );

      // 存在しないスポット
      if(!spot) {

        console.warn(
          "指定されたスポットが見つかりません:",
          route.spotId
        );

        closeAllBottomNavModals();
        closeDetail();

        showSection("map");

        return;

      }


      closeAllBottomNavModals();
      closeDetail();

      showSection("map");


      const lat =
        parseFloat(
          spot["緯度"]
        );

      const lng =
        parseFloat(
          spot["経度"]
        );


      // 地図をスポットへ移動
      if(
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {

        map.setView(
          [lat, lng],
          Math.max(
            map.getZoom(),
            16
          ),
          {
            animate: true,
            duration: 0.5
          }
        );

      }


      // 詳細パネルを開く
      openDetail(spot);

      return;

    }


    // ------------------------------
    // 不明なURL
    // ------------------------------

    console.warn(
      "不明なURLハッシュです:",
      location.hash
    );

    closeAllBottomNavModals();
    closeDetail();
    showSection("map");

  } finally {

    isApplyingHashRoute = false;

  }

}


// ------------------------------------------------------
// ブラウザの戻る・進む・URL変更に対応
// ------------------------------------------------------

window.addEventListener(
  "hashchange",
  applyHashRoute
);

window.addEventListener(
  "popstate",
  applyHashRoute
);

function closeAllBottomNavModals() {

  document.querySelectorAll(".modal.active").forEach(modal => {
    modal.classList.remove("active");
  });


  if (typeof currentMemoPostSpot !== "undefined") {
    currentMemoPostSpot = null;
  }


  if (
    typeof currentCorrectionRequestSpot !== "undefined"
  ) {
    currentCorrectionRequestSpot = null;
  }

}

// ======================================================
// 投稿フォーム入力履歴
// ======================================================

const POST_FORM_DRAFT_KEY =
  "dzlSpot_postFormDraft";

// ======================================================
// 投稿フォーム入力履歴を保存
// ======================================================

function savePostFormDraft(){

  try {

    const placeName =
      document
        .getElementById("postPlaceName")
        ?.value || "";

    const category =
      document
        .getElementById("postCategory")
        ?.value || "";

    const address =
      document
        .getElementById("postAddress")
        ?.textContent
        .trim() || "";

    const memo =
      document
        .getElementById("postMemo")
        ?.value || "";


    // イベント
    const eventItems =
      document.querySelectorAll(
        "#postEventsContainer .post-event-item"
      );

    const events = [];

    eventItems.forEach(item => {

      events.push({

        name:
          item
            .querySelector(".post-event-name")
            ?.value || "",

        manualStatus:
          item
            .querySelector(".post-event-manual-status")
            ?.value || "開催中"

      });

    });


    // 関連URL
    const urlInputs =
      document.querySelectorAll(
        ".post-related-url"
      );

    const relatedUrls = [];

    urlInputs.forEach(input => {

      relatedUrls.push(
        input.value || ""
      );

    });


    const draft = {

      placeName: placeName,

      category: category,

      address: address,

      lat: selectedPostLat,

      lng: selectedPostLng,

      events: events,

      memo: memo,

      relatedUrls: relatedUrls

    };


    localStorage.setItem(
      POST_FORM_DRAFT_KEY,
      JSON.stringify(draft)
    );


  } catch(error){

    console.warn(
      "投稿フォーム履歴の保存に失敗しました:",
      error
    );

  }

}

// ======================================================
// 投稿フォーム入力履歴を復元
// ======================================================

function restorePostFormDraft(){

  try {

    const saved =
      localStorage.getItem(
        POST_FORM_DRAFT_KEY
      );


    if(!saved){

      return false;

    }


    const draft =
      JSON.parse(saved);


    if(!draft || typeof draft !== "object"){

      return false;

    }


    // ----------------------------------------------
    // 基本情報
    // ----------------------------------------------

    const placeName =
      document.getElementById(
        "postPlaceName"
      );

    if(placeName){

      placeName.value =
        draft.placeName || "";

    }


    const category =
      document.getElementById(
        "postCategory"
      );

    if(category){

      category.value =
        draft.category || "";

    }


    const address =
      document.getElementById(
        "postAddress"
      );

    if(address){

      address.textContent =
        draft.address || "";

    }


    const memo =
      document.getElementById(
        "postMemo"
      );

    if(memo){

      memo.value =
        draft.memo || "";

    }


    // ----------------------------------------------
    // 座標
    // ----------------------------------------------

    const lat =
      Number(draft.lat);

    const lng =
      Number(draft.lng);


    // 0,0 は無効な地点として扱う
    const hasValidLocation =
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      !(lat === 0 && lng === 0);


    if(hasValidLocation){

      selectedPostLat = lat;
      selectedPostLng = lng;

    }else{

      selectedPostLat = null;
      selectedPostLng = null;

    }


    // ----------------------------------------------
    // 場所表示
    // ----------------------------------------------

    const summary =
      document.getElementById(
        "postLocationSummary"
      );

    const coordinate =
      document.getElementById(
        "postMapCoordinate"
      );


    if(hasValidLocation){

      if(summary){

        summary.textContent =
          `選択地点：${lat.toFixed(6)}, ${lng.toFixed(6)}`;

        summary.classList.add(
          "selected"
        );

      }


      if(coordinate){

        coordinate.textContent =
          `緯度 ${lat.toFixed(6)} / 経度 ${lng.toFixed(6)}`;

      }

    }else{

      if(summary){

        summary.textContent =
          "マップ上でスポットの場所を選択してください";

        summary.classList.remove(
          "selected"
        );

      }


      if(coordinate){

        coordinate.textContent =
          "場所が選択されていません";

      }

    }


    // ----------------------------------------------
    // イベント
    // ----------------------------------------------

    resetPostEvents();


    const events =
      Array.isArray(draft.events)
        ? draft.events
        : [];


    if(events.length > 0){

      const container =
        document.getElementById(
          "postEventsContainer"
        );


      if(container){

        container.innerHTML = "";

        postEventCount = 0;


        events.forEach(event => {

          addPostEvent();


          const items =
            container.querySelectorAll(
              ".post-event-item"
            );


          const item =
            items[items.length - 1];


          if(!item){

            return;

          }


          const nameInput =
            item.querySelector(
              ".post-event-name"
            );


          const statusSelect =
            item.querySelector(
              ".post-event-manual-status"
            );


          if(nameInput){

            nameInput.value =
              event.name || "";

          }


          if(statusSelect){

            statusSelect.value =
              event.manualStatus ||
              "開催中";

          }

        });

      }

    }


    // ----------------------------------------------
    // 関連URL
    // ----------------------------------------------

    resetPostRelatedUrls();


    const relatedUrls =
      Array.isArray(draft.relatedUrls)
        ? draft.relatedUrls
        : [];


    if(relatedUrls.length > 0){

      const container =
        document.getElementById(
          "postRelatedUrlsContainer"
        );


      if(container){

        container.innerHTML = "";

        postRelatedUrlCount = 0;


        relatedUrls.forEach(url => {

          addPostRelatedUrl();


          const items =
            container.querySelectorAll(
              ".post-related-url-item"
            );


          const item =
            items[items.length - 1];


          if(!item){

            return;

          }


          const input =
            item.querySelector(
              ".post-related-url"
            );


          if(input){

            input.value =
              url || "";

          }

        });

      }

    }


    // ----------------------------------------------
    // 復元完了メッセージ
    // ----------------------------------------------

    const note =
      document.getElementById(
        "postAddressNote"
      );

    if(note){

      if(hasValidLocation){

        if(draft.address){

          note.textContent =
            "保存されていた入力内容を復元しました。";

        }else{

          note.textContent =
            "住所を自動取得できていません。もう一度マップから場所を選択してください。";

        }

      }else{

        note.textContent =
          "マップで場所を選択すると、住所が自動入力されます。";

      }

    }


    return true;


  } catch(error){

    console.warn(
      "投稿フォーム履歴の復元に失敗しました:",
      error
    );

    return false;

  }

}

// ======================================================
// 投稿フォーム入力履歴を削除
// ======================================================

function clearPostFormDraft(){

  try {

    localStorage.removeItem(
      POST_FORM_DRAFT_KEY
    );

  } catch(error){

    console.warn(
      "投稿フォーム履歴の削除に失敗しました:",
      error
    );

  }

}

function openModal(){
  closeAllBottomNavModals();
  document.getElementById("modal").classList.add("active");
}

function closeModal(e){
  // 背景クリック時のみ
  if(e && e.target === e.currentTarget){
    document.getElementById("modal").classList.remove("active");
  }
}

// ← 追加（これが重要）
function closeModalForce(){
  document.getElementById("modal").classList.remove("active");
}

function showSection(id){

  // セクション切り替え
  document.querySelectorAll(".section").forEach(el=>{
    el.classList.remove("active");
  });

  const targetSection = document.getElementById(id);

  if(targetSection){
    targetSection.classList.add("active");
  }


  // ===== マップ関連UIの表示切り替え =====
  const extraButtons =
    document.querySelector(".extra-buttons");

  const detailPanel =
    document.getElementById("detailPanel");

  // 表示管理パネル
  const spotFilterPanel =
    document.querySelector(".spot-filter-panel");


  if(id === "map"){

    // マップ画面
    if(extraButtons){
      extraButtons.classList.remove("hidden-ui");
    }

    if(detailPanel){
      detailPanel.classList.remove("hidden-ui");
    }

    if(spotFilterPanel){
      spotFilterPanel.classList.remove("hidden-ui");
    }

  }else{

    // マップ以外のページ
    if(extraButtons){
      extraButtons.classList.add("hidden-ui");
    }

    if(detailPanel){
      detailPanel.classList.add("hidden-ui");
    }

    if(spotFilterPanel){
      spotFilterPanel.classList.add("hidden-ui");
    }

  }


  closeModalForce();

  if (id === "release") {
    renderReleaseNotes();
  }

}

// ======================================================
// 下部ナビゲーションからモーダルを開く
// マップ以外のページにいる場合は、先にマップへ戻る
// ======================================================

function openBottomNavModal(openFunction, targetModalId) {

  // 現在開いているモーダル
  const activeModal = document.querySelector(".modal.active");


  // ======================================================
  // 同じモーダルをもう一度押した場合
  // ======================================================
  if (
    activeModal &&
    targetModalId &&
    activeModal.id === targetModalId
  ) {
    activeModal.classList.remove("active");

    // 現地メモ投稿の対象スポット情報をリセット
    if (
      targetModalId === "memoPostModal" &&
      typeof currentMemoPostSpot !== "undefined"
    ) {
      currentMemoPostSpot = null;
    }

    return;
  }


  // ======================================================
  // メニュー以外は、マップ以外のページなら
  // 先にマップへ戻す
  // ======================================================
  const mapSection = document.getElementById("map");

  if (
    targetModalId !== "modal" &&
    (!mapSection || !mapSection.classList.contains("active"))
  ) {
    showSection("map");
  }


  // ======================================================
  // モーダルを開く
  // ======================================================
  if (typeof openFunction === "function") {
    openFunction();
  }

}
   
function goHome(){
  location.href = "/";
}

// ======================================================
// 新規スポット投稿 - GAS設定
// ======================================================

// GAS Webアプリの「/exec」URLをここに入れる
const GAS_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwwi0e-XQqR9HWjIlrOSjpcXvhLFbLedCXSqM6YN5rphYziwil3tSK-Apg0veC_oVOs/exec";

// 投稿者を識別するための簡易ID
// 個人情報ではなく、ブラウザごとにランダム生成されるIDです。
const POST_CLIENT_ID_KEY =
  "dzl_spot_post_client_id_v1";
   
const categories = [
  {name:"グッズ", color:"#C80000"},
  {name:"飲食", color:"#733C93"},
  {name:"コンビニ", color:"#FCC700"},
  {name:"カプセルトイ", color:"#54C3F1"},
  {name:"聖地", color:"#EB6D9A"},
  {name:"その他", color:"black"}
];

const statuses = ["開催前","開催中","開催終了"];

window.addEventListener("DOMContentLoaded", () => {
  showSection("map");

  // URLにハッシュが付いていれば反映
  if (location.hash) {
    applyHashRoute();
  }
});

// =======================
// カテゴリ別アイコン
// =======================
//
// 同じカテゴリのアイコンは1回だけ生成して使い回す。
// スポット数が多いほど初期生成時の負荷を減らせる。
//

const spotIconCache = {};

function getIcon(category) {

  // すでに作成済みなら、そのまま再利用
  if (spotIconCache[category]) {
    return spotIconCache[category];
  }

  let color = "black";
  let icon = "place";

  switch (category) {

    case "グッズ":
      color = "#C80000";
      icon = "local_mall";
      break;

    case "飲食":
      color = "#733C93";
      icon = "restaurant";
      break;

    case "コンビニ":
      color = "#FCC700";
      icon = "store";
      break;

    case "カプセルトイ":
      color = "#54C3F1";
      icon = "stroke_partial";
      break;

    case "聖地":
      color = "#EB6D9A";
      icon = "attractions";
      break;

    case "その他":
      color = "#000000";
      icon = "place";
      break;

  }

  const createdIcon = L.divIcon({

    html: `
      <div class="spot-map-marker" style="
        background:${color};
      ">
        <span class="material-symbols-outlined">
          ${icon}
        </span>
      </div>
    `,

    className: "spot-map-marker-wrapper",

    iconSize: [26, 26],

    iconAnchor: [13, 13]

  });

  // キャッシュ
  spotIconCache[category] = createdIcon;

  return createdIcon;
}
  
// =======================
// Leaflet 初期化
// =======================
const map = L.map("leafletMap", {

  zoomControl: false,

  // マーカーのズームアニメーション負荷を抑える
  markerZoomAnimation: false

}).setView([35.6812, 139.7671], 6); // 東京中心

// ======================================================
// 地図移動中の軽量化
// ======================================================
//
// 地図を動かしている最中だけマーカーを非表示。
// 指を離す / 移動が終わると自動的に復帰する。
//
// 特にスマホで大量のDivIconを動かす負荷を減らす。
// ======================================================

map.on("movestart", () => {

  const mapElement =
    document.getElementById("leafletMap");

  if (mapElement) {
    mapElement.classList.add("map-is-moving");
  }

});


map.on("moveend", () => {

  const mapElement =
    document.getElementById("leafletMap");

  if (mapElement) {
    mapElement.classList.remove("map-is-moving");
  }

});

// ↓ 追加
L.control.zoom({
  position: 'bottomleft'
}).addTo(map);

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "© OpenStreetMap"
  }
).addTo(map);

let markers = [];
let dataList = [];

// ======================================================
// スポットCSV
// ======================================================

const SPOT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQYy_PtEIhPRx7qC-n0Yjan12MtkNoeAXnYyjMEBTDP7Lv_gfI2TLKSXnS07AvfDt9B3iNVz5Nie27_/pub?gid=2121528304&single=true&output=csv";


// ======================================================
// CSV読み込み
// ======================================================

async function loadSpotData(){

  const cacheBuster =
    `_=${Date.now()}`;


  const csvUrl =
    SPOT_CSV_URL +
    (SPOT_CSV_URL.includes("?") ? "&" : "?") +
    cacheBuster;


  const response =
    await fetch(
      csvUrl,
      {
        cache: "no-store"
      }
    );


  if(!response.ok){

    throw new Error(
      "CSVの取得に失敗しました"
    );

  }


  const text =
    await response.text();


  const parsed =
    Papa.parse(
      text,
      {
        header: true,
        skipEmptyLines: true
      }
    );


  if(parsed.errors && parsed.errors.length){

    console.warn(
      "CSV解析警告:",
      parsed.errors
    );

  }


  const newDataList =
    parsed.data;


  const newMarkers = [];


  // ==============================================
  // 同じ座標の管理
  // ==============================================

  const usedPositions = {};

  newDataList.forEach(item => {

    let lat =
      parseFloat(item["緯度"]);

    let lng =
      parseFloat(item["経度"]);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return;
    }


    const key =
      lat.toFixed(6) +
      "," +
      lng.toFixed(6);


    const duplicateIndex =
      usedPositions[key] || 0;


    usedPositions[key] =
      duplicateIndex + 1;


    /*
    * 同一座標が複数ある場合だけ
    * 円状に少しずつ離す。
    */
    if (duplicateIndex > 0) {

      const radius = 0.0003;

      const angle =
        (duplicateIndex - 1) *
        (Math.PI * 2 / 6);

      lat +=
        Math.cos(angle) * radius;

      lng +=
        Math.sin(angle) * radius;

    }


    const marker =
      L.marker(
        [lat, lng],
        {
          icon: getIcon(item["カテゴリ"]),

          // 不要なキーボードフォーカス処理を減らす
          keyboard: false,

          // ホバー時の持ち上げ処理は使わない
          riseOnHover: false,

          // マーカーイベントを地図へ伝播させない
          bubblingMouseEvents: false
        }
      );


    marker.on(
      "click",
      () => {
        openDetail(item);
      }
    );


    newMarkers.push({
      marker: marker,
      data: item
    });

  });


  // ==============================================
  // 古いマーカーを削除
  // ==============================================

  markers.forEach(obj => {

    try {

      map.removeLayer(
        obj.marker
      );

    } catch(error){

      console.warn(
        "マーカー削除エラー:",
        error
      );

    }

  });


  markers =
    newMarkers;


  dataList =
    newDataList;


  // ==============================================
  // 新しいスポット表示フィルターを適用
  // ==============================================

  applySpotDisplayFilters();

  // URLからスポットを開く
  if (location.hash) {
    applyHashRoute();
  }

  return dataList;

}


/* =========================================================
   スポット表示管理
   ========================================================= */

const SPOT_CATEGORY_CONFIG = [
  {
    name: "グッズ",
    color: "#C80000",
    icon: "local_mall"
  },
  {
    name: "飲食",
    color: "#733C93",
    icon: "restaurant"
  },
  {
    name: "コンビニ",
    color: "#FCC700",
    icon: "store"
  },
  {
    name: "カプセルトイ",
    color: "#54C3F1",
    icon: "stroke_partial"
  },
  {
    name: "聖地",
    color: "#EB6D9A",
    icon: "attractions"
  },
  {
    name: "その他",
    color: "#000000",
    icon: "place"
  }
];

const SPOT_STATUS_CONFIG = [
  {
    name: "開催前",
    color: "#4A90E2",
    icon: "schedule"
  },
  {
    name: "開催中",
    color: "#1BAA61",
    icon: "play_circle"
  },
  {
    name: "開催終了",
    color: "#858A91",
    icon: "event_busy"
  }
];


/*
 * 初期状態
 *
 * カテゴリ：
 *   全てON
 *
 * 開催状況：
 *   開催前 ON
 *   開催中 ON
 *   開催終了 OFF
 */
const spotDisplayFilterState = {

  categories: new Set(
    SPOT_CATEGORY_CONFIG.map(category => category.name)
  ),

  statuses: new Set([
    "開催前",
    "開催中"
  ])

};


/* =========================================================
   イベントの開催状況を取得
   ========================================================= */

/*
 * 1スポットに複数イベントがある場合、
 * Setで管理することで
 *
 * 開催前 + 開催中
 *
 * のような状態を同時に保持する。
 */
function getSpotDisplayStatuses(spot) {

  const statuses = new Set();

  let events = [];

  try {

    if (typeof getEvents === "function") {
      events = getEvents(spot) || [];
    }

  } catch (error) {

    console.warn(
      "イベント状態取得エラー:",
      error
    );

  }


  /*
   * イベント情報が存在しないスポットは
   * 「開催中相当」として扱う。
   *
   * これにより、イベントなしのスポットも
   * 初期状態で表示される。
   */
  if (!events.length) {

    statuses.add("開催中");

    return statuses;

  }


  events.forEach(event => {

    const status =
      String(event?.status || "").trim();

    if (
      status === "開催前" ||
      status === "開催中" ||
      status === "開催終了"
    ) {

      statuses.add(status);

    }

  });


  /*
   * getEvents()から有効な状態が取得できなかった場合も
   * イベントなしと同じ扱いにする。
   */
  if (!statuses.size) {

    statuses.add("開催中");

  }


  return statuses;

}


/* =========================================================
   カテゴリ一致判定
   ========================================================= */

function spotMatchesCategoryFilter(spot) {

  if (!spot) {
    return false;
  }

  const category =
    String(spot["カテゴリ"] || "").trim();

  return spotDisplayFilterState.categories.has(category);

}


/* =========================================================
   開催状況一致判定
   ========================================================= */

function spotMatchesStatusFilter(spot) {

  if (!spot) {
    return false;
  }

  /*
   * 開催状況が1つも選択されていない場合は
   * 何も表示しない。
   */
  if (
    spotDisplayFilterState.statuses.size === 0
  ) {

    return false;

  }


  const spotStatuses =
    getSpotDisplayStatuses(spot);


  /*
   * 「開催前 OR 開催中」のように
   * どれか1つでも一致すれば表示。
   */
  for (
    const status
    of spotDisplayFilterState.statuses
  ) {

    if (spotStatuses.has(status)) {
      return true;
    }

  }


  return false;

}


/* =========================================================
   最終的な表示判定
   ========================================================= */

function shouldDisplaySpot(spot) {

  return (
    spotMatchesCategoryFilter(spot) &&
    spotMatchesStatusFilter(spot)
  );

}


/* =========================================================
   現在表示対象のスポット取得
   ========================================================= */

function getCurrentlyDisplayedSpots() {

  if (!Array.isArray(dataList)) {
    return [];
  }

  return dataList.filter(
    spot => shouldDisplaySpot(spot)
  );

}


/* =========================================================
   カテゴリ件数
   ========================================================= */

/*
 * 現在選択されている開催状況を基準に、
 * 各カテゴリに該当するスポット数を数える。
 *
 * 例：
 * 開催中だけON
 *
 * グッズ → グッズ AND 開催中
 */
function getCategorySpotCount(categoryName) {

  if (!Array.isArray(dataList)) {
    return 0;
  }

  return dataList.filter(spot => {

    const category =
      String(spot["カテゴリ"] || "").trim();

    if (category !== categoryName) {
      return false;
    }

    return spotMatchesStatusFilter(spot);

  }).length;

}


/* =========================================================
   開催状況件数
   ========================================================= */

/*
 * 現在選択されているカテゴリを基準に、
 * 各開催状況に該当するスポット数を数える。
 *
 * 複数イベントの場合：
 *
 * 開催前 + 開催中
 *
 * なら、
 *
 * 開催前 → 1
 * 開催中 → 1
 *
 * と両方にカウントされる。
 *
 * ただし「スポット数」なので同一スポットを
 * 1つの状態の中で二重計上することはない。
 */
function getStatusSpotCount(statusName) {

  if (!Array.isArray(dataList)) {
    return 0;
  }

  return dataList.filter(spot => {

    if (!spotMatchesCategoryFilter(spot)) {
      return false;
    }

    const statuses =
      getSpotDisplayStatuses(spot);

    return statuses.has(statusName);

  }).length;

}


/* =========================================================
   表示中件数更新
   ========================================================= */

function updateDisplayedSpotCount() {

  const countElement =
    document.getElementById(
      "displayedSpotCount"
    );

  if (!countElement) {
    return;
  }

  const count =
    getCurrentlyDisplayedSpots().length;

  countElement.textContent =
    count.toLocaleString("ja-JP");

}


/* =========================================================
   カテゴリフィルター描画
   ========================================================= */

function renderSpotCategoryFilters() {

  const container =
    document.getElementById(
      "spotCategoryFilters"
    );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  SPOT_CATEGORY_CONFIG.forEach(config => {

    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      "spot-filter-button";

    const isActive =
      spotDisplayFilterState.categories.has(
        config.name
      );

    if (isActive) {
      button.classList.add("is-active");
    }

    button.dataset.category =
      config.name;

    button.innerHTML = `
      <span
        class="spot-filter-icon"
        style="background:${config.color};"
      >
        <span class="material-symbols-outlined">
          ${config.icon}
        </span>
      </span>

      <span class="spot-filter-name">
        ${escapeHtml(config.name)}
      </span>

      <span class="spot-filter-count">
        0
      </span>

      <span class="spot-filter-check">
        <span class="material-symbols-outlined">
          check
        </span>
      </span>
    `;

    button.addEventListener(
      "click",
      () => {

        toggleSpotCategory(
          config.name
        );

      }
    );

    container.appendChild(button);

  });

  updateSpotFilterCounts();

}


/* =========================================================
   開催状況フィルター描画
   ========================================================= */

function renderSpotStatusFilters() {

  const container =
    document.getElementById(
      "spotStatusFilters"
    );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  SPOT_STATUS_CONFIG.forEach(config => {

    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      "spot-filter-button";

    const isActive =
      spotDisplayFilterState.statuses.has(
        config.name
      );

    if (isActive) {
      button.classList.add("is-active");
    }

    button.dataset.status =
      config.name;

    button.innerHTML = `
      <span
        class="spot-filter-icon"
        style="background:${config.color};"
      >
        <span class="material-symbols-outlined">
          ${config.icon}
        </span>
      </span>

      <span class="spot-filter-name">
        ${escapeHtml(config.name)}
      </span>

      <span class="spot-filter-count">
        0
      </span>

      <span class="spot-filter-check">
        <span class="material-symbols-outlined">
          check
        </span>
      </span>
    `;

    button.addEventListener(
      "click",
      () => {

        toggleSpotStatus(
          config.name
        );

      }
    );

    container.appendChild(button);

  });

  updateSpotFilterCounts();

}


/* =========================================================
   カテゴリON/OFF
   ========================================================= */

function toggleSpotCategory(categoryName) {

  if (
    spotDisplayFilterState.categories.has(
      categoryName
    )
  ) {

    spotDisplayFilterState.categories.delete(
      categoryName
    );

  } else {

    spotDisplayFilterState.categories.add(
      categoryName
    );

  }

  applySpotDisplayFilters();

}


/* =========================================================
   開催状況ON/OFF
   ========================================================= */

function toggleSpotStatus(statusName) {

  if (
    spotDisplayFilterState.statuses.has(
      statusName
    )
  ) {

    spotDisplayFilterState.statuses.delete(
      statusName
    );

  } else {

    spotDisplayFilterState.statuses.add(
      statusName
    );

  }

  applySpotDisplayFilters();

}


/* =========================================================
   フィルター件数更新
   ========================================================= */

function updateSpotFilterCounts() {

  /*
   * カテゴリ件数
   */
  document
    .querySelectorAll(
      "#spotCategoryFilters .spot-filter-button"
    )
    .forEach(button => {

      const categoryName =
        button.dataset.category;

      const count =
        getCategorySpotCount(
          categoryName
        );

      const countElement =
        button.querySelector(
          ".spot-filter-count"
        );

      if (countElement) {

        countElement.textContent =
          count.toLocaleString("ja-JP");

      }

      button.classList.toggle(
        "is-active",
        spotDisplayFilterState.categories.has(
          categoryName
        )
      );

    });


  /*
   * 開催状況件数
   */
  document
    .querySelectorAll(
      "#spotStatusFilters .spot-filter-button"
    )
    .forEach(button => {

      const statusName =
        button.dataset.status;

      const count =
        getStatusSpotCount(
          statusName
        );

      const countElement =
        button.querySelector(
          ".spot-filter-count"
        );

      if (countElement) {

        countElement.textContent =
          count.toLocaleString("ja-JP");

      }

      button.classList.toggle(
        "is-active",
        spotDisplayFilterState.statuses.has(
          statusName
        )
      );

    });


  /*
   * 最上部の
   *
   * ○○スポット 表示中
   *
   * も更新
   */
  updateDisplayedSpotCount();

}


/* =========================================================
   マーカーへのフィルター適用
   ========================================================= */

function applySpotDisplayFilters() {

  if (!Array.isArray(markers)) {
    return;
  }


  /*
   * 各スポットについて表示 / 非表示を判定。
   *
   * 1スポットにつきマーカーは1個なので、
   * 開催前と開催中の両方に該当していても
   * マーカーが二重になることはない。
   */
  markers.forEach(obj => {

    if (!obj || !obj.marker) {
      return;
    }

    const shouldDisplay =
      shouldDisplaySpot(obj.data);

    try {

      if (shouldDisplay) {

        if (!map.hasLayer(obj.marker)) {

          obj.marker.addTo(map);

        }

      } else {

        if (map.hasLayer(obj.marker)) {

          map.removeLayer(obj.marker);

        }

      }

    } catch (error) {

      console.warn(
        "スポット表示切り替えエラー:",
        error
      );

    }

  });


  /*
   * 件数をリアルタイム更新
   */
  updateSpotFilterCounts();

}


/* =========================================================
   「さらにフィルター」
   ========================================================= */

function initSpotFilterMoreButton() {

  const button =
    document.getElementById(
      "spotStatusToggleButton"
    );

  const area =
    document.getElementById(
      "spotStatusFilterArea"
    );

  if (!button || !area) {
    return;
  }

  button.addEventListener(
    "click",
    () => {

      const willOpen =
        area.hidden;

      area.hidden =
        !willOpen;

      button.setAttribute(
        "aria-expanded",
        String(willOpen)
      );

    }
  );

}

/* =========================================================
   スポット表示管理パネル 開閉
   ========================================================= */

function initSpotFilterPanelToggle() {

  const panel =
    document.getElementById(
      "spotFilterPanel"
    );

  const toggle =
    document.getElementById(
      "spotFilterPanelToggle"
    );

  if (!panel || !toggle) {
    return;
  }


  /*
   * ---------------------------------------------------------
   * 初期状態
   * ---------------------------------------------------------
   *
   * スマホ：
   *   HTML描画時点から is-collapsed が付いているため閉じる
   *
   * PC：
   *   CSS側で開いた状態にする
   */
  const isMobile =
    window.innerWidth <= 768;


  /*
   * PCでは初期状態を開く。
   */
  if (!isMobile) {

    panel.classList.remove(
      "is-collapsed"
    );

    panel.classList.remove(
      "is-panel-user-collapsed"
    );

  }


  updateSpotFilterPanelToggleUI();


  /* =======================================================
     開閉ボタン
     ======================================================= */

  toggle.addEventListener(
    "click",
    () => {

      const collapsed =
        panel.classList.contains(
          "is-collapsed"
        );


      if (collapsed) {

        /*
         * 開く
         */
        panel.classList.remove(
          "is-collapsed"
        );

        panel.classList.remove(
          "is-panel-user-collapsed"
        );

      } else {

        /*
         * 閉じる
         */
        panel.classList.add(
          "is-collapsed"
        );

        panel.classList.add(
          "is-panel-user-collapsed"
        );

      }


      updateSpotFilterPanelToggleUI();

    }
  );


  /* =======================================================
     画面サイズ変更
     ======================================================= */

  let previousIsMobile =
    isMobile;


  window.addEventListener(
    "resize",
    () => {

      const currentIsMobile =
        window.innerWidth <= 768;


      /*
       * PC ⇔ スマホの境界を
       * 実際にまたいだ場合だけ処理。
       */
      if (
        currentIsMobile ===
        previousIsMobile
      ) {
        return;
      }


      if (currentIsMobile) {

        /*
         * PC → スマホ
         *
         * スマホでは初期状態を閉じる。
         */
        panel.classList.add(
          "is-collapsed"
        );

        panel.classList.remove(
          "is-panel-user-collapsed"
        );

      } else {

        /*
         * スマホ → PC
         *
         * PCでは初期状態を開く。
         */
        panel.classList.remove(
          "is-collapsed"
        );

        panel.classList.remove(
          "is-panel-user-collapsed"
        );

      }


      updateSpotFilterPanelToggleUI();


      previousIsMobile =
        currentIsMobile;

    }
  );

}


/* =========================================================
   開閉ボタン表示更新
   ========================================================= */

function updateSpotFilterPanelToggleUI() {

  const panel =
    document.getElementById(
      "spotFilterPanel"
    );

  const toggle =
    document.getElementById(
      "spotFilterPanelToggle"
    );

  if (!panel || !toggle) {
    return;
  }


  const collapsed =
    panel.classList.contains(
      "is-collapsed"
    );


  const icon =
    toggle.querySelector(
      ".material-symbols-outlined"
    );


  if (icon) {

    icon.textContent =
      collapsed
        ? "chevron_right"
        : "chevron_left";

  }


  toggle.setAttribute(
    "aria-expanded",
    String(!collapsed)
  );


  toggle.setAttribute(
    "aria-label",
    collapsed
      ? "スポット表示管理パネルを開く"
      : "スポット表示管理パネルを閉じる"
  );

}

/* =========================================================
   フィルター管理パネル初期化
   ========================================================= */

function initSpotFilterPanel() {

  renderSpotCategoryFilters();

  renderSpotStatusFilters();

  initSpotFilterMoreButton();

  initSpotFilterPanelToggle();

  updateSpotFilterCounts();

}


// ======================================================
// スポットの代表開催状況
// ======================================================

function getPrimarySpotStatus(data) {

  const events =
    getEvents(data);

  if (!events.length) {
    return "開催中";
  }

  return events[0].status || "開催中";

}

// ======================================================
// 初回読み込み
// ======================================================

loadSpotData()
  .catch(error => {

    console.error(
      "CSV読み込みエラー:",
      error
    );

  });
   
// ======================================================
// 詳細パネル
// ======================================================

function openDetail(data){

  window.currentDetailSpot = data;

  // URLにスポットIDを反映
  if (!isApplyingHashRoute) {

    const spotId =
      String(
        data["スポットID"] || ""
      ).trim();

    if (spotId) {
      navigateHash(spotId);
    }

  }

  const panel = document.getElementById("detailBody");
  panel.innerHTML = "";

  const topArea = document.createElement("div");

  topArea.className = "detail-top-area";

  const category = data["カテゴリ"] || "";
  const placeName = data["場所名"] || "";
  const address = data["住所"] || "";

  const lat = parseFloat(data["緯度"]);
  const lng = parseFloat(data["経度"]);

  const style = getCategoryStyle(category);

  // ====================================================
  // イベント情報
  // ====================================================

  const events = getEvents(data);

  // ====================================================
  // ヒーロー
  // ====================================================

  const hero = document.createElement("div");

  hero.className = "detail-hero new-detail-hero";

  const spotId = String(data["スポットID"] || "").trim();
  const isFavorite = isSpotFavorite(spotId);

  hero.innerHTML = `

    <!-- お気に入りボタン -->
    <button
      class="detail-favorite-btn ${isFavorite ? "is-favorite" : ""}"
      id="detailFavoriteButton"
      type="button"
      onclick="toggleFavorite('${escapeHtml(spotId)}')"
      aria-label="${isFavorite ? "お気に入りから削除" : "お気に入りに登録"}"
      title="${isFavorite ? "お気に入りから削除" : "お気に入りに登録"}"
    >
      <span class="material-symbols-outlined">
        favorite
      </span>
    </button>



    <!-- 閉じるボタン -->
    <button
      class="detail-close-btn"
      onclick="closeDetail()"
      aria-label="閉じる"
    >
      <span class="material-symbols-outlined">close</span>
    </button>



    <!-- カテゴリ -->
    <div
      class="category-badge"
      style="background:${escapeHtml(style.color)}"
    >
      <span class="material-symbols-outlined">
        ${escapeHtml(style.icon)}
      </span>

      ${escapeHtml(category)}
    </div>



    <!-- 場所名 -->
    <div class="detail-hero-title">
      ${escapeHtml(placeName)}
    </div>



    <!-- 住所 -->
    <div class="detail-hero-address">
      ${escapeHtml(address)}
    </div>

  `;

  topArea.appendChild(hero);


  // ====================================================
  // メイン
  // ====================================================

  const main = document.createElement("div");

  main.className = "detail-main new-detail-main";


  // ====================================================
  // スポット情報
  // イベントがある場合のみ表示
  // ====================================================

  if(events.length > 0){

    const activeCount = events.filter(
      event => event.status === "開催中"
    ).length;

    const eventSection = document.createElement("div");

    eventSection.className = "spot-event-section";


    let eventHTML = "";

    events.forEach(event => {

      eventHTML += `

        <div class="spot-event-item">

          <div class="spot-event-name">
            ${escapeHtml(event.name)}
          </div>

          <div class="spot-event-status ${getStatusClass(event.status)}">
            ${escapeHtml(event.status || "状態不明")}
          </div>

        </div>

      `;

    });


    eventSection.innerHTML = `

      <div class="spot-event-title">
        <span class="material-symbols-outlined">
          event_note
        </span>
        <span>スポット情報</span>
      </div>

      <div class="spot-event-card">

        <div class="spot-event-summary">

          イベント${events.length}件中

          <span class="event-active-count">
            ${activeCount}件開催中
          </span>

        </div>

        <div class="spot-event-list">
          ${eventHTML}
        </div>

      </div>

    `;

    topArea.appendChild(eventSection);

  }


  // ====================================================
  // アクションボタン
  // ====================================================

  const actions = document.createElement("div");

  actions.className = "detail-actions new-detail-actions";

  actions.innerHTML = `

    <!-- 経路 -->
    <button
      class="detail-btn sub"
      onclick="openRoute(${JSON.stringify(address)})"
    >
      <span class="material-symbols-outlined">
        directions_car
      </span>

      <span class="label">
        経路
      </span>
    </button>


    <!-- 共有：今後実装 -->
    <button
      class="detail-btn sub"
      onclick="futureFeature('共有')"
    >
      <span class="material-symbols-outlined">
        share
      </span>

      <span class="label">
        共有
      </span>
    </button>


    <!-- マップ拡大 -->
    <button
      class="detail-btn sub"
      onclick="goMap(${Number.isFinite(lat) ? lat : "NaN"}, ${Number.isFinite(lng) ? lng : "NaN"})"
    >
      <span class="material-symbols-outlined">
        map
      </span>

      <span class="label">
        マップ拡大
      </span>
    </button>

  `;

  topArea.appendChild(actions);


  // ====================================================
  // 現地メモ
  // ====================================================

  const memos = getLocalMemos(data);

  const memoSection = document.createElement("div");

  memoSection.className = "detail-section memo-section";


  let memoHTML = "";


  if(memos.length > 0){

    memos.forEach((memo, index) => {

      const isLatest = index === 0;

      memoHTML += `

        <div class="
          memo-item
          ${isLatest ? "memo-latest" : "memo-history"}
        ">

          <div class="memo-heading">

            ${
              isLatest
                ? `メモ${memo.number} (最新)`
                : `メモ${memo.number}`
            }

            ${
              memo.date
                ? ` - ${escapeHtml(memo.date)}`
                : ""
            }

          </div>

          <div class="memo-content">
            ${formatMemoText(memo.content)}
          </div>

        </div>

      `;

    });

  }else{

    memoHTML = `

      <div class="memo-empty">
        現地メモはまだありません。
      </div>

    `;

  }


  memoSection.innerHTML = `

    <!-- タイトルはカード外 -->
    <div class="detail-section-title memo-section-title">

      <span class="memo-title-text">

        <span class="material-symbols-outlined">
          note_stack
        </span>

        <span>
          現地メモ
        </span>

      </span>

      <button
        type="button"
        class="memo-post-small"
        onclick="openMemoPostModal()"
      >
        最新の状況を投稿する
        <span class="material-symbols-outlined">add</span>
      </button>

    </div>


    <!-- メモごとに独立したカード -->
    <div class="memo-timeline">
      ${memoHTML}
    </div>

  `;

  main.appendChild(memoSection);


  // ====================================================
  // リンク
  // ====================================================

  const urls = getRelatedUrls(data["関連URL"]);

  if(urls.length > 0){

    const linkSection = document.createElement("div");

    linkSection.className = "detail-section link-section";


    let linkHTML = "";


    urls.forEach((url, index) => {

      linkHTML += `

        <a
          class="detail-link-item"
          href="${escapeHtml(url)}"
          target="_blank"
          rel="noopener noreferrer"
        >

          <span class="detail-link-label">
            リンク${index + 1}
          </span>

          <span class="detail-link-url">
            ${escapeHtml(url)}
          </span>

          <span class="material-symbols-outlined detail-link-arrow">
            arrow_forward
          </span>

        </a>

      `;

    });


    linkSection.innerHTML = `

      <!-- リンクのタイトルはカード外 -->
      <div class="detail-section-title">

        <span class="material-symbols-outlined">
          link
        </span>

        リンク

      </div>


      <!-- リンクカード -->
      <div class="detail-links">
        ${linkHTML}
      </div>

    `;

    main.appendChild(linkSection);

  }



  // ====================================================
  // 店舗情報
  // ====================================================

  const storeXAccount =
    String(data["店舗Xアカウント"] || "").trim();

  const storeOfficialSite =
    String(data["店舗公式サイト"] || "").trim();

  if(storeXAccount || storeOfficialSite){

    const storeSection =
      document.createElement("div");

    storeSection.className =
      "detail-section store-info-section";



    let storeHTML = "";



    // --------------------------------------------------
    // Xアカウント
    // --------------------------------------------------

    if(storeXAccount){

      const accountName =
        storeXAccount.replace(/^@+/, "");

      const xUrl =
        `https://x.com/${encodeURIComponent(accountName)}`;

      storeHTML += `

        <a
          class="detail-store-item"
          href="${escapeHtml(xUrl)}"
          target="_blank"
          rel="noopener noreferrer"
        >

          <span class="detail-link-label">
            Xアカウント
          </span>

          <span class="detail-link-url">
            ${escapeHtml(storeXAccount)}
          </span>

          <span class="material-symbols-outlined detail-link-arrow">
            arrow_forward
          </span>

        </a>

      `;

    }



    // --------------------------------------------------
    // 店舗公式サイト
    // --------------------------------------------------

    if(storeOfficialSite){

      // http / https のURLのみリンクとして扱う
      if(/^https?:\/\//i.test(storeOfficialSite)){

        storeHTML += `

          <a
            class="detail-store-item"
            href="${escapeHtml(storeOfficialSite)}"
            target="_blank"
            rel="noopener noreferrer"
          >

            <span class="detail-link-label">
              公式サイト
            </span>

            <span class="detail-link-url">
              ${escapeHtml(storeOfficialSite)}
            </span>

            <span class="material-symbols-outlined detail-link-arrow">
              arrow_forward
            </span>

          </a>

        `;

      }else{

        // URL形式でない場合は、リンク化せず表示
        storeHTML += `

          <div class="detail-store-item">

            <span class="detail-link-label">
              公式サイト
            </span>

            <span class="detail-link-url">
              ${escapeHtml(storeOfficialSite)}
            </span>

          </div>

        `;

      }

    }



    storeSection.innerHTML = `

      <!-- 店舗情報のタイトル -->
      <div class="detail-section-title">

        <span class="material-symbols-outlined">
          store
        </span>

        店舗情報

      </div>



      <!-- 店舗情報カード -->
      <div class="detail-links">
        ${storeHTML}
      </div>

    `;



    main.appendChild(storeSection);

  }



  // ====================================================
  // 下部フォームボタン
  // ====================================================

  const formButtons = document.createElement("div");

  formButtons.className = "detail-form-buttons";

  formButtons.innerHTML = `

    <button
      type="button"
      class="detail-big-btn"
      onclick="openMemoPostModal()"
    >
      現地メモ 投稿
    </button>


    <button
      type="button"
      class="detail-big-btn"
      onclick="openCorrectionRequestModal()"
    >
      情報修正依頼
    </button>


    <a
        href="https://forms.gle/wabMrCpYtmnSdUiF6"
        target="_blank"
        rel="noopener noreferrer"
        class="detail-spam-report-link"
    >
        <span class="material-symbols-outlined">flag</span>
        スパムを報告する
    </a>

  `;

  main.appendChild(formButtons);


  // ====================================================
  // 下部情報
  // ====================================================

  const infoSection = document.createElement("div");

  infoSection.className = "detail-info-bottom";


  const createdDate = formatCreatedDate(
    data["新規投稿日"]
  );


  infoSection.innerHTML = `

    <div class="bottom-info-row">

      <div class="bottom-info-label">
        カテゴリ
      </div>

      <div class="bottom-info-value">
        ${escapeHtml(category)}
      </div>

    </div>


    <div class="bottom-info-row">

      <div class="bottom-info-label">
        スポット作成日
      </div>

      <div class="bottom-info-value">
        ${escapeHtml(createdDate)}
      </div>

    </div>

  `;

  main.appendChild(infoSection);


  // ====================================================
  // パネルへ追加
  // ====================================================
   
  panel.appendChild(topArea);
  panel.appendChild(main);
   
  document
    .getElementById("detailPanel")
    .classList.add("active");

}


// ======================================================
// イベント取得
// ======================================================

function getEvents(data) {

  const eventText =
    (data["イベント名"] || "").trim();

  const manualStatusText =
    (data["手動開催状況"] || "").trim();

  const startDateText =
    (data["開始日"] || "").trim();

  const endDateText =
    (data["終了日"] || "").trim();


  // ====================================================
  // イベント名
  // ====================================================

  const eventNames =
    eventText
      ? eventText
          .split("｜")
          .map(v => v.trim())
      : [];


  // ====================================================
  // 開催状況
  // ====================================================

  const manualStatuses =
    manualStatusText
      ? manualStatusText
          .split("｜")
          .map(v => v.trim())
      : [];


  // ====================================================
  // 開始日
  // ====================================================

  const startDates =
    startDateText
      ? startDateText
          .split("｜")
          .map(v => normalizeDateOnly(v.trim()))
      : [];


  // ====================================================
  // 終了日
  // ====================================================

  const endDates =
    endDateText
      ? endDateText
          .split("｜")
          .map(v => normalizeDateOnly(v.trim()))
      : [];


  // ====================================================
  // イベントがないスポット
  // ====================================================

  if (eventNames.length === 0) {

    return [{
      name: "",
      status: "開催中",
      startDate: "",
      endDate: ""
    }];

  }


  // ====================================================
  // イベント作成
  // ====================================================

  return eventNames.map((name, index) => {

    const manualStatus =
      manualStatuses.length === 1
        ? manualStatuses[0]
        : (manualStatuses[index] || "開催中");


    const startDate =
      startDates[index] || "";


    const endDate =
      endDates[index] || "";


    let status = "";


    // 日付が両方ある場合は自動判定
    if (
      startDate &&
      endDate
    ) {

      status =
        getAutoEventStatus(
          startDate,
          endDate
        );

    } else {

      status =
        manualStatus || "開催中";

    }


    return {

      name: name,

      status: status,

      startDate: startDate,

      endDate: endDate

    };

  });

}


// ======================================================
// 自動開催状況判定
// 日本時間の日付のみを使用
// ======================================================

function getAutoEventStatus(startDate, endDate){

  const today = getJapanToday();


  if(today < startDate){

    return "開催前";

  }


  if(today > endDate){

    return "開催終了";

  }


  return "開催中";

}


// ======================================================
// 日本時間の「今日」を YYYY-MM-DD で取得
// ======================================================

function getJapanToday(){

  const formatter = new Intl.DateTimeFormat(
    "ja-JP",
    {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  );


  const parts = formatter.formatToParts(
    new Date()
  );


  const year = parts.find(
    part => part.type === "year"
  ).value;

  const month = parts.find(
    part => part.type === "month"
  ).value;

  const day = parts.find(
    part => part.type === "day"
  ).value;


  return `${year}-${month}-${day}`;

}


// ======================================================
// 日付を YYYY-MM-DD に統一
// ======================================================

function normalizeDateOnly(value){

  if(!value){
    return "";
  }


  const text =
    String(value).trim();


  const match =
    text.match(
      /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/
    );


  if(!match){
    return "";
  }


  const year =
    match[1];


  const month =
    String(match[2])
      .padStart(2, "0");


  const day =
    String(match[3])
      .padStart(2, "0");


  return `${year}-${month}-${day}`;

}


// ======================================================
// 現地メモ取得
// 「現地メモ日時-n」「現地メモ内容-n」を自動検出
// ======================================================

function getLocalMemos(data){

  const memos = [];

  Object.keys(data).forEach(key => {

    const match = key.match(
      /^現地メモ日時-(\d+)$/
    );


    if(!match){
      return;
    }


    const number = Number(match[1]);


    if(!Number.isFinite(number)){
      return;
    }


    const date = (
      data[`現地メモ日時-${number}`] || ""
    ).trim();


    const content = (
      data[`現地メモ内容-${number}`] || ""
    ).trim();


    // 日時・内容のどちらか片方でも存在すれば
    // メモとして扱う
    if(date !== "" || content !== ""){

      memos.push({
        number: number,
        date: date,
        content: content
      });

    }

  });


  // 番号が大きいものほど新しい
  memos.sort(
    (a, b) => b.number - a.number
  );


  return memos;

}


// ======================================================
// 関連URLを取得
// ======================================================

function getRelatedUrls(value){

  if(!value){
    return [];
  }


  return String(value)
    .split("｜")
    .map(
      url => url.trim()
    )
    .filter(
      url =>
        /^https?:\/\//i.test(url)
    );

}


// ======================================================
// ステータスの色分け用クラス
// ======================================================

function getStatusClass(status){

  switch(status){

    case "開催中":
      return "status-active";

    case "開催前":
      return "status-before";

    case "開催終了":
      return "status-ended";

    default:
      return "status-unknown";

  }

}


// ======================================================
// メモ本文の表示
// 許可するHTMLタグ：<br> / <b> / </b>
// 改行にも対応
// ======================================================

function formatMemoText(text){

  if(!text){
    return "";
  }

  let result = escapeHtml(text);

  // ------------------------------------------
  // 許可するタグだけHTMLとして復元
  // ------------------------------------------

  // <br>
  result = result.replace(
    /&lt;br\s*\/?&gt;/gi,
    "<br>"
  );

  // <b>
  result = result.replace(
    /&lt;b&gt;/gi,
    "<b>"
  );

  // </b>
  result = result.replace(
    /&lt;\/b&gt;/gi,
    "</b>"
  );

  // ------------------------------------------
  // スプレッドシート上の通常の改行にも対応
  // ------------------------------------------

  result = result
    .replace(/\r\n/g, "<br>")
    .replace(/\n/g, "<br>")
    .replace(/\r/g, "<br>");

  return result;

}


// ======================================================
// HTMLエスケープ
// CSVの内容を安全に表示するために使用
// ======================================================

function escapeHtml(value){

  if(value === null || value === undefined){
    return "";
  }


  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ======================================================
// スポット作成日の表示
// YYYY/MM/DD にする
// ======================================================

function formatCreatedDate(value){

  if(!value){
    return "";
  }


  const normalized = normalizeDateOnly(value);


  if(!normalized){
    return String(value);
  }


  const [year, month, day] =
    normalized.split("-");


  return `${year}/${month}/${day}`;

}


// ======================================================
// 詳細パネルを閉じる
// ======================================================

function closeDetail(){

  document
    .getElementById("detailPanel")
    .classList.remove("active");

  if (!isApplyingHashRoute) {
    navigateHash("");
  }

}


// ======================================================
// お気に入り
// ======================================================

const FAVORITES_STORAGE_KEY = "dzlSpotFavorites";



// ======================================================
// お気に入り一覧を取得
// ======================================================

function getFavoriteSpotIds(){

  try{

    const saved =
      localStorage.getItem(
        FAVORITES_STORAGE_KEY
      );

    if(!saved){
      return [];
    }

    const parsed =
      JSON.parse(saved);

    if(!Array.isArray(parsed)){
      return [];
    }

    return parsed
      .map(id => String(id))
      .filter(id => id !== "");

  }catch(error){

    console.warn(
      "お気に入りデータの読み込みに失敗しました",
      error
    );

    return [];

  }

}



// ======================================================
// お気に入り一覧を保存
// ======================================================

function saveFavoriteSpotIds(ids){

  try{

    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(ids)
    );

  }catch(error){

    console.warn(
      "お気に入りデータの保存に失敗しました",
      error
    );

  }

}



// ======================================================
// お気に入り登録済みか確認
// ======================================================

function isSpotFavorite(spotId){

  if(!spotId){
    return false;
  }

  const favorites =
    getFavoriteSpotIds();

  return favorites.includes(
    String(spotId)
  );

}



// ======================================================
// お気に入り登録・解除
// ======================================================

function toggleFavorite(spotId){

  if(!spotId){
    return;
  }

  const id =
    String(spotId);

  const favorites =
    getFavoriteSpotIds();

  const index =
    favorites.indexOf(id);

  let isFavorite;

  if(index === -1){

    // ------------------------------------------
    // お気に入り登録
    // ------------------------------------------

    favorites.push(id);

    isFavorite = true;

  }else{

    // ------------------------------------------
    // お気に入り解除
    // ------------------------------------------

    favorites.splice(
      index,
      1
    );

    isFavorite = false;

  }

  saveFavoriteSpotIds(
    favorites
  );



  // ------------------------------------------
  // ボタンの表示を更新
  // ------------------------------------------

  const button =
    document.getElementById(
      "detailFavoriteButton"
    );

  if(button){

    button.classList.toggle(
      "is-favorite",
      isFavorite
    );

    button.setAttribute(
      "aria-label",
      isFavorite
        ? "お気に入りから削除"
        : "お気に入りに登録"
    );

    button.setAttribute(
      "title",
      isFavorite
        ? "お気に入りから削除"
        : "お気に入りに登録"
    );

  }

}

// ======================================================
// お気に入りリストを開く
// ======================================================

function openFavoriteModal(){

  closeAllBottomNavModals();

  const modal =
    document.getElementById("favoriteModal");

  if(!modal){
    return;
  }

  renderFavoriteList();

  modal.classList.add("active");

}

// ======================================================
// お気に入りリストを閉じる
// ======================================================

function closeFavoriteModal(event){

  if(
    event &&
    event.target !== event.currentTarget
  ){
    return;
  }

  const modal =
    document.getElementById("favoriteModal");

  if(!modal){
    return;
  }

  modal.classList.remove("active");

}


// ======================================================
// お気に入りリストを表示
// ======================================================

function renderFavoriteList(){

  const container =
    document.getElementById(
      "favoriteListContainer"
    );

  if(!container){
    return;
  }


  const favoriteIds =
    getFavoriteSpotIds();


  // ----------------------------------------------------
  // お気に入り0件
  // ----------------------------------------------------

  if(favoriteIds.length === 0){

    container.innerHTML = `

      <div class="favorite-empty">

        <div class="favorite-empty-icon">
          <span class="material-symbols-outlined">
            favorite_border
          </span>
        </div>

        <div class="favorite-empty-count">
          お気に入り 0件
        </div>

        <div class="favorite-empty-message">
          詳細パネル右上のハートアイコンから追加できます。
        </div>

      </div>

    `;

    return;

  }


  // ----------------------------------------------------
  // dataListからお気に入りスポットを取得
  // ----------------------------------------------------

  const favoriteSpots = [];

  favoriteIds.forEach(id => {

    const spot =
      Array.isArray(dataList)
        ? dataList.find(
            item =>
              String(
                item["スポットID"] || ""
              ).trim() === id
          )
        : null;

    if(spot){
      favoriteSpots.push(spot);
    }

  });


  // ----------------------------------------------------
  // 登録済みIDがあるが、
  // 現在のデータに存在しない場合
  // ----------------------------------------------------

  if(favoriteSpots.length === 0){

    container.innerHTML = `

      <div class="favorite-empty">

        <div class="favorite-empty-icon">
          <span class="material-symbols-outlined">
            favorite_border
          </span>
        </div>

        <div class="favorite-empty-count">
          お気に入り 0件
        </div>

        <div class="favorite-empty-message">
          詳細パネル右上のハートアイコンから追加できます。
        </div>

      </div>

    `;

    return;

  }


  // ----------------------------------------------------
  // 現在のマップ中心から近い順に並べ替え
  // ----------------------------------------------------

  favoriteSpots.sort((a, b) => {

    const distanceA =
      getDistanceFromMapCenter(a);

    const distanceB =
      getDistanceFromMapCenter(b);

    return distanceA - distanceB;

  });


  // ----------------------------------------------------
  // カード生成
  // ----------------------------------------------------

  container.innerHTML = "";


  favoriteSpots.forEach(spot => {

    const spotId =
      String(
        spot["スポットID"] || ""
      ).trim();

    const category =
      String(
        spot["カテゴリ"] || ""
      );

    const placeName =
      String(
        spot["場所名"] || "名称未設定"
      );

    const address =
      String(
        spot["住所"] || ""
      );

    const style =
      getCategoryStyle(category);

    const events =
      getEvents(spot);


    // ------------------------------------------
    // イベントHTML
    // ------------------------------------------

    let eventHTML = "";


    if(events.length > 0){

      eventHTML =
        events
          .map(event => {

            const status =
              event.status || "状態不明";

            return `

              <div class="favorite-spot-event">

                <div class="favorite-spot-event-name">
                  ${escapeHtml(event.name || "イベント名なし")}
                </div>

                <div
                  class="favorite-spot-event-status ${getStatusClass(status)}"
                >
                  ${escapeHtml(status)}
                </div>

              </div>

            `;

          })
          .join("");

    }


    // ------------------------------------------
    // カード
    // ------------------------------------------

    const card =
      document.createElement("div");

    card.className =
      "favorite-spot-card";


    card.innerHTML = `

      <!-- カテゴリ -->
      <div
        class="favorite-spot-category"
        style="background:${escapeHtml(style.color)}"
      >
        <span class="material-symbols-outlined">
          ${escapeHtml(style.icon)}
        </span>

        ${escapeHtml(category)}
      </div>


      <!-- 場所名 -->
      <div class="favorite-spot-name">
        ${escapeHtml(placeName)}
      </div>


      <!-- 住所 -->
      ${
        address
          ? `
            <div class="favorite-spot-address">
              ${escapeHtml(address)}
            </div>
          `
          : ""
      }


      <!-- イベント -->
      ${
        eventHTML
          ? `
            <div class="favorite-spot-events">
              ${eventHTML}
            </div>
          `
          : ""
      }


      <!-- お気に入り解除 -->
      <button
        type="button"
        class="favorite-spot-remove"
        aria-label="お気に入りから削除"
        title="お気に入りから削除"
      >
        <span class="material-symbols-outlined">
          delete
        </span>
      </button>


      <!-- 詳細を開く矢印 -->
      <span class="favorite-spot-arrow">
        <span class="material-symbols-outlined">
          chevron_right
        </span>
      </span>

    `;


    // ------------------------------------------
    // 削除ボタン
    // ------------------------------------------

    const removeButton =
      card.querySelector(
        ".favorite-spot-remove"
      );


    if(removeButton){

      removeButton.addEventListener(
        "click",
        function(event){

          event.stopPropagation();

          removeFavoriteFromList(
            spotId
          );

        }
      );

    }


    // ------------------------------------------
    // カードクリック
    // ------------------------------------------

    card.addEventListener(
      "click",
      function(){

        openFavoriteSpot(
          spot
        );

      }
    );


    container.appendChild(card);

  });

}


// ======================================================
// お気に入りリストから削除
// ======================================================

function removeFavoriteFromList(spotId){

  if(!spotId){
    return;
  }


  const id =
    String(spotId);


  const favorites =
    getFavoriteSpotIds();


  const filtered =
    favorites.filter(
      favoriteId =>
        favoriteId !== id
    );


  saveFavoriteSpotIds(
    filtered
  );


  // ------------------------------------------
  // リストを即座に再読み込み
  // ------------------------------------------

  renderFavoriteList();


  // ------------------------------------------
  // 詳細パネルが開いている場合、
  // そのハートも更新
  // ------------------------------------------

  const detailButton =
    document.getElementById(
      "detailFavoriteButton"
    );


  if(detailButton){

    detailButton.classList.remove(
      "is-favorite"
    );

    detailButton.setAttribute(
      "aria-label",
      "お気に入りに登録"
    );

    detailButton.setAttribute(
      "title",
      "お気に入りに登録"
    );

  }

}


// ======================================================
// お気に入りスポットの詳細を開く
// ======================================================

function openFavoriteSpot(spot){

  if(!spot){
    return;
  }


  const lat =
    parseFloat(
      spot["緯度"]
    );

  const lng =
    parseFloat(
      spot["経度"]
    );


  if(
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ){

    console.warn(
      "お気に入りスポットの緯度・経度が正しくありません",
      spot
    );

    return;

  }


  // ------------------------------------------
  // お気に入りモーダルを閉じる
  // ------------------------------------------

  closeFavoriteModal();


  // ------------------------------------------
  // 地図をスポットへ移動
  // ------------------------------------------

  if(
    typeof map !== "undefined" &&
    map
  ){

    map.setView(
      [lat, lng],
      17
    );

  }


  // ------------------------------------------
  // 詳細パネルを開く
  // ------------------------------------------

  setTimeout(
    () => openDetail(spot),
    100
  );

}


// ======================================================
// マップ拡大
// ======================================================

function goMap(lat, lng){

  if(
    !Number.isFinite(Number(lat)) ||
    !Number.isFinite(Number(lng))
  ){
    return;
  }


  // 詳細パネルを閉じる
  closeDetail();


  // 地図をその場所へ移動
  map.setView(
    [
      Number(lat),
      Number(lng)
    ],
    17
  );

}


// ======================================================
// Google Maps 経路検索
// ======================================================

function openRoute(address){

  if(!address){

    alert("住所が登録されていません");

    return;

  }


  const encoded =
    encodeURIComponent(String(address));


  const url =
    `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;


  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );

}


// ======================================================
// 今後実装するボタン用
// ======================================================

function futureFeature(featureName){

  // ================================================
  // TODO:
  // ここに今後、共有機能を実装する
  // ================================================

  console.log(
    `${featureName}：今後実装予定です。`
  );

}

function openSearchModal(){
  document.getElementById("searchModal").classList.add("active");

  const input = document.getElementById("modalSearchInput");
  input.value = "";

  // 少し遅らせて発火（DOM & 状態安定）
  setTimeout(() => {
    input.dispatchEvent(new Event("input"));
  }, 50);
}

function closeSearchModal(e){
  if(!e || e.target === e.currentTarget){
    document.getElementById("searchModal").classList.remove("active");
  }
}

function openEditForm(){
  window.open("https://forms.gle/ontjkVvF4kRG2dmp7", "_blank");
}

function getCategoryStyle(category){

  switch(category){
    case "グッズ": return { color:"#C80000", icon:"local_mall" };
    case "飲食": return { color:"#733C93", icon:"restaurant" };
    case "コンビニ": return { color:"#FCC700", icon:"store" };
    case "カプセルトイ": return { color:"#54C3F1", icon:"stroke_partial" };
    case "聖地": return { color:"#EB6D9A", icon:"attractions" };
    default: return { color:"black", icon:"place" };
  }

}

function openForm(){

  openPostModal();

}

function openInfoForm(){

  closeModalForce();

  openPostModal();

}

// =======================
// ③ 現在地
// =======================
function goCurrentLocation(){

  if(!navigator.geolocation){
    alert("位置情報が使えません");
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    map.setView([lat, lng], 15);

    // 既存の現在地マーカー消す（あれば）
    if(window.currentMarker){
      map.removeLayer(window.currentMarker);
    }

    // カスタムピン
    const icon = L.divIcon({
      html: `<div class="current-dot"></div>`,
      className: "",
      iconSize: [18,18],
      iconAnchor: [9,9]
    });

    window.currentMarker = L.marker([lat, lng], {
      icon: icon
    }).addTo(map);

  }, () => {
    alert(`位置情報の取得に失敗しました。
  位置情報へのアクセスを許可してください。`);
  });

}

let currentSearchType = "place";

// タイプ切替
const select = document.getElementById("searchTypeSelect");

select.addEventListener("change", () => {
  currentSearchType = select.value;

  // ★検索を即更新
  document.getElementById("modalSearchInput")
    .dispatchEvent(new Event("input"));
});

// 検索処理
document.addEventListener("DOMContentLoaded", ()=>{

  initSpotFilterPanel();
  initSearchNew();
  initCorrectionRequest();
  // 投稿履歴
  renderPostHistory();

  const input = document.getElementById("modalSearchInput");
  const resultBox = document.getElementById("modalSearchResult");
  const header = document.getElementById("searchResultHeader");

  input.addEventListener("input", function(){

    const keyword = this.value.toLowerCase();
    resultBox.innerHTML = "";
    header.style.display = "block";

    let results = [];

    // =========================
    // ★ 分岐：空 or 検索あり
    // =========================

    if(!keyword){
      // 🔵 入力なし → 全件対象
      results = [...markers];

      header.textContent = "検索結果（現在地から近い順で表示）：";

    }else{
      // 🔵 入力あり → フィルタ
      results = markers.filter(obj => {

        const data = obj.data;

        if(currentSearchType === "place"){
          return data["場所名"]?.toLowerCase().includes(keyword);
        }

        if(currentSearchType === "address"){
          return data["住所"]?.toLowerCase().includes(keyword);
        }

        if(currentSearchType === "event"){
          return data["イベント名"]?.toLowerCase().includes(keyword);
        }

      });

      header.textContent = "検索結果：";
    }

    // =========================
    // ★ 距離ソート
    // =========================
    if(navigator.geolocation){

      navigator.geolocation.getCurrentPosition(pos => {

        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        results = results.map(obj => {

          const lat = parseFloat(obj.data["緯度"]);
          const lng = parseFloat(obj.data["経度"]);

          const dist = map.distance([userLat, userLng], [lat, lng]);

          return { ...obj, dist };

        }).sort((a,b)=> a.dist - b.dist);

        renderResults(results);

      }, () => {
        renderResults(results);
      });

    } else {
      renderResults(results);
    }

  });


  // =========================
  // ★ 描画関数（分離して見やすく）
  // =========================
  function renderResults(results){

    const resultBox = document.getElementById("modalSearchResult");

    // ★ 追加：0件チェック
    if(results.length === 0){
      resultBox.innerHTML = `
        <div style="
          padding:20px;
          text-align:center;
          color:#666;
          font-size:14px;
          line-height:1.6;
        ">
          該当スポットが見つかりませんでした<br>
          ワードや検索対象を変えてお試しください
        </div>
      `;
      return; // ← ここ重要（以降の処理止める）
    }

    const max = 50;

    results.slice(0, max).forEach(obj => {

      const item = obj.data;

      const div = document.createElement("div");
      div.className = "search-item";

      div.innerHTML = `
        <strong>${escapeHtml(item["場所名"] || "名称なし")}</strong>

        <div class="search-sub">

          ${item["住所"] ? `
            <div class="search-row">
              <span class="material-symbols-outlined">location_on</span>
              <div>${escapeHtml(item["住所"])}</div>
            </div>
          ` : ""}

          ${item["イベント名"] ? `
            <div class="search-row">
              <span class="material-symbols-outlined">event</span>
              <div>${escapeHtml(item["イベント名"])}</div>
            </div>
          ` : ""}

        </div>
      `;

      div.onclick = () => {
        const lat = parseFloat(item["緯度"]);
        const lng = parseFloat(item["経度"]);

        map.setView([lat, lng], 15);
        closeSearchModal();
      };

      resultBox.appendChild(div);

    });

  }

});

function updateSearchLabel(){

  const label = document.getElementById("searchTypeLabel");

  let text = "スポット名";

  if(currentSearchType === "address") text = "住所";
  if(currentSearchType === "event") text = "イベント名";

  label.textContent = "検索対象：" + text;
}


// ======================================================
// 新規スポット投稿フォーム
// ======================================================

let postPickerMap = null;
let postPickerMarker = null;

let selectedPostLat = null;
let selectedPostLng = null;

let postGeocodeRequestId = 0;


// ======================================================
// 投稿者用ブラウザID
// ======================================================

function getPostClientId(){

  try {

    let id = localStorage.getItem(
      POST_CLIENT_ID_KEY
    );

    if(!id){

      id =
        "client-" +
        crypto.randomUUID();

      localStorage.setItem(
        POST_CLIENT_ID_KEY,
        id
      );

    }

    return id;

  } catch(error){

    return "client-session";

  }

}


// ======================================================
// GASへPOST
// ======================================================

async function postToGas(payload){

  if(
    !GAS_WEB_APP_URL ||
    GAS_WEB_APP_URL.includes("ここにデプロイID")
  ){

    throw new Error(
      "GAS WebアプリURLが設定されていません。"
    );

  }


  try {

    const response = await fetch(
      GAS_WEB_APP_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body: JSON.stringify(payload)
      }
    );


    // ----------------------------------------------
    // HTTP通信自体が失敗
    // ----------------------------------------------

    if(!response.ok){

      throw new Error(
        "GASとの通信に失敗しました。"
      );

    }


    // ----------------------------------------------
    // JSONとして読み込み
    // ----------------------------------------------

    let result;

    try {

      result =
        await response.json();

    } catch(error){

      throw new Error(
        "GASから正しい応答を受け取れませんでした。"
      );

    }


    // ----------------------------------------------
    // GASが想定外の形式を返した場合
    // ----------------------------------------------

    if(
      !result ||
      typeof result !== "object"
    ){

      throw new Error(
        "GASから正しい応答を受け取れませんでした。"
      );

    }


    return result;

  } catch(error){

    console.error(
      "GAS通信エラー:",
      error
    );


    // ----------------------------------------------
    // ユーザーには内部エラーの内容を見せない
    // ----------------------------------------------

    if(
      error &&
      typeof error.message === "string" &&
      (
        error.message.includes("ドズル社スポット GAS") ||
        error.message.includes("is working")
      )
    ){

      throw new Error(
        "GASとの通信に失敗しました。時間をおいてもう一度お試しください。"
      );

    }


    throw error;

  }

}

// ======================================================
// 投稿フォームを開く
// ======================================================

function openPostModal(){

  closeAllBottomNavModals()

  const modal =
    document.getElementById("postModal");

  modal.classList.add("active");


  // 保存履歴があれば復元
  const restored =
    restorePostFormDraft();


  // 履歴がなければ新規フォーム
  if(!restored){

    resetPostForm();

  }

}


// ======================================================
// 投稿フォームを閉じる
// ======================================================

function closePostModal(e){

  if(
    !e ||
    e.target === e.currentTarget
  ){

    document
      .getElementById("postModal")
      .classList.remove("active");

  }

}


// ======================================================
// 投稿フォームリセット
// ======================================================

function resetPostForm(){

  const form =
    document.getElementById("spotPostForm");

  if(form){
    form.reset();
  }


  // ------------------------------------------
  // 位置情報をリセット
  // ------------------------------------------

  selectedPostLat = null;
  selectedPostLng = null;

  // 進行中の住所・座標取得リクエストを無効化
  postGeocodeRequestId++;


  // ------------------------------------------
  // 投稿マップの古いピンを削除
  // ------------------------------------------

  if(
    postPickerMarker &&
    postPickerMap
  ){

    postPickerMap.removeLayer(
      postPickerMarker
    );

  }

  postPickerMarker = null;


  // ------------------------------------------
  // イベント・関連URLをリセット
  // ------------------------------------------

  resetPostEvents();
  resetPostRelatedUrls();


  // ------------------------------------------
  // 場所表示をリセット
  // ------------------------------------------

  const locationSummary =
    document.getElementById(
      "postLocationSummary"
    );

  if(locationSummary){

    locationSummary.textContent =
      "マップ上でスポットの場所を選択してください";

    locationSummary.classList.remove(
      "selected"
    );

  }


  const coordinate =
    document.getElementById(
      "postMapCoordinate"
    );

  if(coordinate){

    coordinate.textContent =
      "場所が選択されていません";

  }

  // ------------------------------------------
  // 住所関連表示をリセット
  // ------------------------------------------

  const address =
    document.getElementById(
      "postAddress"
    );

  if(address){

    address.textContent = "";

  }


  const addressNote =
    document.getElementById(
      "postAddressNote"
    );

  if(addressNote){

    addressNote.textContent =
      "マップで場所を選択すると、住所が自動入力されます。";

  }


  // ------------------------------------------
  // 送信ボタンをリセット
  // ------------------------------------------

  const submitButton =
    document.getElementById(
      "postSubmitButton"
    );

  if(submitButton){

    submitButton.disabled = false;

  }


  // ------------------------------------------
  // 確認チェックのエラー表示を解除
  // ------------------------------------------

  const confirmBox =
    document.querySelector(
      ".post-confirm-box"
    );

  if(confirmBox){

    confirmBox.classList.remove(
      "confirm-error"
    );

  }

  // ------------------------------------------
  // 住所から場所を取得モーダルをリセット
  // ------------------------------------------

  const addressInput =
    document.getElementById(
      "postAddressInput"
    );

  if(addressInput){

    addressInput.value = "";

  }


  const addressGeocodeResult =
    document.getElementById(
      "postAddressGeocodeResult"
    );

  if(addressGeocodeResult){

    addressGeocodeResult.textContent = "";

    addressGeocodeResult.className =
      "post-address-geocode-result";

  }


  const addressGeocodeButton =
    document.getElementById(
      "postAddressGeocodeButton"
    );

  if(addressGeocodeButton){

    addressGeocodeButton.disabled = false;

  }


  // 住所取得モーダル自体も閉じておく
  const addressModal =
    document.getElementById(
      "postAddressModal"
    );

  if(addressModal){

    addressModal.classList.remove(
      "active"
    );

  }

  // ------------------------------------------
  // 状態表示をリセット
  // ------------------------------------------

  clearPostFormStatus();

}


// ======================================================
// フォーム状態表示
// ======================================================

function setPostFormStatus(
  message,
  type = ""
){

  const box =
    document.getElementById("postFormStatus");

  box.textContent = message;

  box.className =
    "post-form-status";

  if(type){
    box.classList.add(type);
  }

}


function clearPostFormStatus(){

  const box =
    document.getElementById("postFormStatus");

  box.textContent = "";

  box.className =
    "post-form-status";

}


// ======================================================
// 投稿マップを開く
// ======================================================

function openPostMapPicker(){

  const modal =
    document.getElementById(
      "postMapPickerModal"
    );

  modal.classList.add("active");


  // 初回だけLeafletを生成
  if(!postPickerMap){

    postPickerMap =
      L.map("postPickerMap", {
        zoomControl: true
      });


    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          "&copy; OpenStreetMap"
      }
    ).addTo(postPickerMap);


    postPickerMap.on(
      "click",
      handlePostMapClick
    );

  }


  // 現在のメインマップ位置を基準にする
  const center =
    map.getCenter();


  postPickerMap.setView(
    [
      center.lat,
      center.lng
    ],
    Math.max(map.getZoom(), 10)
  );


  // 既に選択済みなら表示
  if(
    Number.isFinite(selectedPostLat) &&
    Number.isFinite(selectedPostLng)
  ){

    setPostPickerMarker(
      selectedPostLat,
      selectedPostLng
    );


    const coordinate =
      document.getElementById(
        "postMapCoordinate"
      );

    if(coordinate){

      coordinate.textContent =
        `緯度 ${selectedPostLat.toFixed(6)} / 経度 ${selectedPostLng.toFixed(6)}`;

    }


    postPickerMap.setView(
      [
        selectedPostLat,
        selectedPostLng
      ],
      16
    );

  }


  // 非表示→表示後のLeafletサイズ問題対策
  setTimeout(() => {

    postPickerMap.invalidateSize();

  }, 100);

}


// ======================================================
// 投稿マップを閉じる
// ======================================================

function closePostMapPicker(e){

  if(
    !e ||
    e.target === e.currentTarget
  ){

    document
      .getElementById(
        "postMapPickerModal"
      )
      .classList.remove("active");

  }

}


// ======================================================
// マップクリック
// ======================================================

function handlePostMapClick(e){

  const lat = e.latlng.lat;
  const lng = e.latlng.lng;


  setPostPickerMarker(
    lat,
    lng
  );


  updateSelectedPostLocation(
    lat,
    lng
  );

}


// ======================================================
// 投稿マップのマーカー
// ======================================================

function setPostPickerMarker(
  lat,
  lng
){

  if(postPickerMarker){

    postPickerMarker.setLatLng(
      [lat, lng]
    );

  }else{

    postPickerMarker =
      L.marker(
        [lat, lng]
      ).addTo(postPickerMap);

  }

}


// ======================================================
// 選択座標を更新
// ======================================================

function updateSelectedPostLocation(
  lat,
  lng
){

  selectedPostLat = lat;
  selectedPostLng = lng;


  // ----------------------------------------------
  // 投稿フォーム側の選択地点表示
  // ----------------------------------------------

  const summary =
    document.getElementById(
      "postLocationSummary"
    );

  if(summary){

    summary.textContent =
      `選択地点：${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    summary.classList.add(
      "selected"
    );

  }


  // ----------------------------------------------
  // マップ選択画面の座標表示
  // ----------------------------------------------

  const coordinate =
    document.getElementById(
      "postMapCoordinate"
    );

  if(coordinate){

    coordinate.textContent =
      `緯度 ${lat.toFixed(6)} / 経度 ${lng.toFixed(6)}`;

  }


  // ----------------------------------------------
  // マップで選択した地点から住所を自動取得
  // ----------------------------------------------

  requestPostAddress(
    lat,
    lng
  );


  savePostFormDraft();

}


// ======================================================
// 選択地点を確定
// ======================================================

function confirmPostMapLocation(){

  if(
    !Number.isFinite(selectedPostLat) ||
    !Number.isFinite(selectedPostLng)
  ){

    alert(
      "マップ上でスポットの場所を選択してください。"
    );

    return;

  }


  document
    .getElementById(
      "postMapPickerModal"
    )
    .classList.remove("active");

}


// ======================================================
// GASで住所を取得
// ======================================================

async function requestPostAddress(
  lat,
  lng
){

  const requestId =
    ++postGeocodeRequestId;


  const note =
    document.getElementById(
      "postAddressNote"
    );


  if(note){

    note.textContent =
      "住所を取得しています…";

  }


  try {

    const result =
      await postToGas({

        action: "geocode",

        lat: lat,

        lng: lng

      });


    // 古いリクエストなら無視
    if(
      requestId !== postGeocodeRequestId
    ){

      return;

    }


    if(
      result &&
      result.success &&
      result.data &&
      result.data.address
    ){

      const address =
        document.getElementById(
          "postAddress"
        );


      if(address){

        address.textContent =
          result.data.address;

      }


      if(note){

        note.textContent =
          "住所を自動取得しました。";

      }


      savePostFormDraft();


    }else{

      if(note){

        note.textContent =
          "住所を自動取得できませんでした。時間をおいてもう一度お試しください。";

      }

    }


  } catch(error){

    console.warn(
      "住所自動取得エラー:",
      error
    );


    if(note){

      note.textContent =
        "住所を自動取得できませんでした。時間をおいてもう一度お試しください。";

    }

  }

}


// ======================================================
// 住所入力モーダル
// ======================================================

function openPostAddressModal() {

  const modal =
    document.getElementById(
      "postAddressModal"
    );

  if (!modal) return;

  modal.classList.add("active");


  const input =
    document.getElementById(
      "postAddressInput"
    );

  if (input) {

    setTimeout(() => {

      input.focus();

    }, 50);

  }

}


// ======================================================
// 住所入力モーダルを閉じる
// ======================================================

function closePostAddressModal(e) {

  if (
    !e ||
    e.target === e.currentTarget
  ) {

    const modal =
      document.getElementById(
        "postAddressModal"
      );

    if (modal) {
      modal.classList.remove("active");
    }

  }

}

// ======================================================
// 入力した住所から緯度・経度を取得
// ======================================================

async function requestPostAddressFromInput() {

  const input =
    document.getElementById(
      "postAddressInput"
    );

  const resultBox =
    document.getElementById(
      "postAddressGeocodeResult"
    );

  const button =
    document.getElementById(
      "postAddressGeocodeButton"
    );


  if (!input) return;


  const address =
    input.value.trim();


  // ----------------------------------------------
  // 入力チェック
  // ----------------------------------------------

  if (!address) {

    if (resultBox) {

      resultBox.textContent =
        "住所を入力してください。";

      resultBox.className =
        "post-address-geocode-result error";

    }

    input.focus();

    return;

  }


  // ----------------------------------------------
  // 処理中
  // ----------------------------------------------

  if (button) {
    button.disabled = true;
  }


  if (resultBox) {

    resultBox.textContent =
      "住所から緯度・経度を取得しています…";

    resultBox.className =
      "post-address-geocode-result loading";

  }


  try {

    const response =
      await postToGas({

        action: "geocodeAddress",

        address: address

      });


    // --------------------------------------------
    // 取得失敗
    // --------------------------------------------

    if (
      !response ||
      !response.success ||
      !response.data
    ) {

      if (resultBox) {

        resultBox.textContent =
          response?.message ||
          "住所から場所を取得できませんでした。住所を確認してもう一度お試しください。";

        resultBox.className =
          "post-address-geocode-result error";

      }

      return;

    }


    const lat =
      parseFloat(
        response.data.lat
      );

    const lng =
      parseFloat(
        response.data.lng
      );


    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {

      throw new Error(
        "取得した座標が正しくありません。"
      );

    }


    // --------------------------------------------
    // 投稿フォーム側の位置情報として設定
    // --------------------------------------------

    selectedPostLat = lat;
    selectedPostLng = lng;


    // --------------------------------------------
    // 住所を投稿フォームへ反映
    // --------------------------------------------

    const addressDisplay =
      document.getElementById(
        "postAddress"
      );

    if (addressDisplay) {

      addressDisplay.textContent =
        response.data.address ||
        address;

    }


    const addressNote =
      document.getElementById(
        "postAddressNote"
      );

    if (addressNote) {

      addressNote.textContent =
        "住所から緯度・経度を自動取得しました。上のマップから、ピンの位置を調整することを推奨します。";

    }


    // --------------------------------------------
    // 場所の概要を更新
    // --------------------------------------------

    const summary =
      document.getElementById(
        "postLocationSummary"
      );

    if (summary) {

      summary.textContent =
        `選択地点：${lat.toFixed(6)}, ${lng.toFixed(6)}`;

      summary.classList.add("selected");

    }


    // --------------------------------------------
    // 投稿マップ側にも反映
    // --------------------------------------------

    if (postPickerMap) {

      setPostPickerMarker(
        lat,
        lng
      );

      postPickerMap.setView(
        [lat, lng],
        16
      );

    }


    // --------------------------------------------
    // 下書き保存
    // --------------------------------------------

    savePostFormDraft();


    // --------------------------------------------
    // 成功表示
    // --------------------------------------------

    if (resultBox) {

      resultBox.textContent =
        `場所を取得しました（緯度 ${lat.toFixed(6)} / 経度 ${lng.toFixed(6)}）`;

      resultBox.className =
        "post-address-geocode-result success";

    }


    // --------------------------------------------
    // 少し待って元のフォームへ戻る
    // --------------------------------------------

    setTimeout(() => {

      const modal =
        document.getElementById(
          "postAddressModal"
        );

      if (modal) {
        modal.classList.remove("active");
      }

    }, 500);


  } catch(error) {

    console.error(
      "住所から座標取得エラー:",
      error
    );


    if (resultBox) {

      resultBox.textContent =
        "住所から場所を取得できませんでした。時間をおいてもう一度お試しください。";

      resultBox.className =
        "post-address-geocode-result error";

    }

  } finally {

    if (button) {
      button.disabled = false;
    }

  }

}


// ======================================================
// 投稿フォーム送信
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const form =
      document.getElementById(
        "spotPostForm"
      );

    if(!form){
      return;
    }


    form.addEventListener(
      "submit",
      handleSpotPostSubmit
    );


    // ============================================
    // 入力内容を自動保存
    // ============================================

    form.addEventListener(
      "input",
      () => {

        savePostFormDraft();

      }
    );


    form.addEventListener(
      "change",
      () => {

        savePostFormDraft();

      }
    );

    const memoPostForm =
      document.getElementById("memoPostForm");

    if (memoPostForm) {

      memoPostForm.addEventListener(
        "submit",
        handleMemoPostSubmit
      );

    }

    const postAddressInput =
      document.getElementById(
        "postAddressInput"
      );

    if (postAddressInput) {

      postAddressInput.addEventListener(
        "keydown",
        event => {

          if (event.key === "Enter") {

            event.preventDefault();

            requestPostAddressFromInput();

          }

        }
      );

    }

    initMemoDraftAutosave();

  }
);


// ======================================================
// 投稿処理
// ======================================================

async function handleSpotPostSubmit(
  event
){

  event.preventDefault();


  clearPostFormStatus();


  const placeName =
    document
      .getElementById("postPlaceName")
      .value
      .trim();


  const category =
    document
      .getElementById("postCategory")
      .value
      .trim();

　 const website =
    document
      .getElementById("postWebsite")
      .value
      .trim();

   // ====================================================
   // イベント取得
   // ====================================================
   
   const eventItems =
     document.querySelectorAll(
       "#postEventsContainer .post-event-item"
     );
   
   const events = [];
   
   
   eventItems.forEach(item => {
   
     const name =
       item
         .querySelector(".post-event-name")
         ?.value
         .trim() || "";
   
   
     const manualStatus =
       item
         .querySelector(".post-event-manual-status")
         ?.value
         .trim() || "開催中";
   
   
     // イベント名も入力されていない
     // 完全な空欄は登録しない
     if (!name) {
       return;
     }
   
   
     events.push({
   
       name: name,
   
       manualStatus:
         manualStatus || "開催中",
   
       // フォームからは開催期間を送らない
       startDate: "",
   
       endDate: ""
   
     });
   
   });
   
   
   // ====================================================
   // イベントなし
   // ====================================================
   //
   // イベントがなくても開催状況は開催中
   //
   
   if (events.length === 0) {
   
     events.push({
       name: "",
       manualStatus: "開催中",
       startDate: "",
       endDate: ""
     });
   
   }
   
   
   // ====================================================
   // 現地メモ
   // ====================================================
   
   const memoContent =
     document
       .getElementById("postMemo")
       .value
       .trim();
   
   
   // ====================================================
   // 関連URL
   // ====================================================
   
   const urlInputs =
     document.querySelectorAll(
       ".post-related-url"
     );
   
   const relatedUrls = [];
   
   
   urlInputs.forEach(input => {
   
     const value =
       input.value.trim();
   
     if (value) {
       relatedUrls.push(value);
     }
   
   });

  // ==============================================
  // クライアント側チェック
  // ==============================================

  if(!placeName){

    setPostFormStatus(
      "場所名を入力してください。",
      "error"
    );

    return;

  }


  if(!category){

    setPostFormStatus(
      "カテゴリを選択してください。",
      "error"
    );

    return;

  }


  if(
    !Number.isFinite(selectedPostLat) ||
    !Number.isFinite(selectedPostLng)
  ){

    setPostFormStatus(
      "スポットの位置情報を取得してください。マップから場所を選択するか、住所から緯度・経度を取得してください。",
      "error"
    );

    return;

  }

  const address =
    document
      .getElementById("postAddress")
      ?.textContent
      .trim() || "";

  if(!address){

    setPostFormStatus(
      "スポットの住所を入力・取得してください。",
      "error"
    );

    return;

  }


  // ==============================================
  // イベント入力チェック
  // ==============================================

   for (let i = 0; i < events.length; i++) {
   
     const event = events[i];
   
     const hasName =
       event.name !== "";
   
     const hasStatus =
       event.manualStatus !== "";
   
     const hasStart =
       event.startDate !== "";
   
     const hasEnd =
       event.endDate !== "";
   
   
     // イベント名がある場合
     if (
       hasName &&
       !hasStatus &&
       !(hasStart && hasEnd)
     ) {
   
       setPostFormStatus(
         `イベント${i + 1}「${event.name}」の開催状況または開始日・終了日を入力してください`,
         "error"
       );
   
       return;
   
     }
   
   
     // 日付片方だけ
     if (
       (hasStart && !hasEnd) ||
       (!hasStart && hasEnd)
     ) {
   
       setPostFormStatus(
         `イベント${i + 1}の開始日と終了日は両方入力してください`,
         "error"
       );
   
       return;
   
     }
   
   
     // 日付逆転
     if (
       hasStart &&
       hasEnd &&
       event.startDate > event.endDate
     ) {
   
       setPostFormStatus(
         `イベント${i + 1}の終了日は開始日以降にしてください`,
         "error"
       );
   
       return;
   
     }
   
   }

   for (let i = 0; i < relatedUrls.length; i++) {

     const url = relatedUrls[i];
   
     if (!/^https?:\/\/[^\s]+$/i.test(url)) {
   
       setPostFormStatus(
         `関連URL${i + 1}にはhttp://またはhttps://から始まるURLを入力してください`,
         "error"
       );
   
       return;
   
     }
   
   }


  // ==============================================
  // 送信前の確認
  // ==============================================

  const confirmItems = [
    document.getElementById("postConfirmPersonal"),
    document.getElementById("postConfirmPrivate"),
    document.getElementById("postConfirmUnrelated"),
    document.getElementById("postConfirmTrouble")
  ];

  const confirmBox =
    document.querySelector(".post-confirm-box");


  const allConfirmed =
    confirmItems.every(
      checkbox =>
        checkbox &&
        checkbox.checked
    );


  if(!allConfirmed){

    if(confirmBox){
      confirmBox.classList.add("confirm-error");
    }

    setPostFormStatus(
      "確認項目をすべて確認してください。",
      "error"
    );

    return;

  }


  if(confirmBox){
    confirmBox.classList.remove("confirm-error");
  }

  // ==============================================
  // ハニーポット
  // ==============================================

  if(website){

    setPostFormStatus(
      "投稿を処理できませんでした。",
      "error"
    );

    return;

  }


  // ==============================================
  // 送信ボタン
  // ==============================================

  const button =
    document.getElementById(
      "postSubmitButton"
    );


  button.disabled = true;


  setPostFormStatus(
    "投稿内容を送信しています…",
    "loading"
  );


  try {

    // ============================================
    // GASへ送信
    // ============================================

    const result = await postToGas({
   
      action: "submit",
   
      clientId: getPostClientId(),
   
      website: document
        .getElementById("postWebsite")
        .value
        .trim(),
   
      placeName: document
        .getElementById("postPlaceName")
        .value
        .trim(),
    
      category: document
        .getElementById("postCategory")
        .value
        .trim(),
   
      address: address,
   
      lat: selectedPostLat,
   
      lng: selectedPostLng,
   
      events: events,
   
      memoContent: memoContent,
   
      relatedUrls: relatedUrls,
   
      confirmations: {

        noPersonalInfo:
          document.getElementById(
            "postConfirmPersonal"
          ).checked,

        noPrivateSightings:
          document.getElementById(
            "postConfirmPrivate"
          ).checked,

        relatedInfo:
          document.getElementById(
            "postConfirmUnrelated"
          ).checked,

        noTrouble:
          document.getElementById(
            "postConfirmTrouble"
          ).checked

      }
   
    });


    // ============================================
    // GAS側で失敗
    // ============================================

    if(
      !result ||
      !result.success
    ){
   
      if(
        result &&
        result.error === "DUPLICATE"
      ){
   
        setPostFormStatus(
          "同じ場所・内容のスポットがすでに登録されている可能性があります。",
          "error"
        );
   
      }else{
    
        setPostFormStatus(
          result?.message ||
          "投稿に失敗しました。時間をおいてもう一度お試しください。",
          "error"
        );
   
      }
    
      button.disabled = false;
   
      return;
   
    }

    // ============================================
    // 投稿履歴に保存
    // ============================================

    addPostHistory({

    type: "newSpot",

    spotId:
        String(
        result?.data?.spotId || ""
        ).trim(),

    });


    // ============================================
    // ★ここで初めて「投稿完了」
    // ============================================

    setPostFormStatus(
      "投稿完了。マップを更新しています…",
      "loading"
    );


    // ============================================
    // CSVを再読み込みして新スポットを探す
    // ============================================

    const found =
      await reloadSpotDataUntilFound(
        result.data.spotId,
        null
      );


    // ============================================
    // 投稿フォームを完全にリセット
    // ============================================

    resetPostForm();


    // ============================================
    // リセット処理で保存された下書きも完全に削除
    // ============================================

    clearPostFormDraft();


    // ============================================
    // フォームを閉じる
    // ============================================

    document
      .getElementById("postModal")
      .classList.remove("active");


    // ============================================
    // マップで確認
    // ============================================

    if(found){

      showPostToast(
        "投稿完了！新しいスポットをマップに表示しました。"
      );

    }else{

      showPostToast(
        "投稿完了！保存されました。公開データへの反映に少し時間がかかる場合があります。"
      );

    }


  } catch(error){

    console.error(
      "投稿エラー:",
      error
    );


    setPostFormStatus(
      "通信に失敗しました。時間をおいてもう一度お試しください。",
      "error"
    );


    button.disabled = false;

    return;

  }

}


// ======================================================
// CSV再読み込み → 投稿スポットを探す
// ======================================================

async function reloadSpotDataUntilFound(
  spotId,
  fallbackData
){

  const maxAttempts = 6;

  const interval = 2000;


  for(
    let attempt = 0;
    attempt < maxAttempts;
    attempt++
  ){

    try {

      await loadSpotData();


      const target =
        markers.find(
          obj =>
            String(
              obj.data["スポットID"] || ""
            ) === String(spotId)
        );


      if(target){

        // フィルターで非表示でも
        // 投稿直後は確認できるようにする
        target.marker.addTo(map);


        const markerPosition =
          target.marker.getLatLng();


        map.setView(
          [
            markerPosition.lat,
            markerPosition.lng
          ],
          17
        );


        openDetail(
          target.data
        );


        return true;

      }

    } catch(error){

      console.warn(
        "CSV再読み込みエラー:",
        error
      );

    }


    if(
      attempt <
      maxAttempts - 1
    ){

      await sleep(interval);

    }

  }


  // ====================================================
  // 公開CSVへの反映が遅れている場合
  // GASから返されたデータを一時表示
  // ====================================================

  if(fallbackData){

    addTemporarySubmittedSpot(
      fallbackData
    );

    return false;

  }


  return false;

}


// ======================================================
// 一時的な投稿スポットを表示
// ======================================================

function addTemporarySubmittedSpot(
  data
){

  const lat =
    parseFloat(data["緯度"]);


  const lng =
    parseFloat(data["経度"]);


  if(
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ){

    return;

  }


  const marker =
    L.marker(
      [lat, lng],
      {
        icon:
          getIcon(data["カテゴリ"])
      }
    ).addTo(map);


  marker.on(
    "click",
    () => openDetail(data)
  );


  markers.push({

    marker: marker,

    data: data,

    temporary: true

  });


  map.setView(
    [lat, lng],
    17
  );


  openDetail(data);

}


// ======================================================
// 待機
// ======================================================

function sleep(ms){

  return new Promise(
    resolve =>
      setTimeout(resolve, ms)
  );

}


// ======================================================
// 投稿完了通知
// ======================================================

function showPostToast(
  message
){

  const toast =
    document.getElementById(
      "postToast"
    );


  toast.textContent = message;

  toast.classList.add("show");


  setTimeout(() => {

    toast.classList.remove("show");

  }, 5000);

}

let postEventCount = 0;

function createPostEventElement() {

  postEventCount++;

  const number = postEventCount;

  const wrapper = document.createElement("div");

  wrapper.className = "post-event-item";

  wrapper.innerHTML = `

    <div class="post-event-item-header">

      <strong>イベント${number}</strong>

      ${
        number > 1
          ? `
            <button
              type="button"
              class="post-close-btn"
              onclick="removePostEvent(this)"
              aria-label="イベントを削除"
            >
              <span class="material-symbols-outlined">
                close
              </span>
            </button>
          `
          : ""
      }

    </div>


    <div class="post-field">

      <label>
        イベント名
        <span class="post-optional">任意</span>
      </label>

      <input
        type="text"
        class="post-event-name"
        maxlength="300"
        placeholder="例：ドズル社×〇〇 コラボ"
      >

    </div>


    <div class="post-field">

      <label>
        手動開催状況
        <span class="post-optional">任意</span>
      </label>

      <select class="post-event-manual-status">

        <option value="開催中" selected>
          開催中
        </option>

        <option value="開催前">
          開催前
        </option>

        <option value="開催終了">
          開催終了
        </option>

      </select>

    </div>

  `;

  return wrapper;

}


function addPostEvent() {

  const container =
    document.getElementById(
      "postEventsContainer"
    );

  if (!container) return;


  const item =
    createPostEventElement();

  container.appendChild(item);

  renumberPostEvents();

  savePostFormDraft();

}


function removePostEvent(button) {

  const item =
    button.closest(".post-event-item");

  if (!item) return;

  item.remove();

  renumberPostEvents();

}


function renumberPostEvents() {

  const items =
    document.querySelectorAll(
      "#postEventsContainer .post-event-item"
    );


  items.forEach((item, index) => {

    const number = index + 1;


    const title =
      item.querySelector(
        ".post-event-item-header strong"
      );


    if (title) {

      title.textContent =
        `イベント${number}`;

    }


    const deleteButton =
      item.querySelector(
        ".post-event-item-header .post-close-btn"
      );


    if (deleteButton) {

      deleteButton.style.display =
        number === 1
          ? "none"
          : "flex";

    }

  });


  postEventCount =
    items.length;

}


function resetPostEvents() {

  postEventCount = 0;

  const container =
    document.getElementById("postEventsContainer");

  if (!container) return;

  container.innerHTML = "";

  addPostEvent();

}

let postRelatedUrlCount = 0;

function createPostRelatedUrlElement() {

  postRelatedUrlCount++;

  const number = postRelatedUrlCount;

  const wrapper =
    document.createElement("div");

  wrapper.className = "post-related-url-item";

  wrapper.innerHTML = `

    <div class="post-related-url-row">

      <input
        type="url"
        class="post-related-url"
        maxlength="1000"
        placeholder="https://example.com"
      >

      ${
        number > 1
          ? `
            <button
              type="button"
              class="post-close-btn"
              onclick="removePostRelatedUrl(this)"
              aria-label="リンクを削除"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          `
          : ""
      }

    </div>

  `;

  return wrapper;

}


function addPostRelatedUrl() {

  const container =
    document.getElementById(
      "postRelatedUrlsContainer"
    );

  if (!container) return;

  container.appendChild(
    createPostRelatedUrlElement()
  );

  savePostFormDraft();

}


function removePostRelatedUrl(button) {

  const item =
    button.closest(".post-related-url-item");

  if (!item) return;

  item.remove();

}


function resetPostRelatedUrls() {

  postRelatedUrlCount = 0;

  const container =
    document.getElementById(
      "postRelatedUrlsContainer"
    );

  if (!container) return;

  container.innerHTML = "";

  addPostRelatedUrl();

}

// ======================================================
// リストから探す
// ======================================================

let currentListName = "";


// ======================================================
// リストモーダルを開く
// ======================================================

function openListModal() {

  closeAllBottomNavModals();

  const modal =
    document.getElementById("listModal");

  if (!modal) return;


  currentListName = "";


  const index =
    document.getElementById("listIndex");

  const spotView =
    document.getElementById("listSpotView");


  if (index) {
    index.hidden = false;
  }


  if (spotView) {
    spotView.hidden = true;
  }


  renderListIndex();


  modal.classList.add("active");

}


// ======================================================
// リストモーダルを閉じる
// ======================================================

function closeListModal(event) {

  if (
    event &&
    event.target !== event.currentTarget
  ) {
    return;
  }


  const modal =
    document.getElementById("listModal");

  if (!modal) return;


  modal.classList.remove("active");

}


// ======================================================
// リスト一覧を作成
// ======================================================

function buildListGroups() {

  const groups =
    new Map();


  if (!Array.isArray(dataList)) {
    return groups;
  }


  dataList.forEach(spot => {

    const listText =
      String(
        spot["リスト"] || ""
      ).trim();


    if (!listText) {
      return;
    }


    // 「｜」で複数リストに分割
    const listNames =
      listText
        .split("｜")
        .map(name => name.trim())
        .filter(Boolean);


    listNames.forEach(listName => {

      if (!groups.has(listName)) {

        groups.set(
          listName,
          []
        );

      }


      groups
        .get(listName)
        .push(spot);

    });

  });


  return groups;

}


// ======================================================
// リスト一覧を表示
// スポット数が多い順
// ======================================================

function renderListIndex() {

  const container =
    document.getElementById("listIndex");

  const spotView =
    document.getElementById("listSpotView");


  if (!container) return;


  if (spotView) {
    spotView.hidden = true;
  }


  container.hidden = false;


  const groups =
    buildListGroups();


  if (groups.size === 0) {

    container.innerHTML = `
      <div class="list-empty">

        <span class="material-symbols-outlined">
          playlist_remove
        </span>

        <div>
          現在、登録されているリストはありません。
        </div>

      </div>
    `;

    return;

  }


  // ==============================================
  // スポット数が多い順
  // ==============================================

  const sortedGroups =
    Array.from(groups.entries())
      .sort((a, b) => {

        const countDifference =
          b[1].length - a[1].length;


        if (countDifference !== 0) {
          return countDifference;
        }


        return a[0].localeCompare(
          b[0],
          "ja"
        );

      });

  sortedGroups.forEach(
    ([listName, spots]) => {

      const button =
        document.createElement("button");


      button.type = "button";

      button.className =
        "list-index-item";


      // リスト名を安全に保持
      button.dataset.listName =
        listName;


      button.innerHTML = `

        <span class="list-index-name">
          ${escapeHtml(listName)}
        </span>


        <span class="list-index-count">

          <span class="material-symbols-outlined">
            location_on
          </span>

          ${spots.length}スポット

        </span>


        <span class="material-symbols-outlined list-index-arrow">
          chevron_right
        </span>

      `;


      button.addEventListener(
        "click",
        function() {

          openListSpots(
            this.dataset.listName
          );

        }
      );


      container.appendChild(button);

    }
  );

}


// ======================================================
// マップ中心からの距離を取得
// ======================================================

function getDistanceFromMapCenter(spot) {

  if (
    !spot ||
    typeof map === "undefined" ||
    !map
  ) {
    return Number.POSITIVE_INFINITY;
  }


  const lat =
    parseFloat(
      spot["緯度"]
    );


  const lng =
    parseFloat(
      spot["経度"]
    );


  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return Number.POSITIVE_INFINITY;
  }


  try {

    const center =
      map.getCenter();


    const spotLatLng =
      L.latLng(
        lat,
        lng
      );


    return center.distanceTo(
      spotLatLng
    );

  } catch (error) {

    console.warn(
      "マップ中心からの距離取得に失敗しました",
      error
    );


    return Number.POSITIVE_INFINITY;

  }

}


// ======================================================
// 選択したリストのスポット一覧
// マップ中心に近い順
// ======================================================

function openListSpots(listName) {

  if (!listName) {
    return;
  }


  currentListName =
    String(listName);


  const index =
    document.getElementById("listIndex");

  const spotView =
    document.getElementById("listSpotView");


  if (!index || !spotView) {

    console.warn(
      "リスト表示エリアが見つかりません"
    );

    return;

  }


  const groups =
    buildListGroups();


  let spots =
    groups.get(currentListName) || [];


  // ==============================================
  // 現在のマップ中心から近い順に並べる
  // ==============================================

  spots =
    [...spots].sort((a, b) => {

      const distanceA =
        getDistanceFromMapCenter(a);


      const distanceB =
        getDistanceFromMapCenter(b);


      return distanceA - distanceB;

    });


  index.hidden = true;

  spotView.hidden = false;


  spotView.innerHTML = `

    <button
      type="button"
      class="list-back-button"
      id="listBackButton"
    >

      <span class="material-symbols-outlined">
        arrow_back
      </span>

      リスト一覧に戻る

    </button>


    <div class="list-spot-heading">

      <h3 class="list-spot-title">

        <span class="material-symbols-outlined list-spot-title-icon">
          playlist_play
        </span>

        <span>
          ${escapeHtml(currentListName)}
        </span>

        <span class="list-spot-title-count">

          <span class="material-symbols-outlined">
            location_on
          </span>

          ${spots.length}スポット

        </span>

      </h3>

    </div>


    <div id="listSpotCards"></div>

  `;


  const cardsContainer =
    document.getElementById(
      "listSpotCards"
    );


  if (!cardsContainer) {
    return;
  }


  // ==============================================
  // スポットカード
  // ==============================================

  spots.forEach(
    spot => {

      const card =
        document.createElement("button");

      card.type = "button";

      card.className =
        "favorite-spot-card list-spot-card";


      const placeName =
        String(
          spot["場所名"] ||
          "名称未設定"
        );


      const category =
        String(
          spot["カテゴリ"] ||
          ""
        );


      const address =
        String(
          spot["住所"] ||
          ""
        );


      const events =
        getEvents(spot);


      // ============================================
      // イベントHTML
      // ============================================

      const eventHtml =
        events
          .filter(
            event => event.name
          )
          .map(event => {

            const status =
              event.status || "状態不明";

            return `

              <div class="favorite-spot-event">

                <div class="favorite-spot-event-name">

                  ${escapeHtml(
                    event.name || "イベント名なし"
                  )}

                </div>

                <div
                  class="favorite-spot-event-status ${getStatusClass(status)}"
                >

                  ${escapeHtml(status)}

                </div>

              </div>

            `;

          })
          .join("");


      // ============================================
      // カードHTML
      // ============================================

      card.innerHTML = `

        <!-- カテゴリ -->
        <div
          class="favorite-spot-category"
          style="background:${escapeHtml(
            getCategoryStyle(category).color
          )}"
        >

          <span class="material-symbols-outlined">
            ${escapeHtml(
              getCategoryStyle(category).icon
            )}
          </span>

          ${escapeHtml(category)}

        </div>


        <!-- 場所名 -->
        <div class="favorite-spot-name">

          ${escapeHtml(placeName)}

        </div>


        <!-- 住所 -->
        ${
          address
            ? `
              <div class="favorite-spot-address">

                ${escapeHtml(address)}

              </div>
            `
            : ""
        }


        <!-- イベント -->
        ${
          eventHtml
            ? `
              <div class="favorite-spot-events">

                ${eventHtml}

              </div>
            `
            : ""
        }


        <!-- 詳細を開く矢印 -->
        <span class="favorite-spot-arrow">

          <span class="material-symbols-outlined">
            chevron_right
          </span>

        </span>

      `;


      // ============================================
      // スポットクリック
      // ============================================

      card.addEventListener(
        "click",
        function() {

          openSpotFromList(
            spot
          );

        }
      );


      cardsContainer.appendChild(
        card
      );

    }
  );


  // ==============================================
  // 戻るボタン
  // ==============================================

  const backButton =
    document.getElementById(
      "listBackButton"
    );


  if (backButton) {

    backButton.addEventListener(
      "click",
      backToListIndex
    );

  }

}


// ======================================================
// リスト一覧へ戻る
// ======================================================

function backToListIndex() {

  currentListName = "";


  renderListIndex();

}


// ======================================================
// リストからスポットを選択
// ======================================================

function openSpotFromList(spot) {

  if (!spot) {
    return;
  }


  const lat =
    parseFloat(
      spot["緯度"]
    );


  const lng =
    parseFloat(
      spot["経度"]
    );


  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {

    console.warn(
      "スポットの緯度・経度が正しくありません",
      spot
    );

    return;

  }


  // ==============================================
  // リストモーダルを閉じる
  // ==============================================

  closeListModal();


  // ==============================================
  // 地図をスポットへ移動
  // ==============================================

  map.setView(
    [
      lat,
      lng
    ],
    17
  );


  // ==============================================
  // 地図移動後に詳細パネルを開く
  // ==============================================

  setTimeout(
    function() {

      openDetail(
        spot
      );

    },
    100
  );

}


// ======================================================
// 現地メモ投稿
// ======================================================

// 現地メモ専用GAS
const MEMO_GAS_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbyzLA-aYe6_q4MJFYxJQPenpsWY2PBLoIuqH0iYJmew8CHXqcXb4pdhLyrReZkv0EaE9Q/exec";


// 現在投稿しようとしているスポット
let currentMemoPostSpot = null;


// ======================================================
// 現地メモ入力履歴
// ======================================================

const MEMO_DRAFT_STORAGE_KEY =
  "dzlSpotMemoDrafts";


// -----------------------------------------------
// 保存されている下書きを取得
// -----------------------------------------------

function getMemoDrafts() {

  try {

    const saved =
      localStorage.getItem(
        MEMO_DRAFT_STORAGE_KEY
      );

    if (!saved) {
      return {};
    }


    const drafts =
      JSON.parse(saved);


    if (
      !drafts ||
      typeof drafts !== "object" ||
      Array.isArray(drafts)
    ) {

      return {};

    }


    return drafts;

  } catch (error) {

    console.warn(
      "現地メモ入力履歴の読み込みに失敗:",
      error
    );

    return {};

  }

}


// -----------------------------------------------
// 下書きを保存
// -----------------------------------------------

function saveMemoDraft(
  spotId,
  content
) {

  const id =
    String(
      spotId || ""
    ).trim();


  if (!id) return;


  try {

    const drafts =
      getMemoDrafts();


    const text =
      String(
        content || ""
      );


    // 空になった場合は保存データから削除
    if (!text) {

      delete drafts[id];

    } else {

      drafts[id] = text;

    }


    localStorage.setItem(
      MEMO_DRAFT_STORAGE_KEY,
      JSON.stringify(drafts)
    );


  } catch (error) {

    console.warn(
      "現地メモ入力履歴の保存に失敗:",
      error
    );

  }

}


// -----------------------------------------------
// 下書きを取得
// -----------------------------------------------

function getMemoDraft(
  spotId
) {

  const id =
    String(
      spotId || ""
    ).trim();


  if (!id) {
    return "";
  }


  const drafts =
    getMemoDrafts();


  return String(
    drafts[id] || ""
  );

}


// -----------------------------------------------
// 投稿成功したスポットの下書きを削除
// -----------------------------------------------

function deleteMemoDraft(
  spotId
) {

  const id =
    String(
      spotId || ""
    ).trim();


  if (!id) return;


  try {

    const drafts =
      getMemoDrafts();


    delete drafts[id];


    localStorage.setItem(
      MEMO_DRAFT_STORAGE_KEY,
      JSON.stringify(drafts)
    );


  } catch (error) {

    console.warn(
      "現地メモ入力履歴の削除に失敗:",
      error
    );

  }

}


// ======================================================
// 現地メモ投稿モーダルを開く
// ======================================================

function openMemoPostModal() {

  closeAllBottomNavModals();

  const modal =
    document.getElementById("memoPostModal");

  if (!modal) return;


  const spot =
    window.currentDetailSpot || null;


  if (!spot) {

    showMemoPostToast(
      "投稿するスポットを取得できませんでした。"
    );

    return;

  }


  const spotId =
    String(
      spot["スポットID"] || ""
    ).trim();


  if (!spotId) {

    showMemoPostToast(
      "スポットIDを取得できませんでした。"
    );

    return;

  }


  currentMemoPostSpot = spot;


  const categoryElement =
    document.getElementById(
      "memoPostCategory"
    );

  const placeNameElement =
    document.getElementById(
      "memoPostPlaceName"
    );

  const addressElement =
    document.getElementById(
      "memoPostAddress"
    );


  if (categoryElement) {

    categoryElement.textContent =
      String(
        spot["カテゴリ"] || "その他"
      ).trim();

  }


  if (placeNameElement) {

    placeNameElement.textContent =
      String(
        spot["場所名"] || ""
      ).trim();

  }


  if (addressElement) {

    addressElement.textContent =
      String(
        spot["住所"] || ""
      ).trim();

  }


  resetMemoPostForm();


  // -----------------------------------------------
  // スポットごとの入力履歴を復元
  // -----------------------------------------------

  const memoContentElement =
    document.getElementById(
      "memoPostContent"
    );


  if (memoContentElement) {

    memoContentElement.value =
      getMemoDraft(spotId);

  }


  // reset後にも表示を確実にセット
  if (categoryElement) {
    categoryElement.textContent =
      String(spot["カテゴリ"] || "その他").trim();
  }

  if (placeNameElement) {
    placeNameElement.textContent =
      String(spot["場所名"] || "").trim();
  }

  if (addressElement) {
    addressElement.textContent =
      String(spot["住所"] || "").trim();
  }


  modal.classList.add("active");


  requestAnimationFrame(() => {

    document
      .getElementById("memoPostContent")
      ?.focus();

  });

}


// ======================================================
// 閉じる
// ======================================================

function closeMemoPostModal(event) {

  if (
    event &&
    event.target !== event.currentTarget
  ) {
    return;
  }


  const modal =
    document.getElementById(
      "memoPostModal"
    );


  if (!modal) return;


  modal.classList.remove("active");

  currentMemoPostSpot = null;

}


// ======================================================
// フォームリセット
// ======================================================

function resetMemoPostForm() {

  const form =
    document.getElementById(
      "memoPostForm"
    );


  if (form) {
    form.reset();
  }


  const status =
    document.getElementById(
      "memoPostFormStatus"
    );


  if (status) {

    status.textContent = "";

    status.className =
      "post-form-status";

  }


  const confirmBox =
    document.querySelector(
      "#memoPostModal .post-confirm-box"
    );


  if (confirmBox) {

    confirmBox.classList.remove(
      "confirm-error"
    );

  }


  const button =
    document.getElementById(
      "memoPostSubmitButton"
    );


  if (button) {

    button.disabled = false;

  }

}


// ======================================================
// ステータス表示
// ======================================================

function setMemoPostFormStatus(
  message,
  type = ""
) {

  const element =
    document.getElementById(
      "memoPostFormStatus"
    );


  if (!element) return;


  element.textContent = message;

  element.className =
    "post-form-status";


  if (type) {

    element.classList.add(type);

  }

}


// ======================================================
// GASへ送信
// ======================================================

async function postMemoToGas(payload) {

  if (
    !MEMO_GAS_WEB_APP_URL ||
    MEMO_GAS_WEB_APP_URL.includes(
      "ここに現地メモ用GAS"
    )
  ) {

    throw new Error(
      "現地メモ用GASのURLが設定されていません。"
    );

  }


  const response =
    await fetch(
      MEMO_GAS_WEB_APP_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body: JSON.stringify(payload)
      }
    );


  if (!response.ok) {

    throw new Error(
      "GASとの通信に失敗しました。"
    );

  }


  let result;

  try {

    result =
      await response.json();

  } catch (error) {

    throw new Error(
      "GASから正しい応答を受け取れませんでした。"
    );

  }


  return result;

}


// ======================================================
// 送信
// ======================================================

async function handleMemoPostSubmit(event) {

  event.preventDefault();


  setMemoPostFormStatus(
    "",
    ""
  );


  const spot =
    currentMemoPostSpot;


  if (!spot) {

    setMemoPostFormStatus(
      "投稿するスポットを取得できませんでした。",
      "error"
    );

    return;

  }


  const spotId =
    String(
      spot["スポットID"] || ""
    ).trim();


  const memoContent =
    document
      .getElementById(
        "memoPostContent"
      )
      ?.value
      .trim() || "";


  const website =
    document
      .getElementById(
        "memoPostWebsite"
      )
      ?.value
      .trim() || "";


  // -----------------------------------------------
  // 入力チェック
  // -----------------------------------------------

  if (!spotId) {

    setMemoPostFormStatus(
      "スポットIDを取得できませんでした。",
      "error"
    );

    return;

  }


  if (!memoContent) {

    setMemoPostFormStatus(
      "現地メモを入力してください。",
      "error"
    );

    return;

  }


  // -----------------------------------------------
  // ハニーポット
  // -----------------------------------------------

  if (website) {

    setMemoPostFormStatus(
      "投稿を処理できませんでした。",
      "error"
    );

    return;

  }


  // -----------------------------------------------
  // 確認4項目
  // -----------------------------------------------

  const confirmItems = [

    document.getElementById(
      "memoConfirmPersonal"
    ),

    document.getElementById(
      "memoConfirmPrivate"
    ),

    document.getElementById(
      "memoConfirmUnrelated"
    ),

    document.getElementById(
      "memoConfirmTrouble"
    )

  ];


  const allConfirmed =
    confirmItems.every(
      checkbox =>
        checkbox &&
        checkbox.checked
    );


  if (!allConfirmed) {

    const confirmBox =
      document.querySelector(
        "#memoPostModal .post-confirm-box"
      );


    if (confirmBox) {

      confirmBox.classList.add(
        "confirm-error"
      );

    }


    setMemoPostFormStatus(
      "確認項目をすべて確認してください。",
      "error"
    );

    return;

  }


  const confirmBox =
    document.querySelector(
      "#memoPostModal .post-confirm-box"
    );


  if (confirmBox) {

    confirmBox.classList.remove(
      "confirm-error"
    );

  }


  // -----------------------------------------------
  // 送信
  // -----------------------------------------------

  const button =
    document.getElementById(
      "memoPostSubmitButton"
    );


  if (button) {

    button.disabled = true;

  }


  setMemoPostFormStatus(
    "現地メモを送信しています…",
    "loading"
  );


  try {

    const result =
      await postMemoToGas({

        action: "submitMemo",

        spotId: spotId,

        memoContent: memoContent,

        website: website,

        confirmations: {

          noPersonalInfo:
            document.getElementById(
              "memoConfirmPersonal"
            ).checked,

          noPrivateSightings:
            document.getElementById(
              "memoConfirmPrivate"
            ).checked,

          relatedInfo:
            document.getElementById(
              "memoConfirmUnrelated"
            ).checked,

          noTrouble:
            document.getElementById(
              "memoConfirmTrouble"
            ).checked

        }

      });


    if (
      !result ||
      !result.success
    ) {

      setMemoPostFormStatus(
        result?.message ||
        "投稿に失敗しました。時間をおいてもう一度お試しください。",
        "error"
      );


      if (button) {
        button.disabled = false;
      }


      return;

    }


    // -----------------------------------------------
    // 成功
    // -----------------------------------------------

    setMemoPostFormStatus(
      "投稿しました。",
      "success"
    );

    // -----------------------------------------------
    // 投稿履歴に保存
    // -----------------------------------------------

    addPostHistory({

    type: "memo",

    spotId:
        spotId,

    content:
        memoContent

    });

    deleteMemoDraft(
      spotId
    );


    // フォームを閉じる
    setTimeout(() => {

      const modal =
        document.getElementById(
          "memoPostModal"
        );


      if (modal) {
        modal.classList.remove("active");
      }


      resetMemoPostForm();


      // 現在表示している詳細パネルを更新
      reloadCurrentMemoSpot(
        result,
        memoContent
      );


      showMemoPostToast(
        "現地メモを投稿しました。ご協力ありがとうございます！"
      );


    }, 500);


  } catch (error) {

    console.error(
      "現地メモ投稿エラー:",
      error
    );


    setMemoPostFormStatus(
      "通信に失敗しました。時間をおいてもう一度お試しください。",
      "error"
    );


    if (button) {

      button.disabled = false;

    }

  }

}


// ======================================================
// 投稿後にスポット情報を再読み込み
// ======================================================

async function reloadCurrentMemoSpot(result, expectedMemoContent) {

  const spotId =
    String(
      result?.data?.spotId ||
      currentMemoPostSpot?.["スポットID"] ||
      ""
    ).trim();


  if (!spotId) return;


  const memoSlot =
    Number(
      result?.data?.memoSlot || 0
    );


  const expectedContent =
    String(
      expectedMemoContent || ""
    ).trim();


  // -----------------------------------------------
  // 詳細パネルが現在開いているか
  // -----------------------------------------------

  const detailPanel =
    document.getElementById("detailPanel");

  const detailIsOpen =
    detailPanel &&
    detailPanel.classList.contains("active");


  const currentDetailSpotId =
    String(
      window.currentDetailSpot?.["スポットID"] || ""
    ).trim();


  const isCurrentDetailSpot =
    detailIsOpen &&
    currentDetailSpotId === spotId;


  // -----------------------------------------------
  // CSVが最新になるまで再取得
  // -----------------------------------------------

  const maxAttempts = 5;

  const waitTimes = [
    1000,
    1500,
    2000,
    2500,
    3000
  ];


  let latestSpot = null;


  for (
    let attempt = 0;
    attempt < maxAttempts;
    attempt++
  ) {

    try {

      const newDataList =
        await loadSpotData();


      const target =
        newDataList.find(
          item =>
            String(
              item["スポットID"] || ""
            ).trim() === spotId
        );


      if (target) {

        latestSpot = target;


        // -----------------------------------------
        // 投稿したメモがCSVに反映されたか確認
        // -----------------------------------------

        if (
          memoSlot > 0 &&
          expectedContent
        ) {

          const memoKey =
            "現地メモ内容-" +
            memoSlot;


          const csvMemoContent =
            String(
              target[memoKey] || ""
            ).trim();


          if (
            csvMemoContent === expectedContent
          ) {

            console.log(
              "現地メモのCSV反映を確認しました。",
              {
                attempt: attempt + 1,
                memoSlot: memoSlot
              }
            );

            break;

          }


          console.log(
            "CSVがまだ最新ではありません。再取得します。",
            {
              attempt: attempt + 1,
              memoSlot: memoSlot
            }
          );

        } else {

          break;

        }

      }


    } catch (error) {

      console.warn(
        "現地メモ投稿後のCSV再取得エラー:",
        error
      );

    }


    // ---------------------------------------------
    // 次の取得まで少し待つ
    // ---------------------------------------------

    if (
      attempt <
      maxAttempts - 1
    ) {

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            waitTimes[attempt]
          )
      );

    }

  }


  // -----------------------------------------------
  // 詳細パネルを更新
  // -----------------------------------------------

  if (
    latestSpot &&
    isCurrentDetailSpot
  ) {

    // 最新データを現在の詳細スポットとして保持
    window.currentDetailSpot =
      latestSpot;


    // 詳細パネルを再描画
    openDetail(
      latestSpot
    );

  }


  // -----------------------------------------------
  // それ以外の場合
  // -----------------------------------------------
  //
  // 詳細パネルを開いていなかった場合は、
  // マーカーとCSVデータだけ最新状態にして終了。
  //

  return latestSpot;

}


// ======================================================
// 通知
// ======================================================

function showMemoPostToast(message) {

  const toast =
    document.getElementById(
      "memoPostToast"
    );


  if (!toast) return;


  toast.textContent = message;

  toast.classList.add("show");


  setTimeout(() => {

    toast.classList.remove("show");

  }, 5000);

}

// ======================================================
// 現地メモ入力履歴の自動保存
// ======================================================

function initMemoDraftAutosave() {

  const textarea =
    document.getElementById(
      "memoPostContent"
    );


  if (!textarea) return;


  textarea.addEventListener(
    "input",
    () => {

      const spot =
        currentMemoPostSpot;


      if (!spot) return;


      const spotId =
        String(
          spot["スポットID"] || ""
        ).trim();


      if (!spotId) return;


      saveMemoDraft(
        spotId,
        textarea.value
      );

    }
  );

}


/* =========================================================
   新検索機能
   ========================================================= */


/* ---------------------------------------------------------
   検索モーダルを開く
   --------------------------------------------------------- */

function openSearchNewModal() {

  closeAllBottomNavModals();

  const modal =
    document.getElementById(
      "searchNewModal"
    );

  if (!modal) {
    return;
  }

  modal.classList.add("active");

  renderSearchNewResults();

  requestAnimationFrame(() => {

    const input =
      document.getElementById(
        "searchNewInput"
      );

    if (input) {
      input.focus();
    }

  });

}


/* ---------------------------------------------------------
   検索モーダルを閉じる
   --------------------------------------------------------- */

function closeSearchNewModal(event) {

  if (
    event &&
    event.target !== event.currentTarget
  ) {
    return;
  }

  const modal =
    document.getElementById(
      "searchNewModal"
    );

  if (!modal) {
    return;
  }

  modal.classList.remove("active");

}


/* ---------------------------------------------------------
   検索文字列を正規化
   --------------------------------------------------------- */

function normalizeSearchNewText(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

}


/* ---------------------------------------------------------
   スポットが検索キーワードに一致するか
   --------------------------------------------------------- */

function spotMatchesSearchNewKeyword(
  spot,
  keyword
) {

  if (!spot) {
    return false;
  }

  const normalizedKeyword =
    normalizeSearchNewText(keyword);


  /*
   * キーワード空欄
   *
   * → 全スポットを対象にする
   */
  if (!normalizedKeyword) {
    return true;
  }


  /*
   * 場所名
   */
  const placeName =
    normalizeSearchNewText(
      spot["場所名"]
    );


  /*
   * 住所
   */
  const address =
    normalizeSearchNewText(
      spot["住所"]
    );


  /*
   * イベント名
   */
  let eventText = "";

  try {

    if (typeof getEvents === "function") {

      const events =
        getEvents(spot) || [];

      eventText =
        events
          .map(event =>
            String(
              event?.name || ""
            )
          )
          .join(" ");

    }

  } catch (error) {

    console.warn(
      "検索用イベント取得エラー:",
      error
    );

  }


  eventText =
    normalizeSearchNewText(
      eventText
    );


  return (
    placeName.includes(normalizedKeyword) ||
    address.includes(normalizedKeyword) ||
    eventText.includes(normalizedKeyword)
  );

}


/* ---------------------------------------------------------
   検索結果を取得
   --------------------------------------------------------- */

function getSearchNewResults() {

  if (!Array.isArray(dataList)) {
    return [];
  }


  const input =
    document.getElementById(
      "searchNewInput"
    );

  const keyword =
    input
      ? input.value
      : "";


  /*
   * まず検索条件
   */
  const results =
    dataList.filter(spot => {

      /*
       * 表示管理パネルのフィルターを
       * 必ず適用する
       */
      if (!shouldDisplaySpot(spot)) {
        return false;
      }


      /*
       * キーワード検索
       */
      return spotMatchesSearchNewKeyword(
        spot,
        keyword
      );

    });


  /*
   * マップ中心から近い順
   */
  results.sort((a, b) => {

    const distanceA =
      getDistanceFromMapCenter(a);

    const distanceB =
      getDistanceFromMapCenter(b);

    return distanceA - distanceB;

  });


  return results;

}


/* ---------------------------------------------------------
   検索結果を描画
   --------------------------------------------------------- */

function renderSearchNewResults() {

  const container =
    document.getElementById(
      "searchNewResultContainer"
    );

  const summary =
    document.getElementById(
      "searchNewResultSummary"
    );


  if (!container) {
    return;
  }


  const results =
    getSearchNewResults();


  const input =
    document.getElementById(
      "searchNewInput"
    );

  const keyword =
    input
      ? input.value.trim()
      : "";


  /*
   * 件数
   */
  if (summary) {

    summary.textContent =
      keyword
        ? `「${keyword}」の検索結果 ${results.length.toLocaleString("ja-JP")}件（マップ中心から近い順）`
        : `表示中のスポット ${results.length.toLocaleString("ja-JP")}件（マップ中心から近い順）`;

  }


  /*
   * 結果なし
   */
  if (results.length === 0) {

    container.innerHTML = `

      <div class="search-new-empty">

        <div class="search-new-empty-icon">
          <span class="material-symbols-outlined">
            search_off
          </span>
        </div>

        <div class="search-new-empty-title">
          ${
            keyword
              ? "一致するスポットがありません"
              : "表示できるスポットがありません"
          }
        </div>

        <div class="search-new-empty-message">
          ${
            keyword
              ? "場所名・住所・イベント名などを変えて検索してみてください。"
              : "表示管理パネルのフィルターを確認してください。"
          }
        </div>

      </div>

    `;

    return;

  }


  /*
   * 一旦クリア
   */
  container.innerHTML = "";


  /*
   * カード生成
   */
  results.forEach(spot => {

    const card =
      createSearchNewSpotCard(
        spot
      );

    container.appendChild(card);

  });

}


/* ---------------------------------------------------------
   検索結果カード
   --------------------------------------------------------- */

function createSearchNewSpotCard(
  spot
) {

  const spotId =
    String(
      spot["スポットID"] || ""
    ).trim();


  const category =
    String(
      spot["カテゴリ"] || ""
    ).trim();


  const placeName =
    String(
      spot["場所名"] ||
      "名称未設定"
    );


  const address =
    String(
      spot["住所"] || ""
    );


  const style =
    getCategoryStyle(
      category
    );


  const events =
    getEvents(spot);


  /*
   * イベントHTML
   */
  let eventHTML = "";


  if (events.length > 0) {

    eventHTML =
      events
        .map(event => {

          const status =
            event.status ||
            "状態不明";


          return `

            <div class="favorite-spot-event">

              <div class="favorite-spot-event-name">
                ${escapeHtml(
                  event.name ||
                  "イベント名なし"
                )}
              </div>

              <div
                class="favorite-spot-event-status ${getStatusClass(status)}"
              >
                ${escapeHtml(status)}
              </div>

            </div>

          `;

        })
        .join("");

  }


  /*
   * 現在お気に入りか
   */
  const favoriteIds =
    getFavoriteSpotIds();


  const isFavorite =
    favoriteIds.includes(
      spotId
    );


  /*
   * カード
   */
  const card =
    document.createElement(
      "div"
    );


  card.className =
    "favorite-spot-card";


  card.innerHTML = `

    <!-- カテゴリ -->
    <div
      class="favorite-spot-category"
      style="background:${escapeHtml(style.color)}"
    >
      <span class="material-symbols-outlined">
        ${escapeHtml(style.icon)}
      </span>

      ${escapeHtml(category)}
    </div>


    <!-- 場所名 -->
    <div class="favorite-spot-name">
      ${escapeHtml(placeName)}
    </div>


    <!-- 住所 -->
    ${
      address
        ? `
          <div class="favorite-spot-address">
            ${escapeHtml(address)}
          </div>
        `
        : ""
    }


    <!-- イベント -->
    ${
      eventHTML
        ? `
          <div class="favorite-spot-events">
            ${eventHTML}
          </div>
        `
        : ""
    }


    <!-- お気に入り -->
    <button
      type="button"
      class="search-new-favorite-button ${
        isFavorite
          ? "is-favorite"
          : ""
      }"
      aria-label="${
        isFavorite
          ? "お気に入りから削除"
          : "お気に入りに追加"
      }"
      title="${
        isFavorite
          ? "お気に入りから削除"
          : "お気に入りに追加"
      }"
    >

      <span class="material-symbols-outlined">
        ${
          isFavorite
            ? "favorite"
            : "favorite_border"
        }
      </span>

    </button>


    <!-- 詳細を開く矢印 -->
    <span class="favorite-spot-arrow">
      <span class="material-symbols-outlined">
        chevron_right
      </span>
    </span>

  `;


  /*
   * お気に入りボタン
   */
  const favoriteButton =
    card.querySelector(
      ".search-new-favorite-button"
    );


  if (favoriteButton) {

    favoriteButton.addEventListener(
      "click",
      function(event) {

        event.stopPropagation();

        toggleSearchNewFavorite(
          spotId
        );

      }
    );

  }


  /*
   * カードクリック
   */
  card.addEventListener(
    "click",
    function() {

      openSearchNewSpot(
        spot
      );

    }
  );


  return card;

}


/* ---------------------------------------------------------
   検索結果からお気に入りを切り替える
   --------------------------------------------------------- */

function toggleSearchNewFavorite(
  spotId
) {

  const normalizedId =
    String(
      spotId || ""
    ).trim();


  if (!normalizedId) {
    return;
  }


  const favoriteIds =
    getFavoriteSpotIds();


  const index =
    favoriteIds.indexOf(
      normalizedId
    );


  if (index >= 0) {

    /*
     * お気に入り解除
     *
     * 検索結果ではカードを消さない
     */
    favoriteIds.splice(
      index,
      1
    );

  } else {

    /*
     * お気に入り登録
     */
    favoriteIds.push(
      normalizedId
    );

  }


  /*
   * 既存のお気に入り保存形式を使用
   */
  localStorage.setItem(
    "dzlSpotFavorites",
    JSON.stringify(
      favoriteIds
    )
  );


  /*
   * 検索結果だけ再描画
   *
   * → 解除してもカードは残る
   */
  renderSearchNewResults();


  /*
   * お気に入りリストが開いている場合も
   * 表示を同期
   */
  if (
    typeof renderFavoriteList ===
    "function"
  ) {

    renderFavoriteList();

  }


  /*
   * 詳細パネルのハートなども
   * 既存機能側で更新される場合に備える
   */
  if (
    typeof updateFavoriteUI ===
    "function"
  ) {

    updateFavoriteUI(
      normalizedId
    );

  }

}


/* ---------------------------------------------------------
   検索結果からスポット詳細を開く
   --------------------------------------------------------- */

function openSearchNewSpot(spot) {
  if (!spot) return;

  const lat = parseFloat(spot["緯度"]);
  const lng = parseFloat(spot["経度"]);

  // 検索モーダルを閉じる
  closeSearchNewModal();

  // スポットの位置へ移動
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    map.setView(
      [lat, lng],
      Math.max(map.getZoom(), 16),
      {
        animate: true,
        duration: 0.5
      }
    );
  }

  // スポット詳細を開く
  if (typeof openDetail === "function") {
    openDetail(spot);
  }
}


/* ---------------------------------------------------------
   初期化
   --------------------------------------------------------- */

function initSearchNew() {

  const input =
    document.getElementById(
      "searchNewInput"
    );


  const clearButton =
    document.getElementById(
      "searchNewClear"
    );


  if (input) {

    input.addEventListener(
      "input",
      function() {

        renderSearchNewResults();

      }
    );

  }


  if (clearButton) {

    clearButton.addEventListener(
      "click",
      function() {

        if (input) {

          input.value = "";

          renderSearchNewResults();

          input.focus();

        }

      }
    );

  }

}


// ======================================================
// 情報修正依頼
// ======================================================

const CORRECTION_REQUEST_GAS_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbx4XouCRoyud3uwDx_OJCSb_et6lqQ_0yQtS_dghEfD9KcBbMVCJGBQfvxtYlfgEj8B/exec";

let currentCorrectionRequestSpot = null;

const CORRECTION_REQUEST_DRAFT_STORAGE_KEY =
  "dzlSpotCorrectionRequestDrafts";

// ======================================================
// 情報修正依頼 入力履歴
// ======================================================

function getCorrectionRequestDrafts() {

  try {

    const saved =
      localStorage.getItem(
        CORRECTION_REQUEST_DRAFT_STORAGE_KEY
      );

    if (!saved) return {};

    const drafts = JSON.parse(saved);

    if (
      !drafts ||
      typeof drafts !== "object" ||
      Array.isArray(drafts)
    ) {
      return {};
    }

    return drafts;

  } catch (error) {

    console.warn(
      "情報修正依頼の入力履歴読み込みに失敗:",
      error
    );

    return {};

  }

}


function saveCorrectionRequestDraft(
  spotId
) {

  const id =
    String(spotId || "").trim();

  if (!id) return;

  try {

    const drafts =
      getCorrectionRequestDrafts();

    const items =
      getCorrectionRequestItemsFromForm();

    const draft = {

      items: items,

      confirmations: {

        noPersonalInfo:
          document.getElementById(
            "correctionConfirmPersonal"
          )?.checked || false,

        noPrivateSightings:
          document.getElementById(
            "correctionConfirmPrivate"
          )?.checked || false,

        relatedInfo:
          document.getElementById(
            "correctionConfirmUnrelated"
          )?.checked || false,

        noTrouble:
          document.getElementById(
            "correctionConfirmTrouble"
          )?.checked || false

      }

    };

    drafts[id] = draft;

    localStorage.setItem(
      CORRECTION_REQUEST_DRAFT_STORAGE_KEY,
      JSON.stringify(drafts)
    );

  } catch (error) {

    console.warn(
      "情報修正依頼の入力履歴保存に失敗:",
      error
    );

  }

}


function getCorrectionRequestDraft(
  spotId
) {

  const id =
    String(spotId || "").trim();

  if (!id) return null;

  const drafts =
    getCorrectionRequestDrafts();

  return drafts[id] || null;

}


function deleteCorrectionRequestDraft(
  spotId
) {

  const id =
    String(spotId || "").trim();

  if (!id) return;

  try {

    const drafts =
      getCorrectionRequestDrafts();

    delete drafts[id];

    localStorage.setItem(
      CORRECTION_REQUEST_DRAFT_STORAGE_KEY,
      JSON.stringify(drafts)
    );

  } catch (error) {

    console.warn(
      "情報修正依頼の入力履歴削除に失敗:",
      error
    );

  }

}

// ======================================================
// 修正項目
// ======================================================

const CORRECTION_REQUEST_OPTIONS = [
  "場所名",
  "カテゴリ",
  "住所",
  "イベント名",
  "開催状況",
  "リスト",
  "店舗Xアカウント",
  "店舗公式サイト",
  "関連URL"
];


function createCorrectionRequestItem(
  itemData = {}
) {

  const container =
    document.getElementById(
      "correctionRequestItems"
    );

  if (!container) return;

  const item =
    document.createElement("div");

  item.className =
    "correction-request-item";


  const optionsHTML =
    CORRECTION_REQUEST_OPTIONS
      .map(option => {

        const selected =
          String(
            itemData.type || ""
          ) === option
            ? "selected"
            : "";

        return `
          <option value="${escapeHtml(option)}" ${selected}>
            ${escapeHtml(option)}
          </option>
        `;

      })
      .join("");


  item.innerHTML = `

    <div class="correction-request-item-header">

      <span class="correction-request-item-number">
        修正項目
      </span>

      <button
        type="button"
        class="correction-request-remove-btn"
        aria-label="この修正項目を削除"
        title="この修正項目を削除"
      >
        <span class="material-symbols-outlined">
          delete
        </span>
      </button>

    </div>


    <div class="post-field">

      <label>
        修正する項目

        <span class="post-required">
          必須
        </span>
      </label>

      <select class="correction-request-type">
        <option value="">
          選択してください
        </option>

        ${optionsHTML}
      </select>

    </div>


    <div class="post-field">

      <label>
        修正する内容

        <span class="post-required">
          必須
        </span>
      </label>

      <textarea
        class="correction-request-content"
        maxlength="2000"
        rows="4"
        placeholder="正しい情報や修正内容を入力してください&#10;運営が手動で修正するため、変更する箇所を分かりやすくご記入ください"
      >${escapeHtml(itemData.content || "")}</textarea>

    </div>

  `;


  const removeButton =
    item.querySelector(
      ".correction-request-remove-btn"
    );


  if (removeButton) {

    removeButton.addEventListener(
      "click",
      () => {

        item.remove();

        updateCorrectionRequestItemNumbers();

        saveCurrentCorrectionRequestDraft();

      }
    );

  }


  item
    .querySelectorAll("select, textarea")
    .forEach(element => {

      element.addEventListener(
        "input",
        saveCurrentCorrectionRequestDraft
      );

      element.addEventListener(
        "change",
        saveCurrentCorrectionRequestDraft
      );

    });


  container.appendChild(item);

  updateCorrectionRequestItemNumbers();

}


function updateCorrectionRequestItemNumbers() {

  const items =
    document.querySelectorAll(
      "#correctionRequestItems .correction-request-item"
    );

  items.forEach(
    (item, index) => {

      const number =
        item.querySelector(
          ".correction-request-item-number"
        );

      if (number) {

        number.textContent =
          `修正項目 ${index + 1}`;

      }

    }
  );

}


function getCorrectionRequestItemsFromForm() {

  const elements =
    document.querySelectorAll(
      "#correctionRequestItems .correction-request-item"
    );

  return Array.from(elements)
    .map(item => {

      const type =
        item
          .querySelector(
            ".correction-request-type"
          )
          ?.value
          .trim() || "";

      const content =
        item
          .querySelector(
            ".correction-request-content"
          )
          ?.value
          .trim() || "";

      return {
        type: type,
        content: content
      };

    });


}


function saveCurrentCorrectionRequestDraft() {

  if (!currentCorrectionRequestSpot) {
    return;
  }

  const spotId =
    String(
      currentCorrectionRequestSpot["スポットID"] || ""
    ).trim();

  if (!spotId) return;

  saveCorrectionRequestDraft(
    spotId
  );

}

// ======================================================
// 情報修正依頼モーダルを開く
// ======================================================

function openCorrectionRequestModal() {

  closeAllBottomNavModals();

  const modal =
    document.getElementById(
      "correctionRequestModal"
    );

  if (!modal) return;


  const spot =
    window.currentDetailSpot || null;


  if (!spot) {

    showCorrectionRequestToast(
      "修正するスポットを取得できませんでした。"
    );

    return;

  }


  const spotId =
    String(
      spot["スポットID"] || ""
    ).trim();


  if (!spotId) {

    showCorrectionRequestToast(
      "スポットIDを取得できませんでした。"
    );

    return;

  }


  currentCorrectionRequestSpot =
    spot;


  // -----------------------------------------------
  // スポット情報表示
  // -----------------------------------------------

  const categoryElement =
    document.getElementById(
      "correctionRequestCategory"
    );

  const placeNameElement =
    document.getElementById(
      "correctionRequestPlaceName"
    );

  const addressElement =
    document.getElementById(
      "correctionRequestAddress"
    );


  if (categoryElement) {

    categoryElement.textContent =
      String(
        spot["カテゴリ"] || "その他"
      ).trim();

  }


  if (placeNameElement) {

    placeNameElement.textContent =
      String(
        spot["場所名"] || ""
      ).trim();

  }


  if (addressElement) {

    addressElement.textContent =
      String(
        spot["住所"] || ""
      ).trim();

  }


  resetCorrectionRequestForm();


  // -----------------------------------------------
  // スポットごとの履歴を復元
  // -----------------------------------------------

  const draft =
    getCorrectionRequestDraft(
      spotId
    );


  if (
    draft &&
    Array.isArray(draft.items) &&
    draft.items.length > 0
  ) {

    draft.items.forEach(
      item => {

        createCorrectionRequestItem(
          item
        );

      }
    );

  } else {

    createCorrectionRequestItem();

  }


  // -----------------------------------------------
  // 確認項目も復元
  // -----------------------------------------------

  if (draft?.confirmations) {

    document.getElementById(
      "correctionConfirmPersonal"
    ).checked =
      draft.confirmations.noPersonalInfo === true;


    document.getElementById(
      "correctionConfirmPrivate"
    ).checked =
      draft.confirmations.noPrivateSightings === true;


    document.getElementById(
      "correctionConfirmUnrelated"
    ).checked =
      draft.confirmations.relatedInfo === true;


    document.getElementById(
      "correctionConfirmTrouble"
    ).checked =
      draft.confirmations.noTrouble === true;

  }


  modal.classList.add("active");


  requestAnimationFrame(() => {

    document
      .querySelector(
        "#correctionRequestItems .correction-request-type"
      )
      ?.focus();

  });

}

// ======================================================
// 閉じる
// ======================================================

function closeCorrectionRequestModal(event) {

  if (
    event &&
    event.target !== event.currentTarget
  ) {
    return;
  }


  const modal =
    document.getElementById(
      "correctionRequestModal"
    );

  if (!modal) return;


  modal.classList.remove("active");

  currentCorrectionRequestSpot = null;

}


// ======================================================
// フォームリセット
// ======================================================

function resetCorrectionRequestForm() {

  const form =
    document.getElementById(
      "correctionRequestForm"
    );

  if (form) {
    form.reset();
  }


  const container =
    document.getElementById(
      "correctionRequestItems"
    );

  if (container) {
    container.innerHTML = "";
  }


  const status =
    document.getElementById(
      "correctionRequestFormStatus"
    );

  if (status) {

    status.textContent = "";

    status.className =
      "post-form-status";

  }


  const confirmBox =
    document.querySelector(
      "#correctionRequestModal .post-confirm-box"
    );

  if (confirmBox) {

    confirmBox.classList.remove(
      "confirm-error"
    );

  }


  const button =
    document.getElementById(
      "correctionRequestSubmitButton"
    );

  if (button) {

    button.disabled = false;

  }

}

// ======================================================
// GASへ送信
// ======================================================

async function postCorrectionRequestToGas(
  payload
) {

  if (
    !CORRECTION_REQUEST_GAS_WEB_APP_URL ||
    CORRECTION_REQUEST_GAS_WEB_APP_URL.includes(
      "ここに情報修正依頼用GAS"
    )
  ) {

    throw new Error(
      "情報修正依頼用GASのURLが設定されていません。"
    );

  }


  const response =
    await fetch(
      CORRECTION_REQUEST_GAS_WEB_APP_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body:
          JSON.stringify(payload)

      }
    );


  if (!response.ok) {

    throw new Error(
      "GASとの通信に失敗しました。"
    );

  }


  let result;

  try {

    result =
      await response.json();

  } catch (error) {

    throw new Error(
      "GASから正しい応答を受け取れませんでした。"
    );

  }


  return result;

}

// ======================================================
// 送信
// ======================================================

async function handleCorrectionRequestSubmit(
  event
) {

  event.preventDefault();


  setCorrectionRequestFormStatus(
    "",
    ""
  );


  const spot =
    currentCorrectionRequestSpot;


  if (!spot) {

    setCorrectionRequestFormStatus(
      "修正するスポットを取得できませんでした。",
      "error"
    );

    return;

  }


  const spotId =
    String(
      spot["スポットID"] || ""
    ).trim();


  const website =
    document
      .getElementById(
        "correctionRequestWebsite"
      )
      ?.value
      .trim() || "";


  const items =
    getCorrectionRequestItemsFromForm();


  // -----------------------------------------------
  // ハニーポット
  // -----------------------------------------------

  if (website) {

    setCorrectionRequestFormStatus(
      "送信を処理できませんでした。",
      "error"
    );

    return;

  }


  // -----------------------------------------------
  // スポットID
  // -----------------------------------------------

  if (!spotId) {

    setCorrectionRequestFormStatus(
      "スポットIDを取得できませんでした。",
      "error"
    );

    return;

  }


  // -----------------------------------------------
  // 修正項目
  // -----------------------------------------------

  if (items.length === 0) {

    setCorrectionRequestFormStatus(
      "修正する項目を1つ以上入力してください。",
      "error"
    );

    return;

  }


  const hasEmptyItem =
    items.some(
      item =>
        !item.type ||
        !item.content
    );


  if (hasEmptyItem) {

    setCorrectionRequestFormStatus(
      "修正する項目と修正する内容をすべて入力してください。",
      "error"
    );

    return;

  }


  const hasDuplicateType =
    new Set(
      items.map(item => item.type)
    ).size !== items.length;


  if (hasDuplicateType) {

    setCorrectionRequestFormStatus(
      "同じ修正項目を複数指定することはできません。",
      "error"
    );

    return;

  }


  // -----------------------------------------------
  // 確認4項目
  // -----------------------------------------------

  const confirmItems = [

    document.getElementById(
      "correctionConfirmPersonal"
    ),

    document.getElementById(
      "correctionConfirmPrivate"
    ),

    document.getElementById(
      "correctionConfirmUnrelated"
    ),

    document.getElementById(
      "correctionConfirmTrouble"
    )

  ];


  const allConfirmed =
    confirmItems.every(
      checkbox =>
        checkbox &&
        checkbox.checked
    );


  if (!allConfirmed) {

    const confirmBox =
      document.querySelector(
        "#correctionRequestModal .post-confirm-box"
      );


    if (confirmBox) {

      confirmBox.classList.add(
        "confirm-error"
      );

    }


    setCorrectionRequestFormStatus(
      "確認項目をすべて確認してください。",
      "error"
    );

    return;

  }


  const confirmBox =
    document.querySelector(
      "#correctionRequestModal .post-confirm-box"
    );


  if (confirmBox) {

    confirmBox.classList.remove(
      "confirm-error"
    );

  }


  // -----------------------------------------------
  // 送信
  // -----------------------------------------------

  const button =
    document.getElementById(
      "correctionRequestSubmitButton"
    );


  if (button) {
    button.disabled = true;
  }


  setCorrectionRequestFormStatus(
    "情報修正依頼を送信しています…",
    "loading"
  );


  try {

    const result =
      await postCorrectionRequestToGas({

        action:
          "submitCorrectionRequest",

        spotId:
          spotId,

        items:
          items,

        website:
          website,

        confirmations: {

          noPersonalInfo:
            document.getElementById(
              "correctionConfirmPersonal"
            ).checked,

          noPrivateSightings:
            document.getElementById(
              "correctionConfirmPrivate"
            ).checked,

          relatedInfo:
            document.getElementById(
              "correctionConfirmUnrelated"
            ).checked,

          noTrouble:
            document.getElementById(
              "correctionConfirmTrouble"
            ).checked

        }

      });


    if (
      !result ||
      !result.success
    ) {

      setCorrectionRequestFormStatus(
        result?.message ||
        "送信に失敗しました。時間をおいてもう一度お試しください。",
        "error"
      );


      if (button) {
        button.disabled = false;
      }


      return;

    }


    // -----------------------------------------------
    // 成功
    // -----------------------------------------------

    setCorrectionRequestFormStatus(
      "情報修正依頼を送信しました。",
      "success"
    );

    // -----------------------------------------------
    // 投稿履歴に保存
    // -----------------------------------------------

    addPostHistory({

    type: "correction",

    spotId:
        spotId,

    items:
        items.map(item => ({
        type:
            String(
            item.type || ""
            ),

        content:
            String(
            item.content || ""
            )
        }))

    });


    deleteCorrectionRequestDraft(
      spotId
    );


    setTimeout(() => {

      const modal =
        document.getElementById(
          "correctionRequestModal"
        );


      if (modal) {
        modal.classList.remove("active");
      }


      resetCorrectionRequestForm();

      currentCorrectionRequestSpot = null;


      showCorrectionRequestToast(
        "情報修正依頼を送信しました。運営の修正をお待ちください。"
      );

    }, 500);


  } catch (error) {

    console.error(
      "情報修正依頼送信エラー:",
      error
    );


    setCorrectionRequestFormStatus(
      "通信に失敗しました。時間をおいてもう一度お試しください。",
      "error"
    );


    if (button) {
      button.disabled = false;
    }

  }

}

// ======================================================
// ステータス
// ======================================================

function setCorrectionRequestFormStatus(
  message,
  type = ""
) {

  const element =
    document.getElementById(
      "correctionRequestFormStatus"
    );

  if (!element) return;


  element.textContent =
    message;

  element.className =
    "post-form-status";


  if (type) {
    element.classList.add(type);
  }

}


// ======================================================
// 通知
// ======================================================

function showCorrectionRequestToast(
  message
) {

  const toast =
    document.getElementById(
      "correctionRequestToast"
    );

  if (!toast) return;


  toast.textContent =
    message;

  toast.classList.add("show");


  setTimeout(() => {

    toast.classList.remove("show");

  }, 5000);

}

// ======================================================
// 自動保存
// ======================================================

function initCorrectionRequestDraftAutosave() {

  const container =
    document.getElementById(
      "correctionRequestItems"
    );


  if (container) {

    container.addEventListener(
      "input",
      () => {
        saveCurrentCorrectionRequestDraft();
      }
    );


    container.addEventListener(
      "change",
      () => {
        saveCurrentCorrectionRequestDraft();
      }
    );

  }


  const confirmIds = [

    "correctionConfirmPersonal",
    "correctionConfirmPrivate",
    "correctionConfirmUnrelated",
    "correctionConfirmTrouble"

  ];


  confirmIds.forEach(id => {

    const checkbox =
      document.getElementById(id);

    if (!checkbox) return;


    checkbox.addEventListener(
      "change",
      () => {
        saveCurrentCorrectionRequestDraft();
      }
    );

  });

}

function initCorrectionRequest() {

  const addButton =
    document.getElementById(
      "addCorrectionRequestItemButton"
    );


  if (addButton) {

    addButton.addEventListener(
      "click",
      () => {

        createCorrectionRequestItem();

        saveCurrentCorrectionRequestDraft();

      }
    );

  }


  const form =
    document.getElementById(
      "correctionRequestForm"
    );


  if (form) {

    form.addEventListener(
      "submit",
      handleCorrectionRequestSubmit
    );

  }


  initCorrectionRequestDraftAutosave();

}

// ======================================================
// 最新CSVからスポットIDでスポット情報を取得
// ======================================================

async function fetchLatestSpotById(spotId) {

  const targetId =
    String(spotId || "").trim();

  if (!targetId) {
    return null;
  }


  try {

    const cacheBuster =
      `_=${Date.now()}`;

    const csvUrl =
      SPOT_CSV_URL +
      (SPOT_CSV_URL.includes("?") ? "&" : "?") +
      cacheBuster;


    const response =
      await fetch(
        csvUrl,
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        "CSVの取得に失敗しました"
      );

    }


    const text =
      await response.text();


    const parsed =
      Papa.parse(
        text,
        {
          header: true,
          skipEmptyLines: true
        }
      );


    const spot =
      parsed.data.find(
        item =>
          String(
            item["スポットID"] || ""
          ).trim() === targetId
      );


    return spot || null;

  } catch (error) {

    console.warn(
      "最新スポット情報の取得に失敗:",
      error
    );

    return null;

  }

}


// ======================================================
// 投稿履歴
// ======================================================

const POST_HISTORY_STORAGE_KEY =
  "dzlSpotPostHistory";


// ======================================================
// 履歴取得
// ======================================================

function getPostHistory() {

  try {

    const saved =
      localStorage.getItem(
        POST_HISTORY_STORAGE_KEY
      );

    if (!saved) {
      return [];
    }

    const history =
      JSON.parse(saved);

    if (
      !Array.isArray(history)
    ) {
      return [];
    }

    return history;

  } catch (error) {

    console.warn(
      "投稿履歴の読み込みに失敗:",
      error
    );

    return [];

  }

}


// ======================================================
// 履歴保存
// ======================================================

function savePostHistory(
  history
) {

  try {

    localStorage.setItem(
      POST_HISTORY_STORAGE_KEY,
      JSON.stringify(history)
    );

  } catch (error) {

    console.warn(
      "投稿履歴の保存に失敗:",
      error
    );

  }

}


// ======================================================
// 履歴を1件追加
// ======================================================

function addPostHistory(
  historyItem
) {

  if (
    !historyItem ||
    typeof historyItem !== "object"
  ) {
    return;
  }


  const history =
    getPostHistory();


  history.unshift({
    id:
      "history-" +
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .slice(2, 8),

    timestamp:
      new Date().toISOString(),

    ...historyItem

  });


  savePostHistory(
    history
  );

}


// ======================================================
// 日時表示
// ======================================================

function formatPostHistoryDate(
  value
) {

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "";

  }


  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  const hours =
    String(
      date.getHours()
    ).padStart(2, "0");

  const minutes =
    String(
      date.getMinutes()
    ).padStart(2, "0");


  return (
    `${year}/${month}/${day} ` +
    `${hours}:${minutes}`
  );

}


// ======================================================
// 投稿履歴モーダルを開く
// ======================================================

async function openPostHistoryModal() {

  closeAllBottomNavModals();


  const modal =
    document.getElementById(
      "postHistoryModal"
    );


  if (!modal) {
    return;
  }


  modal.classList.add(
    "active"
  );


  // 最新CSVを確認してから履歴を表示
  await renderPostHistory();

}


// ======================================================
// 投稿履歴モーダルを閉じる
// ======================================================

function closePostHistoryModal(
  event
) {

  if (
    event &&
    event.target !== event.currentTarget
  ) {

    return;

  }


  const modal =
    document.getElementById(
      "postHistoryModal"
    );


  if (!modal) {
    return;
  }


  modal.classList.remove(
    "active"
  );

}


// ======================================================
// 履歴表示
// ======================================================

async function renderPostHistory() {

  const container =
    document.getElementById(
      "postHistoryContainer"
    );


  if (!container) {
    return;
  }


  const history =
    getPostHistory();


  // 新しい順
  history.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() -
      new Date(a.timestamp).getTime()
  );


  if (
    history.length === 0
  ) {

    container.innerHTML = `

      <div class="post-history-empty">

        <div class="post-history-empty-icon">
          <span class="material-symbols-outlined">
            pin_history
          </span>
        </div>

        <div class="post-history-empty-title">
          投稿履歴はありません
        </div>

        <div class="post-history-empty-message">
          新規スポット投稿・現地メモ投稿・<br>
          情報修正依頼を送信すると、ここに表示されます。
        </div>

      </div>

    `;

    return;

  }


  // -----------------------------------------------
  // 最新CSVからスポット名を取得
  // -----------------------------------------------

  const spotMap =
    new Map();


  const spotIds =
    [
      ...new Set(
        history
          .map(item =>
            String(
              item.spotId || ""
            ).trim()
          )
          .filter(Boolean)
      )
    ];


  // 複数IDを順番に確認
  for (const spotId of spotIds) {

    const spot =
      await fetchLatestSpotById(
        spotId
      );


    if (spot) {

      spotMap.set(
        spotId,
        spot
      );

    }

  }


  const timeline =
    document.createElement("div");

  timeline.className =
    "post-history-timeline";


  history.forEach(
    item => {

      timeline.appendChild(
        createPostHistoryItem(
          item,
          spotMap
        )
      );

    }
  );


  container.innerHTML = "";

  container.appendChild(
    timeline
  );

}


// ======================================================
// 履歴1件を生成
// ======================================================

function createPostHistoryItem(
  item,
  spotMap
) {

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "post-history-item";


  const dot =
    document.createElement("div");

  dot.className =
    "post-history-dot";


  const card =
    document.createElement("div");

  card.className =
    "post-history-card";


  // -----------------------------------------------
  // 日時
  // -----------------------------------------------

  const date =
    document.createElement("div");

  date.className =
    "post-history-date";

  date.textContent =
    `[${formatPostHistoryDate(item.timestamp)}]`;


  card.appendChild(
    date
  );


  // -----------------------------------------------
  // 種類
  // -----------------------------------------------

  const type =
    document.createElement("div");

  type.className =
    "post-history-type";


  if (
    item.type === "newSpot"
  ) {

    type.textContent =
      "新規スポットを投稿しました";

  } else if (
    item.type === "memo"
  ) {

    type.textContent =
      "現地メモを投稿しました";

  } else if (
    item.type === "correction"
  ) {

    type.textContent =
      "情報修正依頼を送信しました";

  } else {

    type.textContent =
      "投稿しました";

  }


  card.appendChild(
    type
  );


  // -----------------------------------------------
  // スポット
  // -----------------------------------------------

  const spot =
    document.createElement("div");

  spot.className =
    "post-history-spot";


  const spotId =
    String(
      item.spotId || ""
    ).trim();


  const latestSpot =
    spotMap instanceof Map
      ? spotMap.get(spotId)
      : null;


  const placeName =
    latestSpot
      ? String(
          latestSpot["場所名"] || ""
        ).trim()
      : "";


  spot.innerHTML = `

    <span class="post-history-spot-id">
      ${escapeHtml(spotId)}
    </span>

    ${
      placeName
        ? `
          <span class="post-history-spot-name">
            <span
              class="material-symbols-outlined post-history-location-icon"
              aria-hidden="true"
            >
              location_on
            </span>
            ${escapeHtml(placeName)}
          </span>
        `
        : ""
    }

  `;

  card.appendChild(
    spot
  );


  // -----------------------------------------------
  // 現地メモ
  // -----------------------------------------------

  if (
    item.type === "memo" &&
    item.content
  ) {

    const content =
      document.createElement("div");

    content.className =
      "post-history-content";

    content.textContent =
      String(item.content);


    card.appendChild(
      content
    );

  }


  // -----------------------------------------------
  // 情報修正依頼
  // -----------------------------------------------

  if (
    item.type === "correction" &&
    Array.isArray(item.items)
  ) {

    item.items.forEach(
      correctionItem => {

        if (
          !correctionItem ||
          !correctionItem.content
        ) {
          return;
        }


        const correction =
          document.createElement("div");

        correction.className =
          "post-history-correction-item";


        const correctionType =
          document.createElement("div");

        correctionType.className =
          "post-history-correction-type";

        correctionType.textContent =
          correctionItem.type
            ? String(correctionItem.type)
            : "修正内容";


        const correctionContent =
          document.createElement("div");

        correctionContent.textContent =
          String(
            correctionItem.content
          );


        correction.appendChild(
          correctionType
        );

        correction.appendChild(
          correctionContent
        );


        card.appendChild(
          correction
        );

      }
    );

  }


  wrapper.appendChild(
    dot
  );

  wrapper.appendChild(
    card
  );


  return wrapper;

}



// ======================================================
// リリースノートCSV
// ======================================================

const RELEASE_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQYy_PtEIhPRx7qC-n0Yjan12MtkNoeAXnYyjMEBTDP7Lv_gfI2TLKSXnS07AvfDt9B3iNVz5Nie27_/pub?gid=580480056&single=true&output=csv";

// ======================================================
// リリースノート読み込み
// ======================================================

let releaseNoteData = [];
let releaseNoteLoaded = false;
let releaseNoteLoading = false;


// ------------------------------------------------------
// CSVからリリースノートを取得
// ------------------------------------------------------

async function loadReleaseNotes() {

  if (releaseNoteLoading) return releaseNoteData;

  releaseNoteLoading = true;

  try {

    const cacheBuster =
      `_=${Date.now()}`;

    const csvUrl =
      RELEASE_CSV_URL +
      (RELEASE_CSV_URL.includes("?") ? "&" : "?") +
      cacheBuster;

    const response =
      await fetch(
        csvUrl,
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {

      throw new Error(
        "リリースノートCSVの取得に失敗しました"
      );

    }

    const text =
      await response.text();

    const parsed =
      Papa.parse(
        text,
        {
          header: true,
          skipEmptyLines: true
        }
      );

    if (parsed.errors && parsed.errors.length) {

      console.warn(
        "リリースノートCSV解析警告:",
        parsed.errors
      );

    }

    releaseNoteData =
      Array.isArray(parsed.data)
        ? parsed.data
        : [];

    releaseNoteLoaded = true;

    return releaseNoteData;

  } catch (error) {

    console.error(
      "リリースノート読み込みエラー:",
      error
    );

    releaseNoteData = [];

    return [];

  } finally {

    releaseNoteLoading = false;

  }

}

function escapeReleaseHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

// ======================================================
// リリースノート本文整形
// ======================================================

function formatReleaseText(value) {

  const text =
    String(value || "");

  if (!text) return "";

  /*
   * いったんHTMLとして解釈されないように
   * エスケープする
   */
  let result =
    escapeReleaseHtml(text);

  /*
   * <b>...</b> だけ許可する
   *
   * CSV上では
   * <b>重要</b>
   * のように入力する。
   */
  result =
    result
      .replace(
        /&lt;b&gt;([\s\S]*?)&lt;\/b&gt;/gi,
        "<strong>$1</strong>"
      );

  /*
   * スプレッドシート内の改行をそのまま反映
   */
  result =
    result.replace(/\r\n|\r|\n/g, "<br>");

  return result;

}

// ======================================================
// X投稿埋め込み
// ======================================================

function createReleaseXEmbed(html) {

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "release-x-embed";

  const source =
    String(html || "").trim();

  if (!source) {
    return wrapper;
  }

  /*
   * スプレッドシート内のscriptタグは
   * こちらでは実行しない。
   *
   * blockquoteだけ取り出して表示する。
   */
  const blockquoteMatch =
    source.match(
      /<blockquote\b[\s\S]*?<\/blockquote>/i
    );

  if (blockquoteMatch) {

    wrapper.innerHTML =
      blockquoteMatch[0];

  } else {

    /*
     * blockquoteが見つからない場合は
     * 念のため空欄にする。
     */
    wrapper.textContent =
      "X投稿を表示できませんでした。";

  }

  /*
   * Xのwidgets.jsを読み込む。
   */
  loadXWidgets();

  return wrapper;

}

// ======================================================
// X widgets.js読み込み
// ======================================================

let xWidgetsLoading = false;

function loadXWidgets() {

  /*
   * すでに読み込み済みなら
   * 新しくscriptを追加しない。
   */
  if (
    window.twttr &&
    window.twttr.widgets
  ) {

    requestAnimationFrame(() => {

      window.twttr.widgets.load(
        document.getElementById("release")
      );

    });

    return;

  }

  if (xWidgetsLoading) return;

  xWidgetsLoading = true;

  const script =
    document.createElement("script");

  script.src =
    "https://platform.x.com/widgets.js";

  script.async = true;

  script.charset =
    "utf-8";

  script.onload = () => {

    xWidgetsLoading = false;

    if (
      window.twttr &&
      window.twttr.widgets
    ) {

      window.twttr.widgets.load(
        document.getElementById("release")
      );

    }

  };

  document.head.appendChild(script);

}

// ======================================================
// リリースノートのレイアウト
// ======================================================

function createReleaseDetail(row, index) {

  const pattern =
    String(
      row["レイアウトパターン"] || ""
    ).trim();

  const heading =
    String(
      row["詳細見出し"] || ""
    ).trim();

  const body =
    String(
      row["詳細本文"] || ""
    ).trim();


  // ------------------------------------------
  // 本文のみ
  // ------------------------------------------

  if (pattern === "本文のみ") {

    const element =
      document.createElement("div");

    element.className =
      "release-detail-body release-layout-body";

    element.innerHTML =
      formatReleaseText(body);

    return element;

  }


  // ------------------------------------------
  // ナンバー見出し＋説明
  // ------------------------------------------

  if (pattern === "ナンバー見出し＋説明") {

    const element =
      document.createElement("div");

    element.className =
      "release-detail-number";

    element.innerHTML = `
      <div class="release-detail-number-heading">
        <span class="release-detail-number-index">
          ${index + 1}.
        </span>
        <span>
          ${escapeReleaseHtml(heading)}
        </span>
      </div>

      ${
        body
          ? `
            <div class="release-detail-description">
              ${formatReleaseText(body)}
            </div>
          `
          : ""
      }
    `;

    return element;

  }


  // ------------------------------------------
  // リスト見出し＋説明
  // ------------------------------------------

  if (pattern === "リスト見出し＋説明") {

    const element =
      document.createElement("div");

    element.className =
      "release-detail-list";

    element.innerHTML = `
      <div class="release-detail-list-heading">
        <span class="release-detail-list-marker">・</span>
        <span>
          ${escapeReleaseHtml(heading)}
        </span>
      </div>

      ${
        body
          ? `
            <div class="release-detail-description">
              ${formatReleaseText(body)}
            </div>
          `
          : ""
      }
    `;

    return element;

  }


  // ------------------------------------------
  // X投稿埋め込み
  // ------------------------------------------

  if (pattern === "X投稿埋め込み") {

    return createReleaseXEmbed(body);

  }


  // ------------------------------------------
  // 未定義のパターン
  // ------------------------------------------

  const element =
    document.createElement("div");

  element.className =
    "release-detail-body";

  element.innerHTML =
    formatReleaseText(
      body || heading
    );

  return element;

}

// ======================================================
// リリースIDごとのグループ化
// ======================================================

function groupReleaseNotes(rows) {

  const releaseMap =
    new Map();

  rows.forEach(row => {

    const releaseId =
      String(
        row["リリースID"] || ""
      ).trim();

    if (!releaseId) return;

    if (!releaseMap.has(releaseId)) {

      releaseMap.set(
        releaseId,
        {
          id: releaseId,
          title: "",
          category: "",
          version: "",
          createdAt: "",
          updatedAt: "",
          rows: []
        }
      );

    }

    const release =
      releaseMap.get(releaseId);

    /*
     * メタ情報は同じreleaseID内の
     * 最初に値が入っているものを使用
     */
    if (!release.title) {
      release.title =
        String(row["タイトル"] || "").trim();
    }

    if (!release.category) {
      release.category =
        String(row["カテゴリ"] || "").trim();
    }

    if (!release.version) {
      release.version =
        String(row["バージョン"] || "").trim();
    }

    if (!release.createdAt) {
      release.createdAt =
        String(row["作成日"] || "").trim();
    }

    if (!release.updatedAt) {
      release.updatedAt =
        String(row["最終更新日"] || "").trim();
    }

    release.rows.push(row);

  });

  return Array.from(
    releaseMap.values()
  );

}

// ======================================================
// リリースカード生成
// ======================================================

function createReleaseCard(release) {

  const article =
    document.createElement("article");

  article.className =
    "release-note-card";


  // ------------------------------------------
  // ヘッダー
  // ------------------------------------------

  const header =
    document.createElement("div");

  header.className =
    "release-note-card-header";

  header.innerHTML = `

    <div class="release-note-title-row">

      <h3 class="release-note-title">
        ${escapeReleaseHtml(release.title)}
      </h3>

      ${
        release.version
          ? `
            <span class="release-note-version">
              v${escapeReleaseHtml(release.version)}
            </span>
          `
          : ""
      }

    </div>

    <div class="release-note-meta">

      ${
        release.category
          ? `
            <span class="release-note-category">
              ${escapeReleaseHtml(release.category)}
            </span>
          `
          : ""
      }

      ${
        release.createdAt
          ? `
            <span>
              作成日：${escapeReleaseHtml(release.createdAt)}
            </span>
          `
          : ""
      }

      ${
        release.updatedAt
          ? `
            <span>
              最終更新日：${escapeReleaseHtml(release.updatedAt)}
            </span>
          `
          : ""
      }

    </div>

  `;

  article.appendChild(header);


  // ------------------------------------------
  // 本文・グループ
  // ------------------------------------------

  const body =
    document.createElement("div");

  body.className =
    "release-note-card-body";


  /*
   * グループ見出しが空欄の行
   *
   * 例：
   * 本文のみ
   * サイトをリニューアルしました
   */
  const ungroupedRows =
    release.rows.filter(row => {

      return !String(
        row["グループ見出し"] || ""
      ).trim();

    });


  ungroupedRows.forEach((row, index) => {

    const detail =
      createReleaseDetail(
        row,
        index
      );

    body.appendChild(detail);

  });


  // ------------------------------------------
  // グループを作る
  // ------------------------------------------

  const groups =
    new Map();

  release.rows.forEach(row => {

    const groupName =
      String(
        row["グループ見出し"] || ""
      ).trim();

    if (!groupName) return;

    if (!groups.has(groupName)) {

      groups.set(
        groupName,
        []
      );

    }

    groups
      .get(groupName)
      .push(row);

  });


  groups.forEach(
    (rows, groupName) => {

      const group =
        document.createElement("section");

      group.className =
        "release-note-group";


      const groupTitle =
        document.createElement("h4");

      groupTitle.className =
        "release-note-group-title";

      groupTitle.textContent =
        groupName;

      group.appendChild(
        groupTitle
      );


      rows.forEach((row, index) => {

        const detail =
          createReleaseDetail(
            row,
            index
          );

        group.appendChild(
          detail
        );

      });


      body.appendChild(
        group
      );

    }
  );


  article.appendChild(body);

  return article;

}

// ======================================================
// リリースノートの日付を比較用に変換
// ======================================================

function parseReleaseDate(value) {

  const text =
    String(value || "").trim();

  if (!text) {
    return 0;
  }

  /*
   * YYYY/MM/DD
   * YYYY-MM-DD
   * YYYY.MM.DD
   * などを統一
   */
  const normalized =
    text.replace(
      /[./]/g,
      "-"
    );

  const time =
    Date.parse(normalized);

  return Number.isFinite(time)
    ? time
    : 0;

}

// ======================================================
// リリースノート表示
// ======================================================

async function renderReleaseNotes() {

  const container =
    document.getElementById(
      "releaseNoteList"
    );

  if (!container) return;


  container.innerHTML = `
    <div class="release-note-loading">
      <span class="material-symbols-outlined">
        sync
      </span>
      <span>リリースノートを読み込んでいます</span>
    </div>
  `;


  const rows =
    await loadReleaseNotes();


  if (!rows.length) {

    container.innerHTML = `
      <div class="release-note-empty">

        <span class="material-symbols-outlined">
          history
        </span>

        <strong>
          リリースノートがありません
        </strong>

        <p>
          現在表示できる更新履歴はありません。
        </p>

      </div>
    `;

    return;

  }


  const releases =
    groupReleaseNotes(rows);


  // ------------------------------------------
  // 作成日の新しい順に並び替え
  // ------------------------------------------

  releases.sort((a, b) => {

    const dateA =
      String(a.createdAt || "").trim();

    const dateB =
      String(b.createdAt || "").trim();

    /*
    * YYYY/MM/DD
    * YYYY-MM-DD
    * などをDateで比較できる形にする
    */
    const timeA =
      parseReleaseDate(dateA);

    const timeB =
      parseReleaseDate(dateB);

    /*
    * 作成日が新しいものを上にする
    */
    return timeB - timeA;

  });


  container.innerHTML = "";


  releases.forEach(release => {

    container.appendChild(
      createReleaseCard(release)
    );

  });


  /*
   * X投稿があればウィジェットを再変換
   */
  requestAnimationFrame(() => {

    if (
      window.twttr &&
      window.twttr.widgets
    ) {

      window.twttr.widgets.load(
        container
      );

    }

  });

}
