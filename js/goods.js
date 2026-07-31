// グッズページ専用のJavaScript

let goodsData = [];

fetch(goodsURL)
.then(res=>res.text())
.then(text=>{

  goodsData = parseCSV(text);

  renderGoodsList(goodsData);

  const hash = location.hash.replace("#","");

  if(hash.startsWith("goods_")){

    showGoodsDetail(hash);

  }

});

function formatGoodsPeriod(
  startDate,
  startTime,
  endDate,
  endTime
){

  const start =
    formatJapaneseDate(startDate);

  const end =
    formatJapaneseDate(endDate);

  startTime = startTime?.trim();
  endTime = endTime?.trim();

  // 終了日なし
  if(!endDate){

    if(startTime){

      return `${start} ${startTime}～`;

    }

    return `${start}～`;

  }

  // 同日
  if(startDate===endDate){

    if(startTime && endTime){

      return `${start} ${startTime}～${endTime}`;

    }

    if(startTime){

      return `${start} ${startTime}～`;

    }

    return start;

  }

  let s=start;
  let e=end;

  if(startTime){

    s+=` ${startTime}`;

  }

  if(endTime){

    e+=` ${endTime}`;

  }

  return `${s}～${e}`;

}

function renderGoodsList(goods){

  const now = [];
  const future = [];
  const past = [];

  const today = new Date();

  goods.forEach(item=>{

    const onsiteStart =
      item.onsite_start_date
        ? new Date(item.onsite_start_date + "T00:00:00")
        : null;

    const onsiteEnd =
      item.onsite_end_date
        ? new Date(item.onsite_end_date + "T23:59:59")
        : null;

    const onlineStart =
      item.online_start_date
        ? new Date(item.online_start_date + "T00:00:00")
        : null;

    const onlineEnd =
      item.online_end_date
        ? new Date(item.online_end_date + "T23:59:59")
        : null;

    // 現地販売中
    const onsiteNow =
      onsiteStart &&
      onsiteStart <= today &&
      (!onsiteEnd || onsiteEnd >= today);

    // 通販販売中
    const onlineNow =
      onlineStart &&
      onlineStart <= today &&
      (!onlineEnd || onlineEnd >= today);

    // どちらか販売中
    if(onsiteNow || onlineNow){

      now.push(item);
      return;

    }

    // まだどちらも始まっていない
    const nextStart =
      [onsiteStart, onlineStart]
      .filter(Boolean)
      .sort((a,b)=>a-b)[0];

    if(nextStart && nextStart > today){

      future.push(item);

    }else{

      past.push(item);

    }

  });

  document.getElementById("goodsNowList").innerHTML =
    now.map(createGoodsCard).join("");

  document.getElementById("goodsFutureList").innerHTML =
    future.map(createGoodsCard).join("");

  document.getElementById("goodsPastList").innerHTML =
    past.map(createGoodsCard).join("");

}

function createGoodsCard(goods){

  return `

<div
  class="event-card"
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

  <div class="event-title-row">

    <h3 class="event-title">

      ${goods.title}

    </h3>

  </div>

  <div class="goods-card-info">

    ${
      goods.onsite_start_date
      ? `
      <div class="goods-row">

        <span class="goods-label">

          <strong>現地</strong>

        </span>

        <div>

          <div class="event-meta-row">

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

          <div class="event-meta-row">

            <span class="material-symbols-outlined">
              store
            </span>

            ${goods.onsite_location}

          </div>

        </div>

      </div>
      `
      : ""
    }

    ${
      goods.online_start_date
      ? `
      <div class="goods-row">

        <span class="goods-label">

          <strong>通販</strong>

        </span>

        <div>

          <div class="event-meta-row">

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

          <div class="event-meta-row">

            <span class="material-symbols-outlined">
              shopping_cart
            </span>

            ${goods.online_name}

          </div>

        </div>

      </div>
      `
      : ""
    }

  </div>

  <div class="event-detail-link">

    ▶ 詳細を見る

  </div>

</div>

`;

}

function showGoodsDetail(id){

  const goods =
    goodsData.find(g => g.id === id);

  if(!goods){
    return;
  }

  document.getElementById("goodsDetailContent").innerHTML = `

  <button class="back-btn"
    onclick="showSection('goods')">

    <span class="material-symbols-outlined">
      arrow_back
    </span>

    グッズ一覧へ戻る

  </button>

  <div class="event-detail-card">

    <div class="event-detail-header">

      <div>

        <div class="event-tags">

          ${goods.series
            ? `<span class="event-tag">#${goods.series}</span>`
            : ""}

          ${goods.category
            ? `<span class="event-tag">#${goods.category}</span>`
            : ""}

        </div>

        <h1 class="event-detail-title">

          ${goods.title}

        </h1>

        <div class="event-updated">

          更新日：
          ${formatJapaneseDate(goods.updated_at)}

        </div>

      </div>

      <div class="event-like-area">

        ${createLikeButton(goods.id)}

      </div>

    </div>

    <div
      id="goodsIframely"
      class="event-iframely">
    </div>

    <div class="event-detail-section">

      <h3>

        <span class="material-symbols-outlined">
          description
        </span>

        グッズ概要

      </h3>

      <p>${goods.description}</p>

    </div>

    <div class="event-detail-section">

      <h3>

        <span class="material-symbols-outlined">
          store
        </span>

        販売情報

      </h3>

      <div class="goods-sale-list">

        ${
          goods.onsite_start_date
          ? `
          <div class="goods-sale-card">

            <div class="goods-sale-title">

              現地販売

            </div>

            <p>

              <span class="material-symbols-outlined">
                calendar_month
              </span>

              ${formatGoodsPeriod(
                goods.onsite_start_date,
                goods.onsite_start_time,
                goods.onsite_end_date,
                goods.onsite_end_time
              )}

            </p>

            <p>

              <span class="material-symbols-outlined">
                store
              </span>

              ${goods.onsite_location}

            </p>

          </div>
          `
          : ""
        }

        ${
          goods.online_start_date
          ? `
          <div class="goods-sale-card">

            <div class="goods-sale-title">

              通販

              ${
                goods.sale_type
                ? `<span class="goods-badge">
                    ${goods.sale_type}
                  </span>`
                : ""
              }

              ${
                goods.shipping
                ? `<span class="goods-badge">
                    ${goods.shipping}
                  </span>`
                : ""
              }

            </div>

            <p>

              <span class="material-symbols-outlined">
                calendar_month
              </span>

              ${formatGoodsPeriod(
                goods.online_start_date,
                goods.online_start_time,
                goods.online_end_date,
                goods.online_end_time
              )}

            </p>

            <p>

              <span class="material-symbols-outlined">
                shopping_cart
              </span>

              ${goods.online_name}

            </p>

            ${
              goods.online_url
              ? `
              <div class="detail-link-buttons">

                <a
                  class="main-btn"
                  href="${goods.online_url}"
                  target="_blank">

                  通販サイト

                </a>

              </div>
              `
              : ""
            }

          </div>
          `
          : ""
        }

      </div>

    </div>

  </div>

  <div id="relatedGoods"></div>

  `;

  showSection("goodsDetail", false);

  renderEmbed(
    "goodsIframely",
    goods.iframely_embed
  );

  loadAllLikes();

}

function openGoodsDetail(id){

  history.pushState(
    null,
    "",
    "#" + id
  );

  showGoodsDetail(id);

}

function renderRelatedGoods(event){

  const list = goodsData.filter(g=>

    g.series &&
    g.series===event.series

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