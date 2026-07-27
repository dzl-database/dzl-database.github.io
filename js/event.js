
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
    now.map(createEventCard).join("");

  document.getElementById("eventFutureList").innerHTML =
    future.map(createEventCard).join("");

  document.getElementById("eventPastList").innerHTML =
    past.map(createEventCard).join("");

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

      <div>

        <div class="event-tags">

          ${event.series ? `<span class="event-tag">#${event.series}</span>` : ""}

          ${event.category ? `<span class="event-tag">#${event.category}</span>` : ""}

        </div>

        <h1 class="event-detail-title">

          ${event.title}

        </h1>

        <div class="event-updated">

          更新日：
          ${formatJapaneseDate(event.updated_at)}

        </div>

      </div>

      <div class="event-like-area">

        👍 0

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
          language
        </span>

        リンク

      </h3>

      <div class="detail-link-buttons">

        ${event.special_url
          ? `<a class="main-btn" target="_blank"
              href="${event.special_url}">
              特設サイト
            </a>`
          : ""}

        ${event.official_url
          ? `<a class="main-btn" target="_blank"
              href="${event.official_url}">
              公式サイト
            </a>`
          : ""}

      </div>

    </div>

  </div>

  <div id="eventX1" class="event-x"></div>

  <div id="eventX2" class="event-x"></div>

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
