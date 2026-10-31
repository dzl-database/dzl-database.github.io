(() => {
  "use strict";

  // ========================================
  // 設定
  // ========================================

  const COUNTDOWN_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQeScX6j_3nRvOlYuVa0P4wGG6piBpQ2ZwXzZxEPscII79uBByy9Z8_MDND2wouDZboQQon7XVVN4Gp/pub?gid=998806998&single=true&output=csv";

  const JST_OFFSET = 9 * 60 * 60 * 1000;

  let countdownEvents = [];
  let visibleCountdownEvents = [];
  let countdownTimer = null;
  let countdownLoadToken = 0;


  // ========================================
  // CSV解析
  // カンマ、ダブルクォート、セル内改行に対応
  // ========================================

  function parseCountdownCSV(text) {
    const rows = [];
    let row = [];
    let value = "";
    let inQuotes = false;

    text = text.replace(/^\uFEFF/, "");

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          value += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        row.push(value);
        value = "";
      } else if ((c === "\n" || c === "\r") && !inQuotes) {
        if (c === "\r" && next === "\n") {
          i++;
        }

        row.push(value);
        rows.push(row);

        row = [];
        value = "";
      } else {
        value += c;
      }
    }

    if (value !== "" || row.length > 0) {
      row.push(value);
      rows.push(row);
    }

    if (!rows.length) {
      return [];
    }

    const headers = rows.shift().map(header => header.trim());

    return rows
      .filter(values => values.some(value => value.trim() !== ""))
      .map(values => {
        const obj = {};

        headers.forEach((header, index) => {
          obj[header] = (values[index] || "").trim();
        });

        return obj;
      });
  }


  // ========================================
  // 日付・時刻
  // 日本時間として扱う
  // ========================================

  function parseDateParts(value) {
    if (!value) return null;

    const match = value.trim().match(
      /^(\d{4})[\\/.-](\d{1,2})[\\/.-](\d{1,2})$/
    );

    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return { year, month, day };
  }


  function parseTimeParts(value) {
    if (!value) return null;

    const match = value.trim().match(
      /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
    );

    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3] || 0);

    if (
      hours > 23 ||
      minutes > 59 ||
      seconds > 59
    ) {
      return null;
    }

    return { hours, minutes, seconds };
  }


  function jstDateToTimestamp(dateParts, timeParts) {
    if (!dateParts) return NaN;

    const time = timeParts || {
      hours: 0,
      minutes: 0,
      seconds: 0
    };

    return Date.UTC(
      dateParts.year,
      dateParts.month - 1,
      dateParts.day,
      time.hours - 9,
      time.minutes,
      time.seconds
    );
  }


  function getJSTNowParts() {
    const now = new Date(Date.now() + JST_OFFSET);

    return {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate()
    };
  }


  function getJSTTodayStart() {
    return jstDateToTimestamp(getJSTNowParts());
  }


  function formatDate(dateParts) {
    if (!dateParts) return "";

    return (
      dateParts.year + "年" +
      dateParts.month + "月" +
      dateParts.day + "日"
    );
  }

  function formatDateSlash(dateParts) {
    if (!dateParts) return "";

    return (
      dateParts.year + "/" +
      String(dateParts.month).padStart(2, "0") + "/" +
      String(dateParts.day).padStart(2, "0")
    );
  }


  function formatTime(timeParts) {
    if (!timeParts) return "";

    return (
      String(timeParts.hours).padStart(2, "0") +
      ":" +
      String(timeParts.minutes).padStart(2, "0")
    );
  }


  // ========================================
  // URL・色の検証
  // ========================================

  function safeURL(value) {
    if (!value) return "";

    try {
      const url = new URL(value.trim());

      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return "";
      }

      return url.href;
    } catch {
      return "";
    }
  }


  function safeColor(value) {
    const color = (value || "").trim();

    if (/^#[0-9a-fA-F]{6}$/.test(color)) {
      return color;
    }

    if (/^#[0-9a-fA-F]{3}$/.test(color)) {
      return color;
    }

    return "#d90000";
  }

  // ========================================
  // カウントダウン背景色の設定
  // ========================================

  // CSSで使用できる色か確認
  function safeBackground(value) {
    const color = (value || "").trim();

    if (!color) return "";

    // 通常の16進数カラーコード
    const isHex = /^#[0-9a-fA-F]{3,8}$/.test(color);

    // linear-gradientのみ許可
    const isGradient =
      /^linear-gradient\([\s\S]*\)$/i.test(color);

    if (!isHex && !isGradient) {
      return "";
    }

    if (!CSS.supports("background", color)) {
      return "";
    }

    return color;
  }


  // 「50日前｜linear-gradient(...)」を解析
  function parseColorRule(value) {
    if (!value) return null;

    const separator = value.indexOf("｜");

    if (separator === -1) {
      return null;
    }

    const dayText = value.slice(0, separator).trim();
    const colorText = value.slice(separator + 1).trim();

    const match = dayText.match(/^(\d+)日前$/);

    if (!match) {
      return null;
    }

    const days = Number(match[1]);
    const color = safeBackground(colorText);

    if (!Number.isSafeInteger(days) || !color) {
      return null;
    }

    return {
      days,
      color
    };
  }


  // イベントに設定された色の変更条件を取得
  function getColorRules(row) {
    return [
      row["カラーコード1"],
      row["カラーコード2"],
      row["カラーコード3"],
      row["カラーコード4"],
      row["カラーコード5"]
    ]
      .map(parseColorRule)
      .filter(Boolean)
      // 日数が小さい順に並べる
      .sort((a, b) => a.days - b.days);
  }


  // 残り時間に応じて背景色を決定
  function getCountdownBackground(event, remaining) {
    let selectedColor = event.color;

    for (const rule of event.colorRules) {
      const threshold = rule.days * 24 * 60 * 60 * 1000;

      if (remaining <= threshold) {
        selectedColor = rule.color;
        break;
      }
    }

    return selectedColor;
  }


  // ========================================
  // リンクボタン
  // 「タイトル｜URL」を分離
  // ========================================

  function parseLinkButton(value) {
    if (!value) return null;

    const separator = value.indexOf("｜");

    if (separator === -1) {
      return null;
    }

    const title = value.slice(0, separator).trim();
    const urlText = value.slice(separator + 1).trim();
    const url = safeURL(urlText);

    if (!title || !url) {
      return null;
    }

    return { title, url };
  }


  // ========================================
  // イベントデータの整形
  // ========================================

  function normalizeCountdownEvent(row, index) {
    const name = (row["イベント名"] || "").trim();

    const dateParts = parseDateParts(row["日付"]);
    const timeParts = parseTimeParts(row["時間"]);

    const allDay = !(row["時間"] || "").trim();

    const expression = (row["表現"] || "").trim();
    const description = (row["説明"] || "").trim();

    const startDateParts = parseDateParts(row["公開開始日"]);
    const endDateParts = parseDateParts(row["公開終了日"]);

    // 必須情報や日付が不正な行は表示しない
    if (!name || !dateParts || !expression) {
      return null;
    }

    // 時刻欄に入力があるのに形式が不正な場合は除外
    if (!allDay && !timeParts) {
      console.warn("カウントダウン：時刻の形式が不正です", name);
      return null;
    }

    const eventTimestamp = jstDateToTimestamp(
      dateParts,
      allDay ? null : timeParts
    );

    // 公開開始・終了日の省略は許容する
    const publishStart = startDateParts
      ? jstDateToTimestamp(startDateParts)
      : -Infinity;

    const publishEnd = endDateParts
      ? jstDateToTimestamp(endDateParts) +
        24 * 60 * 60 * 1000 - 1
      : Infinity;

    if (
      !Number.isFinite(eventTimestamp) ||
      publishStart > publishEnd
    ) {
      return null;
    }

    const priorityText = (row["優先順位"] || "").trim();
    const priorityNumber = Number(priorityText);

    const priority = (
      priorityText !== "" &&
      Number.isFinite(priorityNumber) &&
      priorityNumber > 0
    )
      ? priorityNumber
      : null;

    const buttons = [
      row["リンクボタン1"],
      row["リンクボタン2"],
      row["リンクボタン3"]
    ]
      .map(parseLinkButton)
      .filter(Boolean);

    return {
      name,
      dateParts,
      timeParts: allDay ? null : timeParts,
      allDay,
      eventTimestamp,

      expression,
      description,

      location: (row["場所"] || "").trim(),

      spotURL: safeURL(row["ドズル社スポットリンク"]),

      color: safeColor(row["カード背景カラーコード"]),

      colorRules: getColorRules(row),

      buttons,

      databaseURL: safeURL(
        row["ドズル社データベースリンク"]
      ),

      priority,

      originalIndex: index,

      publishStart,
      publishEnd,
      publishStartDateParts: startDateParts
    };
  }


  // ========================================
  // 表示期間と並び順
  // ========================================

  function getVisibleEvents() {
    const now = Date.now();

    return countdownEvents
      .filter(event => {
        return (
          now >= event.publishStart &&
          now <= event.publishEnd
        );
      })
      .sort((a, b) => {
        // 優先順位ありのイベントを先にする
        if (a.priority !== null && b.priority === null) {
          return -1;
        }

        if (a.priority === null && b.priority !== null) {
          return 1;
        }

        // 両方に優先順位があれば数字の小さい順
        if (a.priority !== null && b.priority !== null) {
          return (
            a.priority - b.priority ||
            a.eventTimestamp - b.eventTimestamp ||
            a.originalIndex - b.originalIndex
          );
        }

        // 優先順位がないイベントは開催日が早い順
        return (
          a.eventTimestamp - b.eventTimestamp ||
          a.originalIndex - b.originalIndex
        );
      });
  }


  // ========================================
  // HTML生成用
  // ========================================

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return map[char];
    });
  }


  function createExternalLink(url, text, className) {
    if (!url) return "";

    return `
      <a
        class="${className}"
        href="${escapeHTML(url)}"
        target="_blank"
        rel="noopener noreferrer">
        ${escapeHTML(text)}
        <span class="material-symbols-outlined">open_in_new</span>
      </a>
    `;
  }


  // ========================================
  // カード生成
  // ========================================

  function createCountdownCard(event, index) {
    const card = document.createElement("article");

    card.className = "countdown-card";
    card.style.setProperty("--event-color", event.color);

    card.dataset.eventIndex = String(index);

    const dateText = formatDate(event.dateParts);
    const timeText = formatTime(event.timeParts);

    // 進捗バーを表示できる条件
    const hasProgressBar =
      Number.isFinite(event.publishStart) &&
      event.eventTimestamp > event.publishStart;

    const progressHTML = hasProgressBar
      ? `
        <div class="countdown-progress-area">
          <div class="countdown-progress-heading">
            <span>${escapeHTML(formatDateSlash(event.publishStartDateParts))} から ${escapeHTML(event.expression)} まで</span>
            <span class="countdown-progress-percent">0%</span>
          </div>

          <div
            class="countdown-progress-track"
            role="progressbar"
            aria-label="イベントまでの進捗"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow="0">
            <div class="countdown-progress-fill"></div>
          </div>
        </div>
      `
      : "";

    const locationHTML = event.location
      ? `
        <div class="countdown-meta-item">
          <span class="material-symbols-outlined">location_on</span>
          ${
            event.spotURL
              ? `
                <a
                  class="countdown-location-link"
                  href="${escapeHTML(event.spotURL)}"
                  target="_blank"
                  rel="noopener noreferrer">
                  <span>${escapeHTML(event.location)}</span>
                  <span class="material-symbols-outlined">open_in_new</span>
                </a>
              `
              : `<span>${escapeHTML(event.location)}</span>`
          }
        </div>
      `
      : "";

    const descriptionHTML = event.description
      ? `
        <div class="countdown-meta-item">
          <span class="material-symbols-outlined">description</span>
          <span class="countdown-description-text">${escapeHTML(event.description)}</span>
        </div>
      `
      : "";

    const timeHTML = event.allDay
      ? ""
      : `
        <div class="countdown-meta-item">
          <span class="material-symbols-outlined">schedule</span>
          <span>${escapeHTML(timeText)} ${escapeHTML(event.expression)}</span>
        </div>
      `;

    const buttonsHTML = event.buttons.length
      ? `
        <div class="countdown-action-buttons">
          ${event.buttons.map(button => `
            <a
              class="countdown-action-button"
              href="${escapeHTML(button.url)}"
              target="_blank"
              rel="noopener noreferrer">
              <span>${escapeHTML(button.title)}</span>
              <span class="material-symbols-outlined">open_in_new</span>
            </a>
          `).join("")}
        </div>
      `
      : "";

    card.innerHTML = `
      <div class="countdown-card-accent"></div>

      <div class="countdown-card-main">

        <div class="countdown-card-heading">
          <div class="countdown-event-date">
            <span class="material-symbols-outlined">event</span>
            ${escapeHTML(dateText)}
          </div>

          <span class="countdown-status"></span>
        </div>

        <h3 class="countdown-event-name">
          ${
            event.databaseURL
              ? `
                <a
                  class="countdown-event-name-link"
                  href="${escapeHTML(event.databaseURL)}"
                  target="_blank"
                  rel="noopener noreferrer">
                  <span>${escapeHTML(event.name)}</span>
                  <span class="material-symbols-outlined">open_in_new</span>
                </a>
              `
              : escapeHTML(event.name)
          }
        </h3>

        <div class="countdown-meta">
          ${timeHTML}
          ${descriptionHTML}
          ${locationHTML}
        </div>

        <div class="countdown-timer-area">

          <div class="countdown-timer-label">
            <span class="material-symbols-outlined">hourglass_top</span>
            <span class="countdown-timer-caption">開催まで</span>
          </div>

          <div class="countdown-timer">
            <div class="countdown-unit">
              <span class="countdown-number" data-unit="days">0</span>
              <span class="countdown-unit-label">日</span>
            </div>

            <span class="countdown-time-separator">:</span>

            <div class="countdown-unit">
              <span class="countdown-number" data-unit="hours">00</span>
              <span class="countdown-unit-label">時間</span>
            </div>

            <span class="countdown-time-separator">:</span>

            <div class="countdown-unit">
              <span class="countdown-number" data-unit="minutes">00</span>
              <span class="countdown-unit-label">分</span>
            </div>

            <span class="countdown-time-separator">:</span>

            <div class="countdown-unit">
              <span class="countdown-number" data-unit="seconds">00</span>
              <span class="countdown-unit-label">秒</span>
            </div>
          </div>

          <div class="countdown-finished-message" hidden></div>

          ${progressHTML}

        </div>

        ${buttonsHTML}

      </div>
    `;

    return card;
  }


  // ========================================
  // カウントダウン更新
  // ========================================

  function updateCountdowns() {
    const now = Date.now();

    document.querySelectorAll(".countdown-card").forEach(card => {
      const index = Number(card.dataset.eventIndex);
      const event = visibleCountdownEvents[index];

      if (!event) return;

      const remaining = event.eventTimestamp - now;

      // 残り時間に応じてカードの背景色を変更
      const backgroundColor = getCountdownBackground(
        event,
        remaining
      );

      card.style.setProperty("--event-color", backgroundColor);

      // 公開開始日からイベント日時までの進捗を計算
      const progressTrack = card.querySelector(
        ".countdown-progress-track"
      );

      if (progressTrack) {
        const progressFill = progressTrack.querySelector(
          ".countdown-progress-fill"
        );

        const progressPercent = card.querySelector(
          ".countdown-progress-percent"
        );

        const totalDuration =
          event.eventTimestamp - event.publishStart;

        const elapsedDuration =
          now - event.publishStart;

        const progress = Math.min(
          100,
          Math.max(
            0,
            (elapsedDuration / totalDuration) * 100
          )
        );

        const roundedProgress = Math.floor(progress);

        progressFill.style.width = `${progress}%`;

        progressTrack.setAttribute(
          "aria-valuenow",
          String(roundedProgress)
        );

        progressPercent.textContent =
          `${roundedProgress}%`;
      }

      const status = card.querySelector(".countdown-status");
      const timer = card.querySelector(".countdown-timer");
      const timerLabel = card.querySelector(".countdown-timer-caption");
      const finishedMessage = card.querySelector(
        ".countdown-finished-message"
      );

      // 表現列の内容に合わせてラベルを設定
      timerLabel.textContent = `${event.expression}まで`;

      if (remaining > 0) {
        const totalSeconds = Math.floor(remaining / 1000);

        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        card.querySelector('[data-unit="days"]').textContent =
          days.toLocaleString("ja-JP");

        card.querySelector('[data-unit="hours"]').textContent =
          String(hours).padStart(2, "0");

        card.querySelector('[data-unit="minutes"]').textContent =
          String(minutes).padStart(2, "0");

        card.querySelector('[data-unit="seconds"]').textContent =
          String(seconds).padStart(2, "0");

        status.textContent = `${event.expression}前`;
        status.className = "countdown-status is-upcoming";

        timer.hidden = false;
        finishedMessage.hidden = true;

        timerLabel.textContent = `${event.expression}まで`;

        return;
      }

      // 終日イベントは開催日0:00を過ぎた時点で当日表示にする
      if (event.allDay) {
        const todayStart = getJSTTodayStart();

        if (
          todayStart <= event.eventTimestamp &&
          now < event.eventTimestamp + 24 * 60 * 60 * 1000
        ) {
          timer.hidden = true;
          finishedMessage.hidden = false;

          finishedMessage.textContent = `${event.expression}当日になりました！`;
          status.textContent = `${event.expression}当日`;
          status.className = "countdown-status is-today";

          return;
        }
      }

      // 時刻が指定されているイベントは当日もカウントダウンし、
      // 開始時刻を過ぎたら開催時刻到来の表示に切り替える
      timer.hidden = true;
      finishedMessage.hidden = false;

      finishedMessage.textContent = event.allDay
        ? `${event.expression}当日になりました！`
        : `${event.expression}時刻になりました！`;

      status.textContent = event.allDay
        ? `${event.expression}当日`
        : `${event.expression}時刻`;

      status.className = "countdown-status is-today";
    });
  }


  // ========================================
  // 画面描画
  // ========================================

  function renderCountdowns() {
    const list = document.getElementById("countdownList");
    const empty = document.getElementById("countdownEmpty");

    if (!list || !empty) return;

    const visibleEvents = getVisibleEvents();

    list.innerHTML = "";

    if (visibleEvents.length === 0) {
      list.hidden = true;
      empty.hidden = false;
      return;
    }

    list.hidden = false;
    empty.hidden = true;

    // 現在表示するイベントだけを別の配列に保存
    visibleCountdownEvents = visibleEvents;

    visibleEvents.forEach((event, index) => {
      list.appendChild(createCountdownCard(event, index));
    });

    updateCountdowns();
  }


  // ========================================
  // CSV取得
  // ========================================

  async function loadCountdownEvents() {
    const list = document.getElementById("countdownList");

    if (!list) return;

    const token = ++countdownLoadToken;

    if (
      !COUNTDOWN_CSV_URL ||
      COUNTDOWN_CSV_URL.includes("ここにカウントダウン用CSV")
    ) {
      list.innerHTML = `
        <div class="countdown-error">
          <span class="material-symbols-outlined">link_off</span>
          <p>カウントダウン用CSVのURLが設定されていません。</p>
        </div>
      `;
      return;
    }

    try {
      const response = await fetch(
        COUNTDOWN_CSV_URL + "&_=" + Date.now(),
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("CSVの取得に失敗しました: " + response.status);
      }

      const csvText = await response.text();

      if (token !== countdownLoadToken) return;

      const rows = parseCountdownCSV(csvText);

      countdownEvents = rows
        .map(normalizeCountdownEvent)
        .filter(Boolean);

      renderCountdowns();

    } catch (error) {
      console.error("カウントダウンの読み込みエラー:", error);

      list.hidden = false;
      list.innerHTML = `
        <div class="countdown-error">
          <span class="material-symbols-outlined">error</span>
          <h3>イベント情報を読み込めませんでした</h3>
          <p>
            CSVの公開設定とURLを確認して、時間をおいて再度お試しください。
          </p>
        </div>
      `;
    }
  }


  // ========================================
  // 公開期間の定期確認
  // ========================================

  function refreshCountdownVisibility() {
    const visibleEvents = getVisibleEvents();

    const currentList = Array.from(
      document.querySelectorAll(".countdown-card")
    );

    const currentNames = currentList.map(card => {
      return card.querySelector(".countdown-event-name")?.textContent || "";
    });

    const nextNames = visibleEvents.map(event => event.name);

    if (JSON.stringify(currentNames) !== JSON.stringify(nextNames)) {
      renderCountdowns();
    }
  }


  // ========================================
  // 初期化
  // ========================================

  function initCountdownPage() {
    loadCountdownEvents();

    if (countdownTimer) {
      clearInterval(countdownTimer);
    }

    // 1秒ごとにカウントダウンを更新
    countdownTimer = setInterval(() => {
      updateCountdowns();
      refreshCountdownVisibility();
    }, 1000);

    // CSVは60秒ごとに再取得
    setInterval(loadCountdownEvents, 60000);
  }


  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCountdownPage);
  } else {
    initCountdownPage();
  }

})();



