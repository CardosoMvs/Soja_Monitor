
(function () {
  "use strict";
  var fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

  /* cores indicativas por classe (não oficiais MapBiomas) */
  var CORES = {
    3: "#2e7d5b", 4: "#79c486", 6: "#5fb37a", 9: "#6f8fb5", 11: "#7aa6c2",
    12: "#a8c48a", 13: "#c9dfae", 15: "#d9c87c", 21: "#9aa5a0", 24: "#c06058",
    25: "#b9b1a3", 30: "#8d9298", 31: "#5f7fa8", 33: "#7aa6c2", 40: "#e2b93b",
    41: "#dcc06a", 48: "#c49a4f", 49: "#4d9e78", 50: "#90c290", 75: "#b58fb5",
    91: "#8f9d95", 62: "#c9b6d9"
  };
  var PALETA = ["#2e7d5b", "#d9c87c", "#9aa5a0", "#dcc06a", "#6f8fb5", "#a8c48a", "#c06058", "#e2b93b", "#5fb37a", "#b58fb5"];
  function corCls(c) {
    if (CORES[c.classe_id] != null) return CORES[c.classe_id];
    var h = 0, s = String(c.classe);
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETA[h % PALETA.length];
  }

  function ha(v) { return fmt.format(Math.round(v || 0)) + " ha"; }
  function resumo(v) {
    v = v || 0;
    if (v >= 1e6) return (v / 1e6).toFixed(2).replace(".", ",") + " M ha";
    if (v >= 1e4) return Math.round(v / 1e3) + " mil ha";
    if (v >= 1e3) return (v / 1e3).toFixed(1).replace(".", ",") + " mil ha";
    return fmt.format(Math.round(v)) + " ha";
  }

  var ES = DADOS.estados;
  var ok = ES.filter(function (e) { return e.comDados; });
  var zero = ES.filter(function (e) { return !e.comDados; });
  var T = {
    virou: ok.reduce(function (a, e) { return a + e.virou; }, 0),
    deixou: ok.reduce(function (a, e) { return a + e.deixou; }, 0),
    perm: ok.reduce(function (a, e) { return a + e.perm; }, 0)
  };
  document.getElementById("badge-valor").textContent = resumo(T.virou);
  document.getElementById("st-virou").textContent = resumo(T.virou);
  document.getElementById("st-deixou").textContent = resumo(T.deixou);
  document.getElementById("st-perm").textContent = resumo(T.perm);
  document.getElementById("st-saldo").textContent = resumo(T.virou - T.deixou);
  document.getElementById("st-ufs").textContent = ok.length + " de 27";
  document.getElementById("cob-ok").textContent = ok.filter(function (e) { return e.ano !== "2025"; }).length + " UFs";
  document.getElementById("cob-zero").textContent = zero.map(function (e) { return e.label; }).join(" · ") || "—";
  var pctOk = Math.round(100 * ok.length / ES.length);
  document.getElementById("trk-ok").style.width = pctOk + "%";

  /* ranking */
  var rank = ok.slice().sort(function (a, b) { return b.virou - a.virou; });
  var maxV = rank.length ? rank[0].virou : 1;
  var maxD = ok.reduce(function (a, e) { return Math.max(a, e.deixou); }, 0) || 1;
  var html = "", ordem = 0;
  rank.forEach(function (e) {
    ordem++;
    var wV = Math.max(1.5, 100 * e.virou / maxV);
    html += '<div class="rank-row"><div class="rank-head">'
      + '<span class="pos num">' + String(ordem).padStart(2, "0") + '</span>'
      + '<span class="uf">' + e.label + (e.ano === "2025" ? ' <small style="color:var(--vazio)">· 2025</small>' : '') + '</span>'
      + '<span class="val num">' + resumo(e.virou) + '</span></div>'
      + '<div class="bars"><div class="bar-track"><div class="bar" style="width:' + wV + '%"></div></div>';
    if (e.deixou > 0) {
      var wD = Math.max(1.5, 100 * e.deixou / maxD);
      html += '<div class="bar-track"><div class="bar deixou" style="width:' + wD + '%"></div></div>';
    } else {
      html += '<div class="bar-track"><div class="bar-zero-fill"></div></div>';
    }
    html += '</div></div>';
  });
  document.getElementById("rank-list").innerHTML = html;

  /* composição Brasil (virou) */
  var br = {};
  ok.forEach(function (e) {
    e.virou_classes.forEach(function (c) {
      var k = c.classe_id + "|" + c.classe;
      br[k] = (br[k] || 0) + c.area;
    });
  });
  var comps = Object.keys(br).map(function (k) {
    var p = k.split("|");
    return { classe: p[1], id: +p[0], area: br[k] };
  }).sort(function (a, b) { return b.area - a.area; });
  var top = comps.slice(0, 8), resto = comps.slice(8);
  var segs = top.concat([{ classe: "Outras classes", id: null, area: resto.reduce(function (a, c) { return a + c.area; }, 0) }]);
  var barEl = document.getElementById("comp-bar");
  barEl.innerHTML = segs.map(function (c) {
    var cor = c.id === null ? "#c3cdc6" : CORES[c.id] || corCls(c);
    return '<span class="seg" style="flex:' + c.area.toFixed(2) + ';background:' + cor + '" title="' + c.classe + '"></span>';
  }).join("");
  document.getElementById("comp-legend").innerHTML = segs.map(function (c) {
    var cor = c.id === null ? "#c3cdc6" : CORES[c.id] || corCls(c);
    return '<div class="comp-item"><span class="sw" style="background:' + cor + '"></span>'
      + '<span class="nm">' + c.classe + '</span><span class="pv num">' + (100 * c.area / T.virou).toFixed(1).replace(".", ",") + '%</span></div>';
  }).join("");

  /* ficha por estado */
  var sel = document.getElementById("estado-select");
  rank.forEach(function (e, i) {
    var o = document.createElement("option");
    o.value = e.uf;
    o.textContent = String(i + 1).padStart(2, "0") + " · " + e.label + " — " + resumo(e.virou);
    sel.appendChild(o);
  });
  var alvo = rank[0] ? rank[0].uf : null;
  sel.value = alvo;

  function renderEstado() {
    var e = ES.filter(function (x) { return x.uf === sel.value || x.label === sel.value; })[0]
      || ES.filter(function (x) { return x.comDados; })[0];
    var panel = document.getElementById("state-panel");
    if (!e || (!e.virou && !e.deixou && !e.perm)) {
      panel.innerHTML = '<div class="state-empty">Sem dados processados para esta unidade federativa ainda — a linha entrará na página quando o levantamento for concluído.</div>';
      return;
    }
    var tot = '<div class="state-tot">'
      + '<div class="kv"><div class="k">Virou soja</div><div class="n num">' + ha(e.virou) + '</div></div>'
      + '<div class="kv"><div class="k">Deixou de ser soja</div><div class="n num">' + ha(e.deixou) + '</div></div>'
      + '<div class="kv"><div class="k">Permaneceu soja</div><div class="n num">' + ha(e.perm) + '</div></div>'
      + '<div class="kv"><div class="k">Saldo</div><div class="n num">' + ha(e.virou - e.deixou) + '</div></div>'
      + '</div>';
    function coluna(titulo, hint, classes, emptyMsg) {
      if (!classes.length) return '<div class="state-cols-col"><h3>' + titulo + '</h3><p class="hint">' + emptyMsg + '</p></div>';
      var max = classes[0].area;
      return '<div class="state-cols-col"><h3>' + titulo + '</h3><p class="hint">' + hint + '</p>'
        + '<div class="cls-list">' + classes.slice(0, 10).map(function (c) {
          var cor = CORES[c.classe_id] || corCls(c);
          return '<div class="cls-item"><span class="sw" style="background:' + cor + '"></span>'
            + '<div class="line"><span class="nm">' + c.classe + '</span><span class="v num">' + ha(c.area) + '</span></div>'
            + '<div class="cbar"><i style="width:' + Math.max(1.5, 100 * c.area / max).toFixed(1) + '%;background:' + cor + '"></i></div></div>';
        }).join("") + '</div></div>';
    }
    panel.innerHTML = tot
      + '<div class="state-cols">'
      + coluna("Origem da soja nova", "Em que uso a terra estava antes de virar soja (2018).", e.virou_classes, "Nenhuma área virou soja nesta UF na janela analisada.")
      + coluna("Destino da soja perdida", "Para qual uso a terra foi quando deixou de ser soja (2024).", e.deixou_classes, "Nenhuma área deixou de ser soja nesta UF na janela analisada.")
      + '</div>';
  }
  sel.addEventListener("change", renderEstado);
  renderEstado();
})();
