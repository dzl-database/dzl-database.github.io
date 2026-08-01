
// イベントページ専用のJavaScript

let eventData = [];

fetch(eventsURL)
.then(res=>res.text())
.then(text=>{

    eventData = parseCSV(text);

    renderEventList(eventData);

    const hash = location.hash.replace("#","");

    if(hash.startsWith("event_")){
        showEventDetail(hash);
    }

});

function renderEventList(events){

  const now = [];
  const future = [];
  const past = [];

  const today = new Date();

  events.forEach(event=>{

    const start = new Date(event.start_date + "T00:00:00");
    const end = event.end_date
      ? new Date(event.end_date + "T23:59:59")
      : null;

    if(start > today){

      future.push(event);

    }else if(end && end < today){

      // 終了日がある場合だけ終了判定
      past.push(event);

    }else{

      // 終了日なし＝開催中扱い
      now.push(event);

    }

  });

  document.getElementById("eventNowList").innerHTML =
    now.length
      ? now.map(createEventCard).join("")
      : `<div class="no-event-message">
          該当するイベントがありません
        </div>`;

  document.getElementById("eventFutureList").innerHTML =
    future.length
      ? future.map(createEventCard).join("")
      : `<div class="no-event-message">
          該当するイベントがありません
        </div>`;

  document.getElementById("eventPastList").innerHTML =
    past.length
      ? past.map(createEventCard).join("")
      : `<div class="no-event-message">
          該当するイベントがありません
        </div>`;

}

function createEventCard(event){

  return `

<div
  class="event-card"
  onclick="openEventDetail('${event.id}')">

  <div class="event-tags">

    ${
      event.series
      ? `<span class="event-tag">#${event.series}</span>`
      : ""
    }

    ${
      event.category
      ? `<span class="event-tag">#${event.category}</span>`
      : ""
    }

  </div>

  <div class="event-title-row">

    <h3 class="event-title">

      ${event.title}

    </h3>

  </div>

  <p class="event-meta-row">

    <span class="material-symbols-outlined">
      calendar_month
    </span>

    ${formatEventPeriod(event)}

  </p>

  <p class="event-meta-row">

    <span class="material-symbols-outlined">
      location_on
    </span>

    ${event.location}

  </p>

  <div class="event-detail-link">

    ▶ 詳細を見る

  </div>

</div>

