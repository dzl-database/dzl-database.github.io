// グッズページ専用のJavaScript
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