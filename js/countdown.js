(() => {
  "use strict";

  // ========================================
  // 設定
  // ========================================

  const COUNTDOWN_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQeScX6j_3nRvOlYuVa0P4wGG6piBpQ2ZwXzZxEPscII79uBByy9Z8_MDND2wouDZboQQon7XVVN4Gp/pub?gid=998806998&single=true&output=csv";

  const JST_OFFSET = 9 * 60 * 60 * 1000;

  let countdownEvents = [];
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
      /^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/
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

    const dateParts = parseDateParts(row["開催日付"]);
    const timeParts = parseTimeParts(row["開催時間"]);

    const allDay = !(row["開催時間"] || "").trim();

    const startDateParts = parseDateParts(row["公開開始日"]);
    const endDateParts = parseDateParts(row["公開終了日"]);

    // 必須情報や日付が不正な行は表示しない
    if (!name || !dateParts) {
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

      location: (row["場所"] || "").trim(),

      spotURL: safeURL(row["ドズル社スポットリンク"]),

      color: safeColor(row["カード背景カラーコード"]),

      buttons,

      databaseURL: safeURL(
        row["ドズル社データベースリンク"]
      ),

      priority,

      originalIndex: index,

      publishStart,
      publishEnd
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

    const timeHTML = event.allDay
      ? ""
      : `
        <div class="countdown-meta-item">
          <span class="material-symbols-outlined">schedule</span>
          <span>${escapeHTML(timeText)} 開始</span>
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
      const event = countdownEvents[index];

      if (!event) return;

      const remaining = event.eventTimestamp - now;

      const status = card.querySelector(".countdown-status");
      const timer = card.querySelector(".countdown-timer");
      const timerLabel = card.querySelector(".countdown-timer-caption");
      const finishedMessage = card.querySelector(
        ".countdown-finished-message"
      );

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

        status.textContent = "開催前";
        status.className = "countdown-status is-upcoming";

        timer.hidden = false;
        finishedMessage.hidden = true;

        timerLabel.textContent = "開催まで";

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

          finishedMessage.textContent = "🎉 本日開催！";
          status.textContent = "本日開催";
          status.className = "countdown-status is-today";

          return;
        }
      }

      // 時刻が指定されているイベントは当日もカウントダウンし、
      // 開始時刻を過ぎたら開催時刻到来の表示に切り替える
      timer.hidden = true;
      finishedMessage.hidden = false;

      finishedMessage.textContent = event.allDay
        ? "本日開催！"
        : "🎉 開催時刻になりました！";

      status.textContent = event.allDay
        ? "本日開催"
        : "開始時刻";

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

    // indexでイベント本体を参照できるよう、配列を並び順どおりにする
    countdownEvents = countdownEvents.filter(event => {
      return (
        Date.now() >= event.publishStart &&
        Date.now() <= event.publishEnd
      );
    });

    countdownEvents = visibleEvents;

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