`;

}

function showEventDetail(id){

  const event =
    eventData.find(e => e.id === id);

  if(!event){
    return;
  }

  document.getElementById("eventDetailContent").innerHTML = `

  <button class="back-btn"
    onclick="showSection('event')">

    <span class="material-symbols-outlined">
      arrow_back
    </span>

    イベント一覧へ戻る

  </button>

  <div class="event-detail-card">

    <div class="event-detail-header">

      <div class="event-detail-top">

        <div class="event-tags">

          ${event.series ? `<span class="event-tag">#${event.series}</span>` : ""}

          ${event.category ? `<span class="event-tag">#${event.category}</span>` : ""}

        </div>

        <div class="event-like-area">

          ${createLikeButton(event.id)}

        </div>

      </div>

      <h1 class="event-detail-title">

        ${event.title}

      </h1>

      <div class="event-updated">

        更新日：
        ${formatJapaneseDate(event.updated_at)}

      </div>

    </div>

    <div
      id="eventIframely"
      class="event-iframely">
    </div>

    <div class="event-detail-section">

      <h3>

        <span class="material-symbols-outlined">
          description
        </span>

        イベント概要

      </h3>

      <p>${event.description}</p>

    </div>

    <div class="event-detail-section">

      <h3>

        <span class="material-symbols-outlined">
          calendar_month
        </span>

        開催期間

      </h3>

      <p>${formatEventPeriod(event)}</p>

    </div>

    <div class="event-detail-section">

      <h3>

        <span class="material-symbols-outlined">
          location_on
        </span>

        会場

      </h3>

      <p>${event.location}</p>

    </div>

    <div class="event-detail-section">

      <h3>

        <span class="material-symbols-outlined">
          link_2
        </span>

        リンク

      </h3>

      <div class="event-link-list">

        ${
          event.special_url
          ? `
          <a
            class="event-link-card"
            href="${event.special_url}"
            target="_blank">

            <div class="event-link-icon">

              <span class="material-symbols-outlined">
                rocket_launch
              </span>

            </div>

            <div class="event-link-body">

              <div class="event-link-title">

                特設サイト

              </div>

              <div class="event-link-sub">

                イベント特設ページを見る

              </div>

            </div>

            <span class="material-symbols-outlined event-link-arrow">

              open_in_new

            </span>

          </a>
          `
          : ""
        }

        ${
          event.official_url
          ? `
          <a
            class="event-link-card"
            href="${event.official_url}"
            target="_blank">

            <div class="event-link-icon">

              <span class="material-symbols-outlined">
                language
              </span>

            </div>

            <div class="event-link-body">

              <div class="event-link-title">

                公式サイト

              </div>

              <div class="event-link-sub">

                公式ホームページを見る

              </div>

            </div>

            <span class="material-symbols-outlined event-link-arrow">

              open_in_new

            </span>

          </a>
          `
          : ""
        }

      </div>

    </div>
      
    <div class="event-detail-section">

      <h3>

        <span class="material-symbols-outlined">
          share
        </span>

        共有

      </h3>

      <div class="share-buttons">

        <button
          class="share-btn share-btn-x"
          onclick="shareToX('${event.id}')">

          <img
            src="images/x-logo.png"
            class="share-logo-x">

          <span>

            Xで共有する

          </span>

        </button>

        <button
          class="share-btn share-btn-line"
          onclick="shareToLine('${event.id}')">

          <img
            src="images/line-logo.png"
            class="share-logo-line">

          <span>

            LINEで共有する

          </span>

        </button>

        <button
          class="share-btn share-btn-calendar"
          onclick="openCalendarModal(
            '${event.title}',
            '${event.start_date}',
            '${event.end_date}',
            '${event.location}',
            '${event.note || ""}'
          )">

          <span class="material-symbols-outlined">

            event_available

          </span>

          <span>

            Google カレンダーに追加

          </span>

        </button>

      </div>

    </div>

    ${
      event.x_embed_1
      ? `
      <div class="event-detail-section">

        <h3>

          <span class="material-symbols-outlined">
            forum
          </span>

          公式X

        </h3>

        <details
          class="event-x-area"
          ontoggle="toggleXButton(this)">

          <summary class="event-x-summary">

            <span
              class="material-symbols-outlined event-x-toggle-icon">

              expand_more

            </span>

            <span
              class="event-x-toggle-text">

              ポストを見る

            </span>

          </summary>

          <div class="event-x-grid">

            <div id="eventX1" class="event-x"></div>

            <div id="eventX2" class="event-x"></div>

            <div id="eventX3" class="event-x"></div>

          </div>

        </details>

      </div>
      `
      : ""
    }

  </div>

  <div id="relatedEvents"></div>

  <div id="relatedGoods"></div>

  `;

  showSection("eventDetail", false);

  renderEmbed(
    "eventIframely",
    event.iframely_embed
  );

  renderEmbed(
    "eventX1",
    event.x_embed_1
  );

  renderEmbed(
    "eventX2",
    event.x_embed_2
  );

  renderEmbed(
    "eventX3",
    event.x_embed_3
  );

  if(window.twttr?.widgets){

    window.twttr.widgets.load();

  }

  if(window.iframely){

    window.iframely.load();

  }

  loadAllLikes();

  renderRelatedEvents(event);

  renderRelatedGoods(event);

  const details =
    document.querySelector(".event-x-area");

  if(details){

    toggleXButton(details);

  }

}

function openEventDetail(id){

  history.pushState(
    null,
    "",
    "#" + id
  );

  showEventDetail(id);

}

function renderEmbed(id, html){

  const box = document.getElementById(id);

  if(!box){
    return;
  }

  if(!html){

    box.style.display = "none";
    return;

  }

  box.style.display = "";

  box.innerHTML = html;

  box.querySelectorAll("script").forEach(oldScript=>{

    const newScript =
      document.createElement("script");

    [...oldScript.attributes].forEach(attr=>{

      newScript.setAttribute(
        attr.name,
        attr.value
      );

    });

    newScript.text =
      oldScript.text;

    oldScript.replaceWith(newScript);

  });

}

function shareToX(id){

  const event =
    eventData.find(e=>e.id===id);

  if(!event) return;

  const url =
    location.origin +
    location.pathname +
    "#" +
    id;

  const text =
`${event.title}
▼非公式ファンサイトでイベントの詳細を見る
${url}
#ドズル社データベース`;

  window.open(
    "https://twitter.com/intent/tweet"
    + "?text=" + encodeURIComponent(text),
    "_blank"
  );

}

