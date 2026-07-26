
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
      : start;

    if(start > today){

      future.push(event);

    }else if(end < today){

      past.push(event);

    }else{

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

    <h2>${event.title}</h2>

    <p>${formatEventPeriod(event)}</p>

    <p>${event.location}</p>

    <p>${event.description}</p>

  `;

  showSection("eventDetail", false);

}

function openEventDetail(id){

  history.pushState(
    null,
    "",
    "#" + id
  );

  showEventDetail(id);

}