// ======================================================
// 開催間近・終了間近イベント＆グッズ
// 既存の注目イベント機能とは独立して動作
// ======================================================

(() => {
"use strict";

// ------------------------------------------------------
// CSV URL
// ------------------------------------------------------

const AUTO_EVENT_CSV_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQeScX6j_3nRvOlYuVa0P4wGG6piBpQ2ZwXzZxEPscII79uBByy9Z8_MDND2wouDZboQQon7XVVN4Gp/pub?gid=0&single=true&output=csv";

const AUTO_GOODS_CSV_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQeScX6j_3nRvOlYuVa0P4wGG6piBpQ2ZwXzZxEPscII79uBByy9Z8_MDND2wouDZboQQon7XVVN4Gp/pub?gid=1794976478&single=true&output=csv";

// ------------------------------------------------------
// データ
// ------------------------------------------------------

let autoEvents = [];
let autoGoods = [];

let autoRefreshTimer = null;
let autoLoadTimer = null;

let autoInitialized = false;

// ------------------------------------------------------
// CSV解析
// ------------------------------------------------------

function parseAutoCSV(text) {
const rows = [];

let row = [];
let value = "";
let inQuotes = false;

text = text.replace(/^\uFEFF/, "");

for (let i = 0; i < text.length; i++) {
  const c = text[i];
  const next = text[i + 1];

  if (c === '"') {
    if (inQuotes && next === '"') {
      value += '"';
      i++;
    } else {
      inQuotes = !inQuotes;
    }

  } else if (c === "," && !inQuotes) {
    row.push(value);
    value = "";

  } else if ((c === "\n" || c === "\r") && !inQuotes) {
    if (c === "\r" && next === "\n") {
      i++;
    }

    row.push(value);
    rows.push(row);

    row = [];
    value = "";

  } else {
    value += c;
  }
}

if (value !== "" || row.length > 0) {
  row.push(value);
  rows.push(row);
}

if (!rows.length) return [];

const headers = rows.shift().map(value => value.trim());

return rows
  .filter(values => values.some(value => value.trim() !== ""))
  .map(values => {
    const obj = {};

    headers.forEach((header, index) => {
      obj[header] = (values[index] || "").trim();
    });

    return obj;
  });

}

// ------------------------------------------------------
// 日付・時刻
// ------------------------------------------------------

function parseAutoDate(value) {
if (!value) return null;

const match = value.trim().match(
  /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/
);

if (!match) return null;

const year = Number(match[1]);
const month = Number(match[2]);
const day = Number(match[3]);

const date = new Date(Date.UTC(year, month - 1, day));

if (
  date.getUTCFullYear() !== year ||
  date.getUTCMonth() !== month - 1 ||
  date.getUTCDate() !== day
) {
  return null;
}

return { year, month, day };

}

function parseAutoTime(value) {
if (!value) return null;

const match = value.trim().match(
  /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
);

if (!match) return null;

const hours = Number(match[1]);
const minutes = Number(match[2]);
const seconds = Number(match[3] || 0);

if (
  hours > 23 ||
  minutes > 59 ||
  seconds > 59
) {
  return null;
}

return { hours, minutes, seconds };

}

function autoDateToTimestamp(date, time) {
if (!date) return NaN;

const t = time || {
  hours: 0,
  minutes: 0,
  seconds: 0
};

return Date.UTC(
  date.year,
  date.month - 1,
  date.day,
  t.hours - 9,
  t.minutes,
  t.seconds
);

}

function autoEndOfDay(date, time) {
if (!date) return NaN;

// 終了時間がなければ、その日の23:59:59
return autoDateToTimestamp(
  date,
  time || {
    hours: 23,
    minutes: 59,
    seconds: 59
  }
);

}

function formatAutoDate(date) {
if (!date) return "";

return (
  date.year + "年" +
  date.month + "月" +
  date.day + "日"
);

}

function formatAutoTime(time) {
if (!time) return "";

return (
  String(time.hours).padStart(2, "0") +
  ":" +
  String(time.minutes).padStart(2, "0")
);

}

// ------------------------------------------------------
// URL
// ------------------------------------------------------

function safeAutoURL(value) {
if (!value) return "";

try {
  const url = new URL(value.trim());

  if (
    url.protocol !== "https:" &&
    url.protocol !== "http:"
  ) {
    return "";
  }

  return url.href;

} catch {
  return "";
}

}

function autoEscapeHTML(value) {
return String(value || "").replace(/[&<>"']/g, char => {
const map = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

  return map[char];
});

}

// ------------------------------------------------------
// イベントデータ
// ------------------------------------------------------

function normalizeAutoEvent(row, index) {
const title = (row["title"] || "").trim();

const startDate = parseAutoDate(row["start_date"]);
const startTime = parseAutoTime(row["start_time"]);

const endDate = parseAutoDate(row["end_date"]);
const endTime = parseAutoTime(row["end_time"]);

if (!title || !startDate) {
  return null;
}

if (row["start_time"] && !startTime) {
  console.warn("イベント開始時間が不正です:", title);
  return null;
}

if (row["end_time"] && !endTime) {
  console.warn("イベント終了時間が不正です:", title);
  return null;
}

const startTimestamp = autoDateToTimestamp(
  startDate,
  startTime
);

const endTimestamp = endDate
  ? autoEndOfDay(endDate, endTime)
  : NaN;

if (
  endDate &&
  (
    !Number.isFinite(endTimestamp) ||
    endTimestamp < startTimestamp
  )
) {
  return null;
}

return {
  type: "event",
  title,
  startDate,
  startTime,
  endDate,
  endTime,
  startTimestamp,
  endTimestamp,

  location: (row["location"] || "").trim(),

  specialURL: safeAutoURL(row["special_url"]),
  officialURL: safeAutoURL(row["official_url"]),

  originalIndex: index
};

}

// ------------------------------------------------------
// グッズデータ
// 現地販売・通販を別々に扱う
// ------------------------------------------------------

function normalizeAutoGoods(row, index) {
const title = (row["title"] || "").trim();

if (!title) return [];

const detailURL = safeAutoURL(row["detail_link"]);

const offers = [];

// 現地販売
const onsiteStartDate = parseAutoDate(
  row["onsite_start_date"]
);

const onsiteStartTime = parseAutoTime(
  row["onsite_start_time"]
);

const onsiteEndDate = parseAutoDate(
  row["onsite_end_date"]
);

const onsiteEndTime = parseAutoTime(
  row["onsite_end_time"]
);

if (
  row["onsite_start_time"] &&
  !onsiteStartTime
) {
  console.warn("現地販売開始時間が不正です:", title);

} else if (
  row["onsite_end_time"] &&
  !onsiteEndTime
) {
  console.warn("現地販売終了時間が不正です:", title);

} else if (onsiteStartDate) {
  const startTimestamp = autoDateToTimestamp(
    onsiteStartDate,
    onsiteStartTime
  );

  const endTimestamp = onsiteEndDate
    ? autoEndOfDay(onsiteEndDate, onsiteEndTime)
    : NaN;

  if (
    Number.isFinite(startTimestamp) &&
    (
      !onsiteEndDate ||
      endTimestamp >= startTimestamp
    )
  ) {
    offers.push({
      type: "goods",
      method: "現地販売",
      title,
      startDate: onsiteStartDate,
      startTime: onsiteStartTime,
      endDate: onsiteEndDate,
      endTime: onsiteEndTime,
      startTimestamp,
      endTimestamp,
      place: (row["onsite_location"] || "").trim(),
      detailURL,
      shopURL: "",
      originalIndex: index
    });
  }
}


// 通販
const onlineStartDate = parseAutoDate(
  row["online_start_date"]
);

const onlineStartTime = parseAutoTime(
  row["online_start_time"]
);

const onlineEndDate = parseAutoDate(
  row["online_end_date"]
);

const onlineEndTime = parseAutoTime(
  row["online_end_time"]
);

if (
  row["online_start_time"] &&
  !onlineStartTime
) {
  console.warn("通販開始時間が不正です:", title);

} else if (
  row["online_end_time"] &&
  !onlineEndTime
) {
  console.warn("通販終了時間が不正です:", title);

} else if (onlineStartDate) {
  const startTimestamp = autoDateToTimestamp(
    onlineStartDate,
    onlineStartTime
  );

  const endTimestamp = onlineEndDate
    ? autoEndOfDay(onlineEndDate, onlineEndTime)
    : NaN;

  if (
    Number.isFinite(startTimestamp) &&
    (
      !onlineEndDate ||
      endTimestamp >= startTimestamp
    )
  ) {
    offers.push({
      type: "goods",
      method: "通販",
      title,
      startDate: onlineStartDate,
      startTime: onlineStartTime,
      endDate: onlineEndDate,
      endTime: onlineEndTime,
      startTimestamp,
      endTimestamp,
      place: (row["online_name"] || "").trim(),
      detailURL,
      shopURL: safeAutoURL(row["online_url"]),
      originalIndex: index
    });
  }
}

return offers;

}

// ------------------------------------------------------
// 最も近いイベント・販売方法を取得
// ------------------------------------------------------

function getNearestUpcoming(items, now) {
return items
.filter(item => item.startTimestamp > now)
.sort((a, b) => {
return (
a.startTimestamp - b.startTimestamp ||
a.originalIndex - b.originalIndex
);
})[0] || null;
}

function getNearestEnding(items, now) {
return items
.filter(item => {
return (
Number.isFinite(item.endTimestamp) &&
item.startTimestamp <= now &&
now <= item.endTimestamp
);
})
.sort((a, b) => {
return (
a.endTimestamp - b.endTimestamp ||
a.originalIndex - b.originalIndex
);
})[0] || null;
}

// ------------------------------------------------------
// リンクHTML
// ------------------------------------------------------

function createAutoLink(url, label) {
if (!url) return "";

return `
  <a
    class="countdown-auto-link"
    href="${autoEscapeHTML(url)}"
    target="_blank"
    rel="noopener noreferrer">
    ${autoEscapeHTML(label)}
    <span class="material-symbols-outlined">open_in_new</span>
  </a>
`;

}

// ------------------------------------------------------
// カードHTML
// ------------------------------------------------------

function createAutoCard(item, mode) {
const isUpcoming = mode === "upcoming";

const targetTimestamp = isUpcoming
  ? item.startTimestamp
  : item.endTimestamp;

const date = isUpcoming
  ? item.startDate
  : item.endDate;

const time = isUpcoming
  ? item.startTime
  : item.endTime;

const dateLabel = isUpcoming
  ? "開始日"
  : "終了日";

const timeLabel = isUpcoming
  ? "開始時間"
  : "終了時間";

const timerLabel = isUpcoming
  ? "開始まで"
  : "終了まで";

const methodHTML = item.method
  ? `
    <span class="countdown-auto-method">
      ${autoEscapeHTML(item.method)}
    </span>
  `
  : "";

const locationHTML = item.location || item.place
  ? `
    <div class="countdown-auto-meta">
      <span class="material-symbols-outlined">
        ${item.method === "通販" ? "storefront" : "location_on"}
      </span>
      <span>
        ${autoEscapeHTML(item.location || item.place)}
      </span>
    </div>
  `
  : "";

const timeHTML = time
  ? `
    <div class="countdown-auto-meta">
      <span class="material-symbols-outlined">schedule</span>
      <span>${timeLabel}：${formatAutoTime(time)}</span>
    </div>
  `
  : "";

const links = [];

if (item.specialURL) {
  links.push(createAutoLink(item.specialURL, "特設サイト"));
}

if (item.officialURL) {
  links.push(createAutoLink(item.officialURL, "公式サイト"));
}

if (item.detailURL) {
  links.push(createAutoLink(item.detailURL, "詳細を見る"));
}

if (item.shopURL) {
  links.push(createAutoLink(item.shopURL, "通販サイト"));
}

const card = document.createElement("article");

card.className = "countdown-auto-card";

card.innerHTML = `
  <div class="countdown-auto-card-main">

    <div class="countdown-auto-card-top">
      <span class="countdown-auto-date">
        <span class="material-symbols-outlined">calendar_today</span>
        ${dateLabel}：${autoEscapeHTML(formatAutoDate(date))}
      </span>

      ${methodHTML}
    </div>

    <h4 class="countdown-auto-title">
      ${autoEscapeHTML(item.title)}
    </h4>

    ${timeHTML}
    ${locationHTML}

    <div class="countdown-auto-timer-area">

      <div class="countdown-auto-timer-label">
        <span class="material-symbols-outlined">hourglass_top</span>
        ${timerLabel}
      </div>

      <div class="countdown-auto-timer"
        data-target="${targetTimestamp}"
        data-mode="${mode}">

        <span data-auto-days>0</span>
        <small>日</small>

        <span data-auto-hours>00</span>
        <small>時間</small>

        <span data-auto-minutes>00</span>
        <small>分</small>

        <span data-auto-seconds>00</span>
        <small>秒</small>

      </div>

      <div class="countdown-auto-finished" hidden></div>

    </div>

    ${links.length
      ? `<div class="countdown-auto-links">${links.join("")}</div>`
      : ""
    }

  </div>
`;

return card;

}

// ------------------------------------------------------
// カードの表示・非表示
// ------------------------------------------------------

function setAutoCard(item, mode, itemId, cardId) {
const itemElement = document.getElementById(itemId);
const cardElement = document.getElementById(cardId);

if (!itemElement || !cardElement) return false;

cardElement.innerHTML = "";

if (!item) {
  itemElement.hidden = true;
  return false;
}

cardElement.appendChild(createAutoCard(item, mode));
itemElement.hidden = false;

return true;

}

function renderAutoCards() {
const now = Date.now();

const upcomingEvent = getNearestUpcoming(
  autoEvents,
  now
);

const endingEvent = getNearestEnding(
  autoEvents,
  now
);

const upcomingGoods = getNearestUpcoming(
  autoGoods,
  now
);

const endingGoods = getNearestEnding(
  autoGoods,
  now
);


const hasUpcomingEvent = setAutoCard(
  upcomingEvent,
  "upcoming",
  "upcomingEventItem",
  "upcomingEventCard"
);

const hasUpcomingGoods = setAutoCard(
  upcomingGoods,
  "upcoming",
  "upcomingGoodsItem",
  "upcomingGoodsCard"
);

const hasEndingEvent = setAutoCard(
  endingEvent,
  "ending",
  "endingEventItem",
  "endingEventCard"
);

const hasEndingGoods = setAutoCard(
  endingGoods,
  "ending",
  "endingGoodsItem",
  "endingGoodsCard"
);


const upcomingSection = document.getElementById(
  "upcomingAutoSection"
);

const endingSection = document.getElementById(
  "endingAutoSection"
);

if (upcomingSection) {
  upcomingSection.hidden = !(
    hasUpcomingEvent || hasUpcomingGoods
  );
}

if (endingSection) {
  endingSection.hidden = !(
    hasEndingEvent || hasEndingGoods
  );
}

updateAutoCountdowns();

}

// ------------------------------------------------------
// カウントダウン更新
// ------------------------------------------------------

function updateAutoCountdowns() {
const now = Date.now();

document.querySelectorAll(
  ".countdown-auto-timer"
).forEach(timer => {

  const target = Number(timer.dataset.target);
  const mode = timer.dataset.mode;

  const remaining = target - now;

  const card = timer.closest(".countdown-auto-card");

  if (!card) return;

  const finished = card.querySelector(
    ".countdown-auto-finished"
  );

  if (remaining <= 0) {
    timer.hidden = true;
    finished.hidden = false;

    finished.textContent = mode === "upcoming"
      ? "開始時刻になりました！"
      : "終了時刻になりました！";

    return;
  }

  timer.hidden = false;
  finished.hidden = true;

  const totalSeconds = Math.floor(
    remaining / 1000
  );

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  timer.querySelector("[data-auto-days]").textContent =
    days.toLocaleString("ja-JP");

  timer.querySelector("[data-auto-hours]").textContent =
    String(hours).padStart(2, "0");

  timer.querySelector("[data-auto-minutes]").textContent =
    String(minutes).padStart(2, "0");

  timer.querySelector("[data-auto-seconds]").textContent =
    String(seconds).padStart(2, "0");
});

}

// ------------------------------------------------------
// CSV取得
// ------------------------------------------------------

async function fetchAutoCSV(url) {
const response = await fetch(
url + "&_=" + Date.now(),
{ cache: "no-store" }
);

if (!response.ok) {
  throw new Error("CSV取得失敗: " + response.status);
}

return parseAutoCSV(await response.text());

}

async function loadAutoEvents() {
try {
const rows = await fetchAutoCSV(
AUTO_EVENT_CSV_URL
);

  autoEvents = rows
    .map(normalizeAutoEvent)
    .filter(Boolean);

} catch (error) {
  console.error(
    "開催間近・終了間近イベントの読み込みエラー:",
    error
  );
}

renderAutoCards();

}

async function loadAutoGoods() {
try {
const rows = await fetchAutoCSV(
AUTO_GOODS_CSV_URL
);

  autoGoods = rows.flatMap(normalizeAutoGoods);

} catch (error) {
  console.error(
    "開催間近・終了間近グッズの読み込みエラー:",
    error
  );
}

renderAutoCards();

}

// ------------------------------------------------------
// 初期化
// ------------------------------------------------------

function initAutoCountdowns() {
if (autoInitialized) return;

if (
  !document.getElementById("upcomingAutoSection") ||
  !document.getElementById("endingAutoSection")
) {
  return;
}

autoInitialized = true;

loadAutoEvents();
loadAutoGoods();

if (autoRefreshTimer) {
  clearInterval(autoRefreshTimer);
}

if (autoLoadTimer) {
  clearInterval(autoLoadTimer);
}

// 1秒ごとに残り時間を更新
autoRefreshTimer = setInterval(() => {
  updateAutoCountdowns();
  renderAutoCards();
}, 1000);

// CSVは60秒ごとに再取得
autoLoadTimer = setInterval(() => {
  loadAutoEvents();
  loadAutoGoods();
}, 60000);

}

if (document.readyState === "loading") {
document.addEventListener(
"DOMContentLoaded",
initAutoCountdowns
);
} else {
initAutoCountdowns();
}

})();