function shareToLine(id){

  const event =
    eventData.find(e => e.id === id);

  if(!event) return;

  const url =
    location.origin +
    location.pathname +
    "#" +
    id;

  const text =
`${event.title}
${url}`;

  window.open(
    "https://line.me/R/msg/text/?"
    + encodeURIComponent(text),
    "_blank"
  );

}

function renderRelatedEvents(event){

  const list = eventData.filter(e=>

    e.id !== event.id &&

    (

      (e.series && e.series===event.series) ||

      (e.category && e.category===event.category)

    )

  );

  const area =
    document.getElementById("relatedEvents");

  if(list.length===0){

    area.innerHTML="";

    return;

  }

  area.innerHTML=`

    <h2 class="related-title">

      関連イベント

    </h2>

    <div class="related-list">

      ${list.map(createRelatedEventCard).join("")}

    </div>

  `;

}

function createRelatedEventCard(event){

  return `

<div
  class="related-card"
  onclick="openEventDetail('${event.id}')">

  <div class="event-tags">

    ${
      event.series
      ? `<span class="event-tag">#${event.series}</span>`
      : ""
    }

    ${
      event.category
      ? `<span class="event-tag">#${event.category}</span>`
      : ""
    }

  </div>

  <div class="related-card-title">

    ${event.title}

  </div>

  <div class="related-card-date">

    <span class="material-symbols-outlined">

      calendar_month

    </span>

    ${formatEventPeriod(event)}

  </div>

  <div class="related-more">

    ▶ 詳細を見る

  </div>

</div>

`;

}

function renderRelatedGoods(event){

  const list = goodsData.filter(g=>

    g.id !== event.id &&

    (

      (g.series && g.series===event.series) ||

      (g.category && g.category===event.category)

    )

  );

  const area =
    document.getElementById("relatedGoods");

  if(list.length===0){

    area.innerHTML="";

    return;

  }

  area.innerHTML=`

    <h2 class="related-title">

      関連グッズ

    </h2>

    <div class="related-list">

      ${list.map(createRelatedGoodsCard).join("")}

    </div>

  `;

}

function createRelatedGoodsCard(goods){

  return `

<div
  class="related-card"
  onclick="openGoodsDetail('${goods.id}')">

  <div class="event-tags">

    ${
      goods.series
      ? `<span class="event-tag">#${goods.series}</span>`
      : ""
    }

    ${
      goods.category
      ? `<span class="event-tag">#${goods.category}</span>`
      : ""
    }

  </div>

  <div class="related-card-title">

    ${goods.title}

  </div>

  ${
    goods.onsite_start_date
    ? `
    <div class="related-card-label">

      <strong>現地</strong>

    </div>

    <div class="related-card-date">

      <span class="material-symbols-outlined">
        calendar_month
      </span>

      ${formatGoodsPeriod(
        goods.onsite_start_date,
        goods.onsite_start_time,
        goods.onsite_end_date,
        goods.onsite_end_time
      )}

    </div>

    <div class="related-card-date">

      <span class="material-symbols-outlined">
        store
      </span>

      ${goods.onsite_location}

    </div>
    `
    : ""
  }

  ${
    goods.online_start_date
    ? `
    <div class="related-card-label">

      <strong>通販</strong>

    </div>

    <div class="related-card-date">

      <span class="material-symbols-outlined">
        calendar_month
      </span>

      ${formatGoodsPeriod(
        goods.online_start_date,
        goods.online_start_time,
        goods.online_end_date,
        goods.online_end_time
      )}

    </div>

    <div class="related-card-date">

      <span class="material-symbols-outlined">
        shopping_cart
      </span>

      ${goods.online_name}

    </div>
    `
    : ""
  }

  <div class="related-more">

    ▶ 詳細を見る

  </div>

</div>

`;

}

function toggleXButton(details){

  const icon =
    details.querySelector(
      ".event-x-toggle-icon"
    );

  const text =
    details.querySelector(
      ".event-x-toggle-text"
    );

  if(details.open){

    icon.textContent =
      "keyboard_arrow_up";

    text.textContent =
      "閉じる";

  }else{

    icon.textContent =
      "keyboard_arrow_down";

    text.textContent =
      "ポストを見る";

  }

}
