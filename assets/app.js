/* Экраны BYRAIN PRO. Один контейнер #app, перерисовка на каждое действие.
   Визуальный код взят с byrain.ru: бумага, чернила, глубокие тона секций,
   акцент исследований. Фирменные фотографии подключены из assets/img. */

const $ = (sel, root) => (root || document).querySelector(sel);
const app = () => $("#app");

/* Стенд живёт в двух местах: отдельной страницей и внутри Claude Artifacts.
   В песочнице Artifacts нет системных диалогов, печати и скачивания файлов,
   поэтому те же действия сделаны прямо на странице. */
const HOST = window.BYRAIN_HOST === "artifact" ? "artifact" : "standalone";
const CAN_PRINT = HOST === "standalone";
const CAN_DOWNLOAD = HOST === "standalone";

let ASK_RESET = false;   // подтверждение сброса демо
let ASK_BLOCK = null;    // id пользователя, которого блокируем
let CSV_VIEW = null;     // { orderId, text } выгрузка кодов маркировки
let REG = null;          // черновик регистрации
let CHECKOUT = { points: 0 };
let TAB = { brand: 0 };
let UPLOAD = [];          // файлы, выбранные в форме допуска

const UPLOAD_MAX_FILES = 3;
const UPLOAD_MAX_MB = 10;
const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif", "application/pdf"];

function fmtBytes(n) {
  return n >= 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " МБ" : Math.round(n / 1024) + " КБ";
}

/* Приём файлов: проверка типа, размера и количества. Файлы остаются в браузере,
   стенд ничего никуда не отправляет. */
function acceptFiles(list) {
  const errors = [];
  for (const f of Array.from(list)) {
    if (UPLOAD.length >= UPLOAD_MAX_FILES) { errors.push(`Можно приложить не больше ${UPLOAD_MAX_FILES} файлов`); break; }
    const okType = UPLOAD_TYPES.includes(f.type) || /\.(jpe?g|png|heic|heif|pdf)$/i.test(f.name);
    if (!okType) { errors.push(`${f.name}: подходят JPG, PNG, HEIC и PDF`); continue; }
    if (f.size > UPLOAD_MAX_MB * 1048576) { errors.push(`${f.name}: больше ${UPLOAD_MAX_MB} МБ`); continue; }
    if (UPLOAD.some((x) => x.name === f.name && x.size === f.size)) continue;
    const item = { name: f.name, size: f.size, type: f.type, preview: null };
    UPLOAD.push(item);
    if (f.type.startsWith("image/")) {
      const fr = new FileReader();
      fr.onload = () => { item.preview = fr.result; render(); };
      fr.readAsDataURL(f);
    }
  }
  if (errors.length) toast(errors[0]);
  render();
}

function uploadZone(f) {
  return `<div class="field">
    <span class="label">${esc(f.label)}</span>
    <div class="dropzone" data-act="dropzone">
      <input type="file" id="vf-${f.name}" class="dropzone-input" multiple accept=".jpg,.jpeg,.png,.heic,.heif,.pdf,image/jpeg,image/png,image/heic,application/pdf" data-act="upload">
      <label for="vf-${f.name}" class="dropzone-body">
        <b>Перетащите файлы сюда или выберите на устройстве</b>
        <span class="small muted">${esc(f.ph)}</span>
        <span class="btn btn-sm btn-quiet" style="pointer-events:none">Выбрать файлы</span>
      </label>
    </div>
    ${UPLOAD.length ? `<div class="upload-list">
      ${UPLOAD.map((x, i) => `<div class="upload-item">
        <div class="upload-thumb">${x.preview ? `<img src="${x.preview}" alt="">` : '<span class="pdf-tag">PDF</span>'}</div>
        <div style="min-width:0">
          <div class="small" style="font-weight:600;overflow-wrap:anywhere">${esc(x.name)}</div>
          <div class="xs faint">${fmtBytes(x.size)}</div>
        </div>
        <button class="btn-link xs" data-act="upload-del" data-i="${i}">Убрать</button>
      </div>`).join("")}
    </div>` : ""}
    <p class="xs faint">Файлы остаются в браузере: демонстрационный стенд ничего не отправляет. В платформе изображения удаляются сразу после решения по допуску.</p>
  </div>`;
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2800);
}

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function route() {
  const raw = (location.hash || "#/").replace(/^#/, "");
  return { parts: raw.split("?")[0].split("/").filter(Boolean), raw };
}

/* ---------- каркас ---------- */

const NAV = [
  ["#/catalog", "Каталог"],
  ["#/pro", "Условия PRO"],
  ["#/research", "Исследования"],
  ["#/education", "Обучение"],
  ["#/webinars", "Вебинары"],
  ["#/specialists", "Специалисты"],
];

function header() {
  const u = me();
  const r = route().raw;
  const nav = NAV.map(([h, t]) => `<a href="${h}" class="${r.startsWith(h.slice(1)) ? "on" : ""}">${t}</a>`).join("");
  const right = u
    ? `${isStaff(u) ? '<a class="icon-link" href="#/admin">Админка</a>' : ""}
       <a class="icon-link" href="#/account">Кабинет</a>
       <a class="icon-link cart-link" href="#/cart">Корзина${cartUnits(u) ? `<span class="cart-count mono-num">${cartUnits(u)}</span>` : ""}</a>`
    : `<a class="icon-link cart-link" href="#/login">Вход</a><a class="btn btn-sm hide-sm" href="#/register">Получить допуск</a>`;

  return `
    <div class="chrome no-print">
    <div class="topbar"><b>BYRAIN Switzerland</b><span class="topbar-rest">, закрытый раздел для специалистов эстетической медицины</span></div>
    <div class="demo-bar no-print">
      <div class="wrap">
        <span>Демонстрационный стенд платформы.<span class="hide-sm"> Данные хранятся только в этом браузере, СМС не отправляются.</span></span>
        <span class="flex" style="gap:14px">
          ${u
            ? `<span class="xs faint">${esc(u.fullName)}, ${STATUS_LABELS[u.status] || u.status}</span>
               ${isStaff(u)
                 ? `<button class="btn-link" data-act="demo-specialist">Войти как специалист</button>`
                 : `<button class="btn-link" data-act="demo-admin">Войти как администратор</button>`}
               <button class="btn-link" data-act="logout">Выйти</button>`
            : `<button class="btn-link" data-act="demo-specialist">Войти как специалист</button>
               <button class="btn-link" data-act="demo-admin">Войти как администратор</button>`}
          ${ASK_RESET
            ? `<span class="xs">Сбросить данные стенда?</span>
               <button class="btn-link" data-act="reset-yes">Да, сбросить</button>
               <button class="btn-link" data-act="reset-no">Отмена</button>`
            : `<button class="btn-link" data-act="reset">Сбросить демо</button>`}
        </span>
      </div>
    </div>
    </div>
    <header class="site-header no-print">
      <div class="wrap header-row">
        <a class="brand" href="#/"><span class="brand-word">BYRAIN</span><span class="brand-pro">PRO</span></a>
        <nav class="nav">${nav}</nav>
        <div class="header-right">${right}<button class="burger" data-act="burger">Меню</button></div>
      </div>
      <div class="drawer" id="drawer">
        ${NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}
        ${u ? `<a href="#/account">Кабинет</a><a href="#/cart">Корзина</a>${isStaff(u) ? '<a href="#/admin">Админка</a>' : ""}` : '<a href="#/login">Вход</a><a href="#/register">Получить допуск</a>'}
      </div>
    </header>`;
}

function footer() {
  return `
    <footer class="site-footer no-print">
      <div class="wrap">
        <div class="footer-grid">
          <div>
            <a class="brand" href="#/"><span class="brand-word">BYRAIN</span><span class="brand-pro">PRO</span></a>
            <p class="small" style="margin-top:18px;max-width:32ch;color:rgba(255,255,252,.82)">Закрытая программа для врачей-косметологов, дерматологов, медицинских сестёр по косметологии и косметиков-эстетистов.</p>
            <p class="xs" style="color:rgba(255,255,252,.55)">Розничный сайт бренда: <a href="https://byrain.ru" target="_blank" rel="noopener" style="display:inline;text-decoration:underline">byrain.ru</a></p>
          </div>
          <div>
            <h5>Платформа</h5>
            <a href="#/catalog">Каталог</a><a href="#/pro">Условия PRO</a><a href="#/research">Исследования</a><a href="#/education">Обучение</a><a href="#/webinars">Вебинары</a><a href="#/specialists">Где пройти процедуру</a>
          </div>
          <div>
            <h5>Документы</h5>
            <a href="#/legal/terms">Условия программы PRO</a><a href="#/legal/statement">Заявление специалиста</a><a href="#/legal/privacy">Персональные данные</a><a href="#/legal/delivery">Доставка и оплата</a>
          </div>
          <div>
            <h5>Менеджер</h5>
            <a href="${SETTINGS.managerTelegram}" target="_blank" rel="noopener">Telegram</a>
            <a href="tel:${SETTINGS.managerPhone.replace(/[^+\d]/g, "")}">${SETTINGS.managerPhone}</a>
            <a href="mailto:${SETTINGS.managerEmail}">${SETTINGS.managerEmail}</a>
            <p class="xs" style="margin-top:14px;color:rgba(255,255,252,.55)">${SETTINGS.shippingPromise}</p>
          </div>
        </div>
        <div class="footer-bottom">
          <span>${SETTINGS.sellerName}. Цены PRO не индексируются и доступны после допуска.</span>
          <span>Продукция маркирована в системе «Честный знак»</span>
        </div>
      </div>
    </footer>`;
}

/* ---------- общие блоки ---------- */

function productVisual(p) {
  return p.images[0];
}

function priceBlock(p, u) {
  if (isApproved(u)) {
    return `<div class="p-price">
      <div class="price-pro mono-num">${money(discountedPrice(p.rrp, SETTINGS.tierBasePct))}</div>
      <div class="price-rrp"><span class="strike mono-num">${money(p.rrp)}</span> <span class="faint">РРЦ, ваша цена от 30 %</span></div>
    </div>`;
  }
  return `<div class="p-price">
    <div class="price-pro mono-num" style="font-size:22px">${money(p.rrp)}</div>
    <div class="price-rrp faint">розничная цена, PRO после допуска</div>
  </div>`;
}

function productCard(p, u, opts) {
  const o = opts || {};
  const inCart = u && u.cart ? u.cart[p.sku] || 0 : 0;
  return `<div class="p-card">
    <a class="p-media" href="#/catalog/${p.slug}">
      ${o.flag ? `<span class="p-flag badge badge-accent">${esc(o.flag)}</span>` : ""}
      <img src="${productVisual(p)}" alt="${esc(p.name)}" loading="lazy">
    </a>
    <div class="p-body">
      <div class="p-coll">${esc(p.collection)}</div>
      <a class="p-name" href="#/catalog/${p.slug}">${esc(p.name)}</a>
      <div class="p-line">${esc(p.activesLine)}</div>
      <div class="xs faint">${esc(p.volume)}, артикул ${esc(p.sku)}</div>
      ${priceBlock(p, u)}
      <div class="p-cta">
        ${isApproved(u)
          ? `<button class="btn btn-sm btn-block" data-act="add" data-sku="${p.sku}">${inCart ? `В корзине ${inCart}<span class="hide-sm">, добавить ещё</span>` : `<span class="hide-sm">Добавить </span>в корзину`}</button>`
          : `<a class="btn btn-sm btn-outline btn-block" href="#/register">Открыть цену PRO</a>`}
      </div>
    </div>
  </div>`;
}

function effectBullets(line) {
  const i = line.indexOf(":");
  const head = i > 0 ? line.slice(0, i) : "Эффект";
  const rest = i > 0 ? line.slice(i + 1) : line;
  return { head, items: rest.split(",").map((s) => s.trim()).filter(Boolean) };
}

function tierStrip(units, fullLine) {
  const t = [
    { pct: SETTINGS.tierBasePct, t: "от 1 единицы", sub: "базовый уровень программы", on: units > 0 && units < SETTINGS.tierThreeUnitsMin && !fullLine },
    { pct: SETTINGS.tierThreeUnitsPct, t: `от ${SETTINGS.tierThreeUnitsMin} единиц в заказе`, sub: "любые продукты линейки", on: units >= SETTINGS.tierThreeUnitsMin && !fullLine },
    { pct: SETTINGS.tierFullLinePct, t: `от ${SETTINGS.tierFullLineMin} единиц в заказе`, sub: "любые продукты, можно одинаковые", on: fullLine },
  ];
  return `<div class="tier-grid">${t.map((x) => `
    <div class="tier ${x.on ? "tier-on" : ""}">
      <div class="tier-pct mono-num">${x.pct} %</div>
      <div style="margin-top:14px;font-size:17px;font-weight:600">${x.t}</div>
      <div class="small muted" style="margin-top:6px">${x.sub}</div>
    </div>`).join("")}</div>`;
}

function banner(img, opts) {
  const o = opts || {};
  return `<div class="banner ${o.tall ? "banner-tall" : o.short ? "banner-short" : "banner-wide"}">
    <img src="${img}" alt="${esc(o.alt || "")}" loading="lazy"${o.pos ? ` style="object-position:${o.pos}"` : ""}>
    <div class="banner-body">
      ${o.eyebrow ? `<div class="eyebrow" style="color:rgba(255,255,252,.72)">${esc(o.eyebrow)}</div>` : ""}
      <h3 style="margin:12px 0 0;max-width:20ch;color:#fffffc">${esc(o.title || "")}</h3>
      ${o.text ? `<p class="small" style="margin:14px 0 0;max-width:46ch;color:rgba(255,255,252,.86)">${esc(o.text)}</p>` : ""}
      ${o.cta ? `<div class="btn-row" style="margin-top:22px"><a class="btn btn-light" href="${o.cta[1]}">${esc(o.cta[0])}</a></div>` : ""}
    </div>
  </div>`;
}

/* ---------- клинические данные ---------- */

/* В песочнице Artifacts скачивание файлов заблокировано, поэтому там документы
   открываются с публичной копии стенда. */
const DOCS_BASE = HOST === "artifact"
  ? "https://adamadamov111.github.io/byrain-pro/assets/docs/"
  : "assets/docs/";

function docCard(id) {
  const d = libraryItem(id);
  if (!d) return "";
  const href = DOCS_BASE + id + ".pdf";
  return `<div class="doc-card">
    <div class="doc-meta">
      <span class="pdf-tag">PDF</span>
      <span class="badge badge-line">${esc(d.kind)}</span>
      <span class="xs faint">${d.pages} ${plural(d.pages, "страница", "страницы", "страниц")}, ${d.mb} МБ</span>
    </div>
    <div class="doc-title">${esc(d.title)}</div>
    <div class="doc-sub">${esc(d.sub)}</div>
    <div class="doc-foot">
      <a class="btn btn-sm" href="${href}" target="_blank" rel="noopener"${CAN_DOWNLOAD ? ' download' : ""}>${CAN_DOWNLOAD ? "Скачать" : "Открыть"}</a>
      ${CAN_DOWNLOAD ? `<a class="btn-link xs" href="${href}" target="_blank" rel="noopener">Открыть в браузере</a>` : ""}
    </div>
  </div>`;
}

function barChart(chart) {
  const max = Math.max(...chart.bars.map((b) => Math.abs(b.v))) || 1;
  return `<div class="clin-chart">
    <div class="eyebrow" style="margin-bottom:20px">${esc(chart.title)}</div>
    ${chart.bars.map((b) => `<div class="bar-row ${b.on ? "on" : ""}">
      <div class="bar-label">${esc(b.label)}</div>
      <div class="bar-track"><i class="bar-fill" style="width:${Math.round((Math.abs(b.v) / max) * 100)}%"></i></div>
      <div class="bar-val">${esc(b.show)}</div>
    </div>`).join("")}
    ${chart.note ? `<p class="small faint" style="margin:18px 0 0">${esc(chart.note)}</p>` : ""}
  </div>`;
}

function clinicalBlock(p) {
  const c = CLINICAL[p.sku];
  if (!c) return "";
  return `
    <section class="section-tight" id="clinical" style="background:var(--surface)"><div class="wrap">
      <div class="between" style="align-items:flex-end;margin-bottom:28px">
        <div style="max-width:52ch">
          <div class="eyebrow eyebrow-accent">Клинические данные</div>
          <h2 style="margin-top:16px">${esc(c.title)}</h2>
          <div class="chips" style="margin-top:18px">
            <span class="badge badge-dark">${esc(c.active)}</span>
            ${c.design.map((d) => `<span class="badge badge-line">${esc(d)}</span>`).join("")}
          </div>
        </div>
        <p class="xs faint" style="max-width:44ch">${esc(c.source)}</p>
      </div>

      <div class="clin-stats">
        ${c.stats.map((st) => `<div class="clin-stat"><div class="clin-val mono-num">${esc(st.v)}</div><div class="clin-lab">${esc(st.t)}</div></div>`).join("")}
      </div>

      <div style="margin-top:28px">${barChart(c.chart)}</div>

      <div class="grid cols-3" style="margin-top:28px">
        <div class="cell"><div class="eyebrow eyebrow-accent">Механизм</div><p class="small muted" style="margin:14px 0 0">${esc(c.mechanism)}</p></div>
        <div class="cell"><div class="eyebrow eyebrow-accent">Данные</div><p class="small muted" style="margin:14px 0 0">${esc(c.data)}</p></div>
        <div class="cell tile-dark"><div class="eyebrow">Что это значит</div><p class="small" style="margin:14px 0 0;color:rgba(255,255,252,.88)">${esc(c.meaning)}</p></div>
      </div>

      <div class="frame-accent" style="margin-top:28px"><b>Также в формуле.</b> ${esc(c.also)}</div>

      <div class="between" style="align-items:flex-end;margin:40px 0 20px">
        <div><div class="eyebrow eyebrow-accent">Первоисточники</div><h3 style="margin-top:12px">Исследования по этой формуле</h3></div>
        <a class="btn btn-sm btn-outline" href="#/research">Вся библиотека</a>
      </div>
      <div class="docs-grid">${c.docs.map(docCard).join("")}</div>
    </div></section>`;
}

/* ---------- библиотека исследований ---------- */

function viewResearch() {
  const total = LIBRARY_GROUPS.reduce((n, g) => n + g.items.length, 0);
  const pages = LIBRARY_GROUPS.reduce((n, g) => n + g.items.reduce((m, i) => m + i.pages, 0), 0);
  return `
    <section class="section-tight"><div class="wrap">
      <div class="eyebrow eyebrow-accent">Доказательная база</div>
      <h1 style="margin:18px 0 18px;max-width:18ch">Клинические исследования и документы бренда</h1>
      <p class="lead">Полные первоисточники, на которых построены формулы: досье производителей активов, рецензируемые публикации и гид по продуктам. ${total} ${plural(total, "документ", "документа", "документов")}, ${pages} ${plural(pages, "страница", "страницы", "страниц")}. Раздел пополняется.</p>
    </div></section>

    <section class="section-tight" style="padding-top:0"><div class="wrap">
      ${banner(VISUALS.scientist, { tall: false, alt: "Лаборатория BYRAIN", eyebrow: "Formula first", title: "Каждый актив в рабочей концентрации, подтверждённой исследованием", text: "Для каждого продукта в каталоге собраны механизм действия, дизайн исследования, измеримые результаты и ссылка на первоисточник." })}
    </div></section>

    ${LIBRARY_GROUPS.map((g) => `<section class="section-tight" style="padding-top:0"><div class="wrap">
      <div class="between" style="align-items:flex-end;margin-bottom:24px">
        <div><h2>${esc(g.name)}</h2></div>
        <p class="small muted" style="max-width:46ch">${esc(g.note)}</p>
      </div>
      <div class="docs-grid" style="${g.items.length === 1 ? "grid-template-columns:1fr" : ""}">${g.items.map((i) => docCard(i.id)).join("")}</div>
    </div></section>`).join("")}

    <section class="section-tight" style="padding-bottom:90px"><div class="wrap">
      <div class="frame-accent">
        <b>Как пользоваться.</b> ${CAN_DOWNLOAD
          ? "Кнопка «Скачать» сохраняет PDF, «Открыть в браузере» показывает документ в новой вкладке. Файлы можно передавать коллегам и использовать на обучении."
          : "Документы открываются в новой вкладке с публичной версии стенда. Там же их можно скачать."}
        Клинические данные по конкретной формуле показаны в карточке каждого продукта.
      </div>
      <div class="frame" style="margin-top:24px">
        <div class="between" style="align-items:center">
          <div style="max-width:56ch">
            <div class="eyebrow eyebrow-accent">Библиотека обучения</div>
            <h3 style="margin:14px 0 8px">${PRESENTATIONS.length} ${plural(PRESENTATIONS.length, "презентация", "презентации", "презентаций")} для кабинета и консультации</h3>
            <p class="small muted" style="margin:0">Атлас пептидов, руководство по фитоэстрогенам, биодоступность и синергия с процедурами. Разбор механизмов и готовые формулировки для разговора с клиенткой.</p>
          </div>
          <div class="btn-row"><a class="btn" href="#/education">К обучению</a></div>
        </div>
      </div>
    </div></section>`;
}

/* ---------- сообщество: счётчики ---------- */

const SCALE = [
  { to: 1000, suffix: "+", label: "специалистов работают с BYRAIN" },
  { to: 17, suffix: "", label: "клинических исследований в открытом доступе" },
  { to: 3, suffix: "", label: "кабинетных протокола на линейке" },
  { to: 24, suffix: " ч", label: "на решение по допуску" },
];

/* Цифры оживают, когда блок попадает в поле зрения. При включённом в системе
   «уменьшить движение» значения показываются сразу. */
function initCounters() {
  const els = document.querySelectorAll("[data-count]");
  if (!els.length) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const run = (el) => {
    const to = Number(el.dataset.count);
    if (reduce) { el.textContent = num(to); return; }
    const dur = 1600;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = num(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (!("IntersectionObserver" in window)) { els.forEach(run); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      run(en.target);
    });
  }, { threshold: 0.35 });
  els.forEach((el) => { el.textContent = reduce ? num(Number(el.dataset.count)) : "0"; io.observe(el); });
}

function scaleBand() {
  return `
    <section class="section-tight">
      <div class="wrap">
        <div class="split">
          <div class="split-body tile-dark">
            <div class="eyebrow">Сообщество</div>
            <h2 style="margin:16px 0 14px;color:#fffffc">BYRAIN в кабинетах по всей России</h2>
            <p class="small" style="color:rgba(255,255,252,.78);max-width:44ch;margin-bottom:34px">Врачи-косметологи, дерматологи, медицинские сёстры по косметологии и клиники работают на линейке BYRAIN и ведут по ней кабинетные протоколы.</p>
            <div class="scale-grid">
              ${SCALE.map((x) => `<div class="scale-item">
                <div class="scale-n mono-num"><span data-count="${x.to}">0</span>${esc(x.suffix)}</div>
                <div class="scale-l">${esc(x.label)}</div>
              </div>`).join("")}
            </div>
            <div class="btn-row" style="margin-top:34px"><a class="btn btn-light" href="#/specialists">Где пройти процедуру</a></div>
          </div>
          <div class="split-media"><img src="${VISUALS.microscopeWoman}" alt="Специалист за микроскопом BYRAIN" loading="lazy"></div>
        </div>
      </div>
    </section>`;
}

/* ---------- лендинг ---------- */

function viewHome() {
  const u = me();
  return `
    <section class="hero">
      <div class="wrap">
        <div class="hero-split">
          <div class="hero-text">
            <div class="eyebrow eyebrow-accent">BYRAIN PRO, закрытая программа</div>
            <h1 style="margin-top:22px">Швейцарские формулы для кабинета по профессиональным ценам</h1>
            <p class="lead" style="margin-top:26px">Допуск по документам за сутки, скидка от ${SETTINGS.tierBasePct} до ${SETTINGS.tierFullLinePct} % от розничных цен byrain.ru, баллы ${SETTINGS.pointsEarnPct} % с каждого оплаченного заказа, кабинетные протоколы и сертификация.</p>
            <div class="btn-row" style="margin-top:34px">
              ${u ? '<a class="btn btn-lg" href="#/catalog">Перейти в каталог</a>' : '<a class="btn btn-lg" href="#/register">Получить допуск</a>'}
              <a class="btn btn-lg btn-outline" href="#/catalog">Смотреть линейку</a>
            </div>
          </div>
          <div class="hero-media">
            <img src="${VISUALS.heroPortrait}" alt="Специалист в халате BYRAIN Switzerland">
            <div class="hero-stamp">11 лет исследований, 40+ технологов, активы в рабочих концентрациях</div>
          </div>
        </div>
        <div class="metrics">
          ${BRAND_METRICS.map((m) => `<div class="metric"><div class="metric-n mono-num">${m.n}</div><div class="metric-t">${m.t}</div></div>`).join("")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="between" style="align-items:flex-end;margin-bottom:40px">
          <div>
            <div class="eyebrow eyebrow-accent">Профессиональные цены</div>
            <h2 style="margin-top:16px">Скидка растёт вместе с заказом</h2>
          </div>
          <p class="small muted" style="max-width:40ch">Уровень определяется составом корзины и применяется ко всему заказу. Расчёт от розничной цены byrain.ru.</p>
        </div>
        ${tierStrip(0, false)}
        <div class="grid cols-3" style="margin-top:-1px">
          <div class="cell tile-cool"><div class="eyebrow">Баллы</div><p class="small" style="margin-top:12px">${SETTINGS.pointsEarnPct} % от оплаченного заказа, 1 балл равен 1 ₽. Оплата баллами до ${SETTINGS.pointsRedeemMaxPct} % заказа, срок ${SETTINGS.pointsExpiryMonths} месяцев. Бонус ${num(SETTINGS.verificationBonus)} за допуск и ${num(SETTINGS.firstOrderBonus)} за первый заказ.</p></div>
          <div class="cell tile-warm"><div class="eyebrow">Доставка</div><p class="small" style="margin-top:12px">${SETTINGS.shippingPromise}. Бесплатно от ${money(SETTINGS.freeShippingFrom)}, в иных случаях ${money(SETTINGS.shippingCost)}. От ${money(SETTINGS.materialsGiftFrom)} в заказ добавляются фирменные пакеты и рабочие тетради врача.</p></div>
          <div class="cell tile-sage"><div class="eyebrow">Защита розницы</div><p class="small" style="margin-top:12px">Перепродажа на маркетплейсах запрещена. Каждая единица маркирована в системе «Честный знак» и выводится из оборота при продаже клиенту.</p></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="between" style="align-items:flex-end;margin-bottom:36px">
          <div>
            <div class="eyebrow eyebrow-accent">Линейка</div>
            <h2 style="margin-top:16px">Восемь формул, три коллекции</h2>
          </div>
          <a class="btn btn-outline" href="#/catalog">Открыть каталог</a>
        </div>
        <div class="products">${CATALOG.slice(0, 4).map((p, i) => productCard(p, u, i === 2 ? { flag: "Хит кабинета" } : {})).join("")}</div>
        <div class="products" style="margin-top:-1px">${CATALOG.slice(4).map((p) => productCard(p, u)).join("")}</div>
      </div>
    </section>

    <section class="section-tight">
      <div class="wrap">
        <div class="split">
          <div class="split-body tile-navy">
            <div class="eyebrow">Доказательная база</div>
            <h2 style="margin:16px 0 20px;color:#fffffc">Клинические данные по каждой формуле</h2>
            <p class="small" style="color:rgba(255,255,252,.86);max-width:46ch">Механизм действия, дизайн исследования и измеримые результаты для каждого ключевого актива, со ссылкой на первоисточник. Семнадцать документов доступны целиком: досье dsm-firmenich и Sederma, рецензируемые публикации и гид по продуктам.</p>
            <div class="chips" style="margin:24px 0 26px">
              <span class="badge badge-light" style="background:#fffffc;color:var(--deep-2)">SYN-AKE −52 %</span>
              <span class="badge badge-light" style="background:#fffffc;color:var(--deep-2)">SYN-COLL +104 %</span>
              <span class="badge badge-light" style="background:#fffffc;color:var(--deep-2)">Изофлавоны +18,8 %</span>
              <span class="badge badge-light" style="background:#fffffc;color:var(--deep-2)">Ретинол, биопсия</span>
            </div>
            <div class="btn-row"><a class="btn btn-light" href="#/research">Открыть исследования</a></div>
          </div>
          <div class="split-media"><img src="${VISUALS.lineFlatlay}" alt="Линейка BYRAIN" loading="lazy"></div>
        </div>
      </div>
    </section>
    ${scaleBand()}

    <section class="section-tight">
      <div class="wrap">
        ${banner(VISUALS.teamOverhead, {
          short: true, alt: "Специалисты в лаборатории",
          pos: "center 22%",
          eyebrow: "Допуск",
          title: "Три способа подтвердить профессиональный статус",
          text: "Документ об образовании, профессиональный профиль или место работы. Менеджер принимает решение в течение суток.",
          cta: u ? ["Мой допуск", "#/account/verification"] : ["Подать заявку", "#/register"],
        })}
      </div>
    </section>

    <section class="section-tight">
      <div class="wrap">
        <div class="split">
          <div class="split-media"><img src="${VISUALS.scientist}" alt="Научная лаборатория BYRAIN" loading="lazy"></div>
          <div class="split-body">
            <div class="eyebrow eyebrow-accent">О бренде</div>
            <h2 style="margin:16px 0 26px">11 лет, чтобы обойти рынок по эффективности</h2>
            <div class="flex" style="gap:0;border:1px solid var(--line);margin-bottom:-1px">
              ${BRAND_TABS.map((t, i) => `<button class="step ${TAB.brand === i ? "on" : ""}" style="flex:1;cursor:pointer;border:0;border-right:1px solid var(--line)" data-act="brand-tab" data-i="${i}">${t.key}</button>`).join("")}
            </div>
            <div class="frame">
              <h4 style="max-width:24ch">${esc(BRAND_TABS[TAB.brand].big)}</h4>
              <p class="small muted" style="margin:16px 0 0">${esc(BRAND_TABS[TAB.brand].text)}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="eyebrow eyebrow-accent">Кабинетные протоколы</div>
        <h2 style="margin:16px 0 36px">Три протокола на линейке</h2>
        <div class="grid cols-3">
          ${PROTOCOLS.map((pr) => `<div class="cell cell-flush">
            <div class="media media-3x2">
              <img src="${PROTOCOL_VISUAL[pr.name] || VISUALS.trayKit}" alt="${esc(pr.name)}"  loading="lazy">
            </div>
            <div class="pad-30">
              <h4>${esc(pr.name)}</h4>
              <p class="small muted" style="margin-top:12px">${esc(pr.task)}</p>
              <div class="rule" style="margin:18px 0"></div>
              <div class="xs faint">Состав</div><p class="small" style="margin-bottom:10px">${esc(pr.compose)}</p>
              <div class="xs faint">Аппарат</div><p class="small" style="margin-bottom:10px">${esc(pr.device)}</p>
              <div class="xs faint">Длительность</div><p class="small" style="margin-bottom:10px">${esc(pr.time)}</p>
              <div class="xs faint">Курс</div><p class="small" style="margin-bottom:0">${esc(pr.course)}</p>
            </div>
          </div>`).join("")}
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="wrap">
        <div class="grid cols-2" style="background:transparent;border:0;gap:28px">
          ${banner(VISUALS.boxDelivery, { tall: false, alt: "Отгрузка заказа BYRAIN", eyebrow: "Логистика и маркировка", title: "Отгрузка в течение суток, коды «Честного знака» в заказе", text: "Каждая единица приходит с кодом маркировки. Выгрузка кодов для кассы доступна в карточке заказа." })}
          ${banner(VISUALS.jarDark, { tall: false, alt: "Продукт BYRAIN", eyebrow: "Академия BYRAIN PRO", title: "Две ступени сертификации и библиотека презентаций", text: "Базовый курс по линейке и протоколам, продвинутая программа из пяти модулей с аттестацией на 40 вопросов и четыре презентации для кабинета.", cta: ["К обучению", "#/education"] })}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="split">
          <div class="split-body tile-dark">
            <div class="eyebrow">Активы</div>
            <h2 style="margin:16px 0 22px;color:#fffffc">100 % активов в рабочих клинических концентрациях</h2>
            <p class="small" style="color:rgba(255,255,252,.84);max-width:44ch">Пептидные комплексы, фитоэстрогены красного клевера, пептидные факторы роста, ретинол 1 %, витамин C 10 % и кислоты в концентрациях, доказанных в исследованиях. Состав каждой формулы проверяется по INCI в карточке товара.</p>
            <div class="btn-row" style="margin-top:28px"><a class="btn btn-light" href="#/catalog">Смотреть составы</a></div>
          </div>
          <div class="split-media"><img src="${VISUALS.petri}" alt="Лабораторные образцы" loading="lazy"></div>
        </div>
      </div>
    </section>

    <section class="section-tight" style="padding-bottom:96px">
      <div class="wrap narrow center">
        <div class="eyebrow eyebrow-accent">Начало работы</div>
        <h2 style="margin:16px 0 20px">Заявка занимает пять минут</h2>
        <p class="lead" style="margin:0 auto 30px">Телефон, профиль, четыре подтверждения и один из трёх способов подтверждения статуса. Паспорт не запрашивается.</p>
        <div class="btn-row" style="justify-content:center">
          ${u ? '<a class="btn btn-lg" href="#/account/verification">Мой допуск</a>' : '<a class="btn btn-lg" href="#/register">Подать заявку</a>'}
          <a class="btn btn-lg btn-quiet" href="#/pro">Как работает программа</a>
        </div>
      </div>
    </section>`;
}

/* ---------- условия PRO ---------- */

function viewPro() {
  return `
    <section class="section-tight"><div class="wrap">
      <div class="eyebrow eyebrow-accent">Программа</div>
      <h1 style="margin:18px 0 22px;max-width:16ch">Как работает BYRAIN PRO</h1>
      <p class="lead">Платформа закрыта от розницы тремя контурами: допуск по документам, структура предложения и маркировка «Честный знак».</p>
    </div></section>

    <section class="section-tight"><div class="wrap">
      <h2 style="margin-bottom:30px">Уровни цены</h2>
      ${tierStrip(0, false)}
      <div class="note" style="margin-top:-1px;border:1px solid var(--line)">Уровень считается по корзине целиком и применяется к каждой строке заказа. Цена единицы равна РРЦ byrain.ru, уменьшенной на процент уровня, с округлением до рубля.</div>
    </div></section>

    <section class="section-tight"><div class="wrap">
      ${banner(VISUALS.lineFlatlay, { tall: false, alt: "Линейка BYRAIN", eyebrow: "Линейка", title: "Восемь продуктов, которые закрывают кабинет и домашний уход", cta: ["В каталог", "#/catalog"] })}
    </div></section>

    <section class="section-tight"><div class="wrap">
      <h2 style="margin-bottom:30px">Способы допуска</h2>
      <div class="card"><div class="table-wrap"><table class="data">
        <thead><tr><th>Способ</th><th>Проверка</th><th>Скорость</th></tr></thead>
        <tbody>${VERIFY_METHODS.map((m) => `<tr><td><b>${esc(m.name)}</b></td><td class="muted">${esc(m.check)}</td><td>${m.auto ? '<span class="badge badge-sage">' + esc(m.speed) + "</span>" : '<span class="badge badge-line">' + esc(m.speed) + "</span>"}</td></tr>`).join("")}</tbody>
      </table></div></div>
      <div class="frame-accent" style="margin-top:20px">Паспорт, селфи и биометрия не запрашиваются. Изображения документов удаляются после решения, в аккаунте остаётся отметка о способе и дате проверки. Переподтверждение статуса раз в ${SETTINGS.reverifyMonths} месяцев.</div>
    </div></section>

    <section class="section-tight" style="padding-bottom:90px"><div class="wrap">
      <div class="grid cols-2">
        <div class="cell">
          <h3>Баллы</h3>
          <ul class="bullets" style="margin-top:20px">
            <li>${SETTINGS.pointsEarnPct} % от суммы оплаченного заказа</li>
            <li>1 балл равен 1 ₽, оплата до ${SETTINGS.pointsRedeemMaxPct} % заказа</li>
            <li>Срок жизни ${SETTINGS.pointsExpiryMonths} месяцев, сгорание по очереди начисления</li>
            <li>${num(SETTINGS.verificationBonus)} баллов за допуск, ${num(SETTINGS.firstOrderBonus)} за первый оплаченный заказ</li>
          </ul>
        </div>
        <div class="cell tile-warm">
          <h3>Правила реализации</h3>
          <ul class="bullets" style="margin-top:20px">
            <li>Продукция для процедур и рекомендации своим клиентам</li>
            <li>Клиентам в кабинете по цене не ниже РРЦ byrain.ru</li>
            <li>Маркетплейсы, соцсети и сторонние магазины запрещены</li>
            <li>Нарушение: блокировка аккаунта, списание баллов, штраф по пункту 5 Условий</li>
          </ul>
        </div>
      </div>
      <div class="btn-row" style="margin-top:30px"><a class="btn btn-outline" href="#/legal/terms">Читать Условия программы PRO</a></div>
    </div></section>`;
}

/* ---------- каталог ---------- */

function viewCatalog() {
  const u = me();
  const collections = [...new Set(CATALOG.map((p) => p.collection))];
  const f = (location.hash.split("?")[1] || "").replace("c=", "");
  const filter = f ? decodeURIComponent(f) : "";
  const list = filter ? CATALOG.filter((p) => p.collection === filter) : CATALOG;
  return `
    <section class="section-tight"><div class="wrap">
      <div class="eyebrow eyebrow-accent">Каталог</div>
      <h1 style="margin:18px 0 18px">Линейка BYRAIN</h1>
      <p class="lead">Восемь формул. Цены и изображения синхронизированы с byrain.ru. ${isApproved(u) ? "Цена PRO показана для базового уровня 30 %, в корзине уровень пересчитывается." : "Цены PRO открываются после допуска."}</p>
      <div class="btn-row chip-row" style="margin-top:30px">
        <a class="btn btn-sm ${filter ? "btn-quiet" : ""}" href="#/catalog">Вся линейка</a>
        ${collections.map((c) => `<a class="btn btn-sm ${filter === c ? "" : "btn-quiet"}" href="#/catalog?c=${encodeURIComponent(c)}">${esc(c)}</a>`).join("")}
      </div>
    </div></section>

    ${filter ? `<section style="padding-bottom:34px"><div class="wrap">
      ${banner(COLLECTION_VISUAL[filter] || VISUALS.lineFlatlay, { tall: false, alt: esc(filter), eyebrow: "Коллекция", title: filter })}
    </div></section>` : ""}

    <section style="padding-bottom:90px"><div class="wrap">
      <div class="products">${list.map((p) => productCard(p, u)).join("")}</div>
      ${isApproved(u) ? "" : `<div class="locked" style="margin-top:-1px;border-top:0">Профессиональные цены видны допущенным специалистам. <a href="#/register" style="text-decoration:underline;font-weight:600">Подать заявку на допуск</a></div>`}
    </div></section>`;
}

function viewProduct(slug) {
  const p = bySlug(slug);
  const u = me();
  if (!p) return `<section class="section"><div class="wrap"><h2>Продукт не найден</h2><div class="btn-row" style="margin-top:20px"><a class="btn" href="#/catalog">В каталог</a></div></div></section>`;
  const eff = effectBullets(p.effectLine);
  const revs = reviewsFor(p.sku);
  const inCart = u && u.cart ? u.cart[p.sku] || 0 : 0;
  const protocols = PROTOCOLS.filter((pr) => pr.skus[p.sku]);
  const others = CATALOG.filter((x) => x.sku !== p.sku && x.collection === p.collection).slice(0, 4);
  return `
    <section class="section-tight"><div class="wrap">
      <div class="xs faint" style="margin-bottom:22px"><a href="#/catalog" style="text-decoration:underline">Каталог</a> / ${esc(p.collection)}</div>
      <div class="pdp">
        <div class="pdp-media"><img src="${productVisual(p)}" alt="${esc(p.name)}"></div>
        <div class="pdp-info">
          <div class="p-coll">${esc(p.collection)}</div>
          <h1 style="font-size:clamp(32px,3.6vw,52px);margin:14px 0 18px">${esc(p.name)}</h1>
          <p style="font-weight:600;font-size:17px">${esc(p.activesLine)}</p>
          <p class="xs faint">${esc(p.volume)}, артикул ${esc(p.sku)}</p>

          <div class="effect-panel" style="margin:28px 0">
            <h4>${esc(eff.head)}</h4>
            <ul class="bullets">${eff.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
          </div>

          ${isApproved(u) ? `
            <div class="price-rows">
              <div class="price-row on"><span>Уровень 30 %, от 1 единицы</span><b class="mono-num">${money(discountedPrice(p.rrp, 30))}</b></div>
              <div class="price-row"><span>Уровень 40 %, от ${SETTINGS.tierThreeUnitsMin} единиц</span><b class="mono-num">${money(discountedPrice(p.rrp, 40))}</b></div>
              <div class="price-row"><span>Уровень 50 %, от ${SETTINGS.tierFullLineMin} единиц</span><b class="mono-num">${money(discountedPrice(p.rrp, 50))}</b></div>
              <div class="price-row"><span class="muted">РРЦ byrain.ru</span><span class="strike mono-num">${money(p.rrp)}</span></div>
            </div>
            <div class="btn-row" style="margin-top:26px">
              <button class="btn btn-lg" data-act="add" data-sku="${p.sku}">Добавить в корзину</button>
              ${inCart ? `<a class="btn btn-lg btn-quiet" href="#/cart">В корзине ${inCart}</a>` : ""}
            </div>` : `
            <div class="price-rows">
              <div class="price-row"><span>Розничная цена byrain.ru</span><b class="mono-num">${money(p.rrp)}</b></div>
              <div class="price-row"><span class="muted">Цена PRO</span><span class="muted">после допуска</span></div>
            </div>
            <div class="btn-row" style="margin-top:26px"><a class="btn btn-lg" href="#/register">Получить допуск</a><a class="btn btn-lg btn-quiet" href="#/pro">Условия PRO</a></div>`}

          <p class="muted" style="margin-top:30px">${esc(p.description)}</p>
          ${CLINICAL[p.sku] ? `<div class="frame-accent" style="margin-top:22px">
            <div class="eyebrow eyebrow-accent">Доказательная база</div>
            <p class="small" style="margin:10px 0 0"><b>${esc(CLINICAL[p.sku].active)}.</b> ${esc(CLINICAL[p.sku].stats[0].v)} ${esc(CLINICAL[p.sku].stats[0].t.toLowerCase())}.</p>
            <div class="btn-row" style="margin-top:14px"><button class="btn btn-sm btn-quiet" data-act="scroll-clinical">Смотреть клинические данные</button></div>
          </div>` : ""}
        </div>
      </div>
    </div></section>

    ${clinicalBlock(p)}

    ${protocols.length ? `<section class="section-tight"><div class="wrap">
      <div class="eyebrow eyebrow-accent">Протоколы с этим продуктом</div>
      <div class="grid cols-${protocols.length > 1 ? "2" : "2"}" style="margin-top:20px">
        ${protocols.map((pr) => `<div class="cell cell-flush">
          <div class="media media-16x9"><img src="${PROTOCOL_VISUAL[pr.name] || VISUALS.trayKit}" alt="${esc(pr.name)}"  loading="lazy"></div>
          <div class="pad-28">
            <h4>${esc(pr.name)}</h4>
            <p class="small muted" style="margin:12px 0 16px">${esc(pr.compose)}. ${esc(pr.device)}, ${esc(pr.time)}.</p>
            ${isApproved(u) ? `<button class="btn btn-sm" data-act="protocol-cart" data-name="${esc(pr.name)}">Набор в корзину</button>` : ""}
          </div>
        </div>`).join("")}
        ${protocols.length === 1 ? `<div class="cell tile-cool"><div class="eyebrow">Честный знак</div><p class="small" style="margin-top:14px">Каждая единица маркирована средством идентификации. При продаже клиенту с чеком код выводится из оборота онлайн-кассой. Коды по заказу передаются в карточке заказа и выгружаются в CSV для кассы.</p></div>` : ""}
      </div>
    </div></section>` : ""}

    <section class="section-tight"><div class="wrap">
      <div class="grid cols-2">
        <div class="cell">
          <div class="eyebrow eyebrow-accent">Состав, INCI</div>
          <p class="inci" style="margin-top:18px">${esc(p.inci)}</p>
        </div>
        <div class="cell cell-flush">
          <div class="media media-4x3"><img src="${VISUALS.petri}" alt="Лабораторные образцы"  loading="lazy"></div>
          <div class="pad-28">
            <div class="eyebrow">Контроль качества</div>
            <p class="small muted" style="margin-top:12px">Каждый актив вводится в концентрации, доказанной в исследованиях. Партия маркируется в системе «Честный знак» и отгружается в течение суток после оплаты.</p>
          </div>
        </div>
      </div>
    </div></section>

    <section class="section-tight"><div class="wrap">
      <h2 style="margin-bottom:26px">Отзывы специалистов</h2>
      <div class="stack">
        ${revs.length ? revs.map((r) => `<div class="card card-pad">
          <div class="between"><b style="font-size:17px">${esc(r.author)}</b><span class="badge badge-line">${esc(r.city || "")}, оценка ${r.rating} из 5</span></div>
          <p class="muted" style="margin:14px 0 0">${esc(r.text)}</p>
        </div>`).join("") : '<div class="note">Отзывов пока нет.</div>'}
      </div>
      ${isApproved(u) ? `
        <div class="frame" style="margin-top:26px">
          <div class="eyebrow eyebrow-accent">Оставить отзыв</div>
          <div class="stack" style="margin-top:18px">
            <div class="field"><span class="label">Оценка</span>
              <select class="select" id="rv-rating">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${n} из 5</option>`).join("")}</select></div>
            <div class="field"><span class="label">Опыт применения в работе</span>
              <textarea class="textarea" id="rv-text" placeholder="Расход, результат на курсе, сочетания"></textarea></div>
            <div><button class="btn" data-act="review" data-sku="${p.sku}">Отправить на модерацию</button></div>
          </div>
        </div>` : ""}
    </div></section>

    ${others.length ? `<section class="section-tight" style="padding-bottom:90px"><div class="wrap">
      <div class="eyebrow eyebrow-accent">Из этой коллекции</div>
      <h2 style="margin:16px 0 30px">${esc(p.collection)}</h2>
      <div class="products products-3" style="grid-template-columns:repeat(${Math.min(others.length, 3)},1fr)">${others.slice(0, 3).map((x) => productCard(x, u)).join("")}</div>
    </div></section>` : ""}`;
}

/* ---------- вход ---------- */

function viewLogin() {
  const s = (window.__login = window.__login || { step: 1, phone: "", sent: "", error: "" });
  return `
    <section class="section-tight"><div class="wrap">
      <div class="split">
        <div class="split-body">
          <div class="eyebrow eyebrow-accent">Вход</div>
          <h1 style="font-size:clamp(32px,3.6vw,52px);margin:16px 0 14px">Вход по коду из СМС</h1>
          <p class="lead" style="margin-bottom:30px">Пароля нет. Номер телефона является логином и подписью специалиста.</p>
          ${s.error ? `<div class="err" style="margin-bottom:20px">${esc(s.error)}</div>` : ""}
          ${s.step === 1 ? `
            <div class="stack">
              <div class="field"><span class="label">Телефон</span><input class="input" id="lg-phone" value="${esc(s.phone)}" placeholder="+7 (999) 000-00-00" inputmode="tel"></div>
              <div><button class="btn btn-lg btn-block" data-act="login-send">Получить код</button></div>
              <p class="small faint">Нет аккаунта? <a href="#/register" style="text-decoration:underline;font-weight:600">Подать заявку на допуск</a></p>
              <div class="note">Для демонстрации в верхней полосе есть быстрый вход специалистом и администратором.</div>
            </div>` : `
            <div class="stack">
              <p class="muted">Код отправлен на ${phonePretty(s.phone)}. Демо показывает код на экране.</p>
              <div class="ok-box">Код из СМС: <b class="mono-num">${esc(s.sent)}</b></div>
              <div class="field"><span class="label">Код</span><input class="input otp" id="lg-code" maxlength="6" inputmode="numeric" placeholder="______"></div>
              <div class="btn-row"><button class="btn btn-lg" data-act="login-check">Войти</button><button class="btn btn-lg btn-quiet" data-act="login-back">Изменить номер</button></div>
            </div>`}
        </div>
        <div class="split-media"><img src="${VISUALS.microscopeWoman}" alt="Специалист BYRAIN" loading="lazy"></div>
      </div>
    </div></section>`;
}

/* ---------- регистрация ---------- */

function regInit() {
  REG = REG || { step: 1, phone: "", sent: "", profile: { fullName: "", city: "", specialization: "COSMETOLOGIST", workFormat: "CLINIC", telegram: "", email: "" }, consents: {}, method: "EDUCATION", data: {}, error: "" };
  return REG;
}

function viewRegister() {
  const r = regInit();
  const steps = ["Телефон", "Профиль", "Подтверждения", "Статус"];
  const m = VERIFY_METHODS.find((x) => x.id === r.method);
  return `
    <section class="section-tight"><div class="wrap narrow">
      <div class="eyebrow eyebrow-accent">Допуск</div>
      <h1 style="font-size:clamp(32px,3.8vw,56px);margin:18px 0 14px">Заявка на допуск в BYRAIN PRO</h1>
      <p class="lead" style="margin-bottom:30px">Паспорт не запрашивается. Сканы документов удаляются после решения.</p>
      <div class="steps">${steps.map((s, i) => `<div class="step ${r.step === i + 1 ? "on" : r.step > i + 1 ? "done" : ""}">${i + 1}. ${s}</div>`).join("")}</div>
      <div class="frame" class="pad-36">
        ${r.error ? `<div class="err" style="margin-bottom:22px">${esc(r.error)}</div>` : ""}
        ${r.step === 1 ? `
          <div class="stack">
            <div class="field"><span class="label">Телефон</span><input class="input" id="rg-phone" value="${esc(r.phone)}" placeholder="+7 (999) 000-00-00" inputmode="tel"></div>
            <div><button class="btn btn-lg btn-block" data-act="reg-send">Получить код</button></div>
            <p class="small faint">Уже зарегистрированы? <a href="#/login" style="text-decoration:underline;font-weight:600">Войти</a></p>
          </div>` : ""}
        ${r.step === 1.5 ? `
          <div class="stack">
            <p class="muted">Код отправлен на ${phonePretty(r.phone)}.</p>
            <div class="ok-box">Код из СМС: <b class="mono-num">${esc(r.sent)}</b></div>
            <div class="field"><span class="label">Код</span><input class="input otp" id="rg-code" maxlength="6" inputmode="numeric" placeholder="______"></div>
            <div class="btn-row"><button class="btn btn-lg" data-act="reg-check">Подтвердить</button><button class="btn btn-lg btn-quiet" data-act="reg-back" data-to="1">Изменить номер</button></div>
          </div>` : ""}
        ${r.step === 2 ? `
          <div class="stack">
            <div class="form-grid">
              <div class="field"><span class="label">Фамилия, имя, отчество</span><input class="input" id="rg-name" value="${esc(r.profile.fullName)}" placeholder="Как в документах"></div>
              <div class="field"><span class="label">Город</span><input class="input" id="rg-city" value="${esc(r.profile.city)}" placeholder="Москва"></div>
              <div class="field"><span class="label">Специализация</span><select class="select" id="rg-spec">${SPECIALIZATIONS.map(([k, t]) => `<option value="${k}" ${r.profile.specialization === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
              <div class="field"><span class="label">Формат работы</span><select class="select" id="rg-format">${WORK_FORMATS.map(([k, t]) => `<option value="${k}" ${r.profile.workFormat === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
              <div class="field"><span class="label">Telegram, по желанию</span><input class="input" id="rg-tg" value="${esc(r.profile.telegram)}" placeholder="@nickname"></div>
              <div class="field"><span class="label">Email, по желанию</span><input class="input" id="rg-email" value="${esc(r.profile.email)}" placeholder="name@mail.ru"></div>
            </div>
            <div class="note">Получателем заказов всегда является специалист, указанный в аккаунте. Фамилия, имя и отчество должны совпадать с документами.</div>
            <div class="btn-row"><button class="btn btn-lg" data-act="reg-profile">Далее</button></div>
          </div>` : ""}
        ${r.step === 3 ? `
          <div class="stack">
            ${CONSENTS.map((c) => `<label class="check ${c.key ? "key" : ""} ${r.consents[c.id] ? "sel" : ""}"><input type="checkbox" data-act="consent" data-id="${c.id}" ${r.consents[c.id] ? "checked" : ""}><span>${esc(c.text)}</span></label>`).join("")}
            <p class="small faint">Дата, время и IP-адрес принятия фиксируются в аккаунте. Документы: <a href="#/legal/terms" style="text-decoration:underline">Условия PRO</a>, <a href="#/legal/statement" style="text-decoration:underline">Заявление</a>, <a href="#/legal/privacy" style="text-decoration:underline">Персональные данные</a>.</p>
            <div class="btn-row"><button class="btn btn-lg" data-act="reg-consents">Далее</button><button class="btn btn-lg btn-quiet" data-act="reg-back" data-to="2">Назад</button></div>
          </div>` : ""}
        ${r.step === 4 ? `
          <div class="stack">
            <div class="radio-row">
              ${VERIFY_METHODS.map((x) => `<label class="radio-card ${r.method === x.id ? "sel" : ""}">
                <input type="radio" name="vm" data-act="method" data-id="${x.id}" ${r.method === x.id ? "checked" : ""}>
                <span><b style="font-size:16px">${esc(x.name)}</b><br><span class="small muted">${esc(x.check)}</span><br><span class="badge ${x.auto ? "badge-sage" : "badge-line"}" style="margin-top:8px">${esc(x.speed)}</span></span></label>`).join("")}
            </div>
            <div class="rule"></div>
            <div class="stack">
              ${m.fields.map((f) => f.upload ? uploadZone(f) : `<div class="field"><span class="label">${esc(f.label)}</span><input class="input" id="vf-${f.name}" placeholder="${esc(f.ph)}" value="${esc(r.data[f.name] || "")}"></div>`).join("")}
            </div>
            <div class="frame-accent">Паспорт и биометрия не запрашиваются. Изображения документов удаляются сразу после решения по допуску.</div>
            <div class="btn-row"><button class="btn btn-lg" data-act="reg-submit">Отправить заявку</button><button class="btn btn-lg btn-quiet" data-act="reg-back" data-to="3">Назад</button></div>
          </div>` : ""}
      </div>
    </div></section>`;
}

/* ---------- корзина ---------- */

function viewCart() {
  const u = me();
  if (!u) return guestGate("Корзина доступна после входа");
  if (!isApproved(u)) return accessGate(u);
  const items = cartItems(u);
  const q = quote(items, pointsBalance(u), 0);
  if (!items.length) {
    return `<section class="section"><div class="wrap">
      <div class="split">
        <div class="split-body">
          <h1 style="font-size:clamp(32px,3.6vw,52px);margin-bottom:18px">Корзина пуста</h1>
          <p class="lead" style="margin-bottom:28px">Соберите заказ из линейки. От ${SETTINGS.tierThreeUnitsMin} единиц уровень ${SETTINGS.tierThreeUnitsPct} %, от ${SETTINGS.tierFullLineMin} единиц ${SETTINGS.tierFullLinePct} %.</p>
          <div class="btn-row"><a class="btn btn-lg" href="#/catalog">В каталог</a><a class="btn btn-lg btn-quiet" href="#/account/kits">Наборы по протоколам</a></div>
        </div>
        <div class="split-media"><img src="${VISUALS.trayKit}" alt="Набор BYRAIN" loading="lazy"></div>
      </div>
    </div></section>`;
  }
  const toFree = Math.max(0, SETTINGS.freeShippingFrom - q.afterDiscount);
  const freePct = Math.min(100, Math.round((q.afterDiscount / SETTINGS.freeShippingFrom) * 100));
  const tierPct = q.fullLine ? 100 : Math.min(100, Math.round((q.units / SETTINGS.tierFullLineMin) * 100));
  return `
    <section class="section-tight"><div class="wrap">
      <div class="acc-head">
        <div><h1 style="font-size:clamp(32px,3.6vw,52px)">Корзина</h1>
          <div class="muted" style="margin-top:8px">${q.units} ${plural(q.units, "единица", "единицы", "единиц")} в заказе, уровень ${q.discountPct} %</div></div>
        <span class="badge badge-dark" style="font-size:14px;padding:10px 16px">Скидка ${q.discountPct} %</span>
      </div>
      <div class="two-col">
        <div>
          ${q.lines.map((l) => `<div class="cart-line">
            <a class="cart-thumb" href="#/catalog/${l.product.slug}"><img src="${productVisual(l.product)}" alt="${esc(l.product.name)}" loading="lazy"></a>
            <div>
              <div class="p-coll">${esc(l.product.collection)}</div>
              <a href="#/catalog/${l.product.slug}" style="font-family:var(--serif);font-size:24px;display:block;margin:6px 0">${esc(l.product.name)}</a>
              <div class="small muted">${esc(l.product.volume)}, артикул ${esc(l.sku)}</div>
              <div style="margin-top:12px;font-size:17px"><b class="mono-num">${money(l.unitPrice)}</b> за единицу <span class="strike mono-num small">${money(l.rrp)}</span> <span class="badge badge-cool">уровень ${l.pct} %</span></div>
            </div>
            <div style="text-align:right">
              <div class="qty"><button data-act="qty" data-sku="${l.sku}" data-d="-1" aria-label="Убавить">−</button><span class="mono-num">${l.qty}</span><button data-act="qty" data-sku="${l.sku}" data-d="1" aria-label="Прибавить">+</button></div>
              <div style="margin-top:12px;font-size:21px;font-weight:700" class="mono-num">${money(l.lineTotal)}</div>
              <button class="btn-link xs" data-act="qty" data-sku="${l.sku}" data-d="0" style="margin-top:8px">Убрать</button>
            </div>
          </div>`).join("")}

          <div class="frame" style="margin-top:34px">
            <div class="between" style="margin-bottom:14px">
              <div class="eyebrow eyebrow-accent">Уровень заказа: ${q.discountPct} %</div>
              ${q.fullLine ? '<span class="badge badge-sage">Максимум программы</span>' : ""}
            </div>
            <div class="progress" style="margin-bottom:18px"><i style="width:${tierPct}%"></i></div>
            <div class="stack" style="gap:12px">
              ${!q.fullLine ? `<div>До уровня ${q.nextTierPct} % осталось ${q.unitsToNextTier} ${plural(q.unitsToNextTier, "единица", "единицы", "единиц")}. Подойдут любые продукты, в том числе уже добавленные.</div>` : ""}
              ${!q.fullLine && q.nextTierPct === SETTINGS.tierFullLinePct ? `<div><button class="btn btn-sm btn-accent" data-act="fill-tier">Дополнить до ${SETTINGS.tierFullLineMin} единиц и получить ${SETTINGS.tierFullLinePct} %</button></div>` : ""}
              ${q.fullLine ? `<div><b>В заказе ${q.units} ${plural(q.units, "единица", "единицы", "единиц")}. Уровень ${SETTINGS.tierFullLinePct} % применён ко всем строкам.</b></div>` : ""}
            </div>
          </div>

          <div class="grid cols-2" style="margin-top:20px">
            <div class="cell ${q.freeShipping ? "tile-sage" : ""}">
              <div class="eyebrow">Доставка</div>
              <p class="small" style="margin:12px 0 0">${q.freeShipping ? "Доставка бесплатная, отгрузка в течение суток." : `До бесплатной доставки ${money(toFree)}.`}</p>
              ${!q.freeShipping ? `<div class="progress" style="margin-top:14px"><i style="width:${freePct}%"></i></div>` : ""}
            </div>
            <div class="cell ${q.giftMaterials ? "tile-warm" : ""}">
              <div class="eyebrow">Материалы для кабинета</div>
              <p class="small" style="margin:12px 0 0">${q.giftMaterials ? "В заказ добавлены фирменные пакеты BYRAIN и рабочие тетради врача." : `Пакеты и тетради врача добавляются от ${money(SETTINGS.materialsGiftFrom)}.`}</p>
            </div>
          </div>
        </div>

        <div class="sticky-side">
          <div class="frame frame-ink">
            <div class="eyebrow eyebrow-accent" style="margin-bottom:16px">Итого по заказу</div>
            <div class="sum-row"><span class="muted">Сумма по РРЦ</span><span class="strike mono-num">${money(q.subtotalRrp)}</span></div>
            <div class="sum-row"><span class="muted">Скидка PRO, ${q.discountPct} %</span><span class="mono-num" style="color:var(--accent);font-weight:600">минус ${money(q.discountAmount)}</span></div>
            <div class="sum-row"><span class="muted">Единиц в заказе</span><span class="mono-num">${q.units}</span></div>
            <div class="sum-row"><span class="muted">Доставка</span><span class="mono-num">${q.shippingCost ? money(q.shippingCost) : "бесплатно"}</span></div>
            <div class="sum-row sum-total"><span>К оплате</span><span class="mono-num">${money(q.total)}</span></div>
            <div class="note" style="margin:18px 0">Начислим ${num(q.pointsToEarn)} ${plural(q.pointsToEarn, "балл", "балла", "баллов")} после оплаты. Доступно сейчас: ${num(pointsBalance(u))}.</div>
            <a class="btn btn-lg btn-block" href="#/checkout">Оформить заказ</a>
            <a class="btn btn-quiet btn-block" href="#/catalog" style="margin-top:12px">Дополнить заказ</a>
          </div>
        </div>
      </div>
    </div></section>`;
}

/* ---------- оформление ---------- */

function viewCheckout() {
  const u = me();
  if (!u) return guestGate("Оформление доступно после входа");
  if (!isApproved(u)) return accessGate(u);
  const items = cartItems(u);
  if (!items.length) return viewCart();
  const q = quote(items, pointsBalance(u), CHECKOUT.points);
  return `
    <section class="section-tight"><div class="wrap">
      <div class="acc-head"><div><h1 style="font-size:clamp(32px,3.6vw,52px)">Оформление заказа</h1>
        <div class="muted" style="margin-top:8px">${q.units} ${plural(q.units, "единица", "единицы", "единиц")}, уровень ${q.discountPct} %</div></div>
        <a class="btn btn-sm btn-quiet" href="#/cart">Вернуться в корзину</a></div>
      <div class="two-col">
        <div class="stack-lg">
          <div class="frame">
            <div class="eyebrow eyebrow-accent">Получатель</div>
            <p style="margin:14px 0 0;font-size:19px"><b>${esc(u.fullName)}</b></p>
            <p class="muted" style="margin:4px 0 0">${phonePretty(u.phone)}</p>
            <p class="small faint" style="margin-top:10px">Получатель заказа всегда равен ФИО аккаунта. Изменить можно в профиле.</p>
          </div>

          <div class="frame">
            <div class="eyebrow eyebrow-accent">Доставка</div>
            <div class="radio-row" style="margin:18px 0">
              <label class="radio-card ${CHECKOUT.mode !== "PICKUP" ? "sel" : ""}"><input type="radio" name="dm" data-act="dmode" data-v="COURIER" ${CHECKOUT.mode !== "PICKUP" ? "checked" : ""}><span><b style="font-size:16px">Курьером до двери</b><br><span class="small muted">${SETTINGS.shippingPromise}</span></span></label>
              <label class="radio-card ${CHECKOUT.mode === "PICKUP" ? "sel" : ""}"><input type="radio" name="dm" data-act="dmode" data-v="PICKUP" ${CHECKOUT.mode === "PICKUP" ? "checked" : ""}><span><b style="font-size:16px">Пункт выдачи</b><br><span class="small muted">Адрес пункта согласует менеджер</span></span></label>
            </div>
            <div class="form-grid">
              <div class="field"><span class="label">Город</span><input class="input" id="ck-city" value="${esc(u.city || "")}"></div>
              <div class="field"><span class="label">Индекс</span><input class="input" id="ck-zip" placeholder="101000" inputmode="numeric"></div>
            </div>
            <div class="field" style="margin-top:20px"><span class="label">Адрес</span><input class="input" id="ck-address" placeholder="Улица, дом, офис или кабинет"></div>
            <div class="field" style="margin-top:20px"><span class="label">Комментарий</span><input class="input" id="ck-comment" placeholder="Удобное время, домофон"></div>
          </div>

          <div class="frame">
            <div class="eyebrow eyebrow-accent">Оплата</div>
            <div class="radio-row" style="margin-top:18px">
              <label class="radio-card ${CHECKOUT.pay !== "INVOICE" ? "sel" : ""}"><input type="radio" name="pm" data-act="pmode" data-v="ONLINE" ${CHECKOUT.pay !== "INVOICE" ? "checked" : ""}><span><b style="font-size:16px">Онлайн, карта или СБП</b><br><span class="small muted">Менеджер пришлёт ссылку на оплату</span></span></label>
              <label class="radio-card ${CHECKOUT.pay === "INVOICE" ? "sel" : ""}"><input type="radio" name="pm" data-act="pmode" data-v="INVOICE" ${CHECKOUT.pay === "INVOICE" ? "checked" : ""}><span><b style="font-size:16px">Счёт на оплату</b><br><span class="small muted">Для ИП и организаций, счёт формируется сразу</span></span></label>
            </div>
          </div>

          ${pointsBalance(u) > 0 ? `<div class="frame tile-warm">
            <div class="eyebrow eyebrow-accent">Баллы</div>
            <p class="muted" style="margin:14px 0">Доступно ${num(pointsBalance(u))} ${plural(pointsBalance(u), "балл", "балла", "баллов")}. Оплатить можно до ${SETTINGS.pointsRedeemMaxPct} % суммы заказа, то есть не больше ${num(q.pointsMax)}.</p>
            <input type="range" min="0" max="${q.pointsMax}" step="50" value="${q.pointsUsed}" data-act="points" style="width:100%;accent-color:#76283a">
            <div class="between" style="margin-top:8px"><span class="xs faint">0</span><b class="mono-num" style="font-size:19px">минус ${money(q.pointsUsed)}</b><span class="xs faint mono-num">${num(q.pointsMax)}</span></div>
          </div>` : ""}
        </div>

        <div class="sticky-side">
          <div class="frame frame-ink">
            <div class="eyebrow eyebrow-accent" style="margin-bottom:16px">Состав заказа</div>
            ${q.lines.map((l) => `<div class="sum-row"><span class="muted">${esc(l.product.name)} × ${l.qty}</span><span class="mono-num">${money(l.lineTotal)}</span></div>`).join("")}
            <div class="rule" style="margin:14px 0"></div>
            <div class="sum-row"><span class="muted">Скидка PRO, ${q.discountPct} %</span><span class="mono-num" style="color:var(--accent);font-weight:600">минус ${money(q.discountAmount)}</span></div>
            ${q.pointsUsed ? `<div class="sum-row"><span class="muted">Баллы</span><span class="mono-num">минус ${money(q.pointsUsed)}</span></div>` : ""}
            <div class="sum-row"><span class="muted">Доставка</span><span class="mono-num">${q.shippingCost ? money(q.shippingCost) : "бесплатно"}</span></div>
            ${q.giftMaterials ? `<div class="sum-row"><span class="muted">${SETTINGS.materialsGiftText}</span><span>в подарок</span></div>` : ""}
            <div class="sum-row sum-total"><span>К оплате</span><span class="mono-num">${money(q.total)}</span></div>
            <div class="note" style="margin:18px 0">Баллов после оплаты: ${num(q.pointsToEarn)}</div>
            <button class="btn btn-lg btn-block" data-act="order">Подтвердить заказ</button>
            <p class="xs faint" style="margin-top:14px">Нажимая кнопку, специалист принимает Условия программы PRO.</p>
          </div>
        </div>
      </div>
    </div></section>`;
}

function guestGate(title) {
  return `<section class="section"><div class="wrap">
    <div class="split">
      <div class="split-body">
        <h1 style="font-size:clamp(30px,3.4vw,48px);margin-bottom:16px">${esc(title)}</h1>
        <p class="lead" style="margin-bottom:28px">Вход по номеру телефона и коду из СМС. Пароль не нужен.</p>
        <div class="btn-row"><a class="btn btn-lg" href="#/login">Войти</a><a class="btn btn-lg btn-outline" href="#/register">Получить допуск</a></div>
      </div>
      <div class="split-media"><img src="${VISUALS.lineFlatlay}" alt="Линейка BYRAIN" loading="lazy"></div>
    </div>
  </div></section>`;
}

function accessGate(u) {
  return `<section class="section"><div class="wrap">
    <div class="split">
      <div class="split-body">
        <span class="badge badge-accent">${STATUS_LABELS[u.status]}</span>
        <h1 style="font-size:clamp(30px,3.4vw,48px);margin:18px 0 16px">Цены PRO и покупка открываются после допуска</h1>
        <p class="lead">${u.status === "PENDING" ? "Заявка на проверке у менеджера. Решение по способам с ручной проверкой занимает до 24 часов." : u.status === "REJECTED" ? "По заявке отказано. Можно подать её повторно, выбрав другой способ подтверждения." : "Заявка ещё не подана."}</p>
        <div class="btn-row" style="margin-top:28px"><a class="btn btn-lg" href="#/account/verification">Страница допуска</a><a class="btn btn-lg btn-quiet" href="#/catalog">Смотреть линейку</a></div>
      </div>
      <div class="split-media"><img src="${VISUALS.boxDelivery}" alt="Заказ BYRAIN" loading="lazy"></div>
    </div>
  </div></section>`;
}

/* ---------- кабинет ---------- */

const ACC_NAV = [
  ["#/account", "Обзор"],
  ["#/account/orders", "Заказы"],
  ["#/account/kits", "Наборы"],
  ["#/account/points", "Баллы"],
  ["#/account/education", "Обучение"],
  ["#/account/verification", "Допуск"],
  ["#/account/profile", "Профиль"],
];

function accShell(active, inner) {
  return `<section class="section-tight"><div class="wrap">
    <div class="acc-layout">
      <nav class="side-nav">${ACC_NAV.map(([h, t]) => `<a href="${h}" class="${h === active ? "on" : ""}">${t}</a>`).join("")}</nav>
      <div>${inner}</div>
    </div>
  </div></section>`;
}

function viewAccount(sub, id) {
  const u = me();
  if (!u) return guestGate("Кабинет доступен после входа");
  if (u.status === "BLOCKED") return viewBlocked(u);
  if (sub === "orders" && id) return accShell("#/account/orders", orderDetail(u, id, false));
  if (sub === "invoice" && id) return invoiceView(u, id);
  const inner = {
    undefined: () => accOverview(u),
    orders: () => accOrders(u),
    kits: () => accKits(u),
    points: () => accPoints(u),
    education: () => accEducation(u),
    verification: () => accVerification(u),
    profile: () => accProfile(u),
  }[sub];
  return accShell(sub ? `#/account/${sub}` : "#/account", (inner || (() => accOverview(u)))());
}

function accOverview(u) {
  const orders = STATE.orders.filter((o) => o.userId === u.id);
  const paid = orders.filter((o) => ["PAID", "PACKING", "SHIPPED", "DELIVERED"].includes(o.status));
  const spent = paid.reduce((n, o) => n + o.total, 0);
  const hints = reorderHints(u);
  const reverify = u.reverifyDueAt ? Math.round((new Date(u.reverifyDueAt) - Date.now()) / 86400000) : null;
  const last = orders[0];
  return `
    <div class="acc-head">
      <div>
        <div class="eyebrow eyebrow-accent">Кабинет специалиста</div>
        <h1 style="font-size:clamp(30px,3.4vw,46px);margin-top:12px">${esc(u.fullName)}</h1>
        <div class="muted" style="margin-top:8px">${phonePretty(u.phone)}, ${esc(u.city || "")}, ${label(SPECIALIZATIONS, u.specialization)}</div>
      </div>
      <span class="badge ${u.status === "APPROVED" ? "badge-dark" : "badge-accent"}" style="font-size:12.5px;padding:10px 14px">${STATUS_LABELS[u.status]}${u.status === "APPROVED" ? `, ${u.tier === "CLINIC" ? "клиника" : "специалист"}` : ""}</span>
    </div>

    ${u.status !== "APPROVED" ? `<div class="frame-accent" style="margin-bottom:26px">
      <b style="font-size:17px">${u.status === "PENDING" ? "Заявка на проверке" : u.status === "REJECTED" ? "По заявке отказано" : "Заявка не подана"}</b>
      <p class="small muted" style="margin:10px 0 0">${u.status === "PENDING" ? "Решение по ручным способам занимает до 24 часов. Цены PRO откроются сразу после допуска." : "Откройте страницу допуска и подайте заявку, выбрав удобный способ подтверждения."}</p>
      <div class="btn-row" style="margin-top:18px"><a class="btn btn-sm" href="#/account/verification">Страница допуска</a></div>
    </div>` : ""}

    ${reverify !== null && reverify <= 30 && u.status === "APPROVED" ? `<div class="frame-accent" style="margin-bottom:26px"><b>Пора переподтвердить статус</b><p class="small muted" style="margin:10px 0 0">Срок действия допуска истекает через ${reverify} ${plural(reverify, "день", "дня", "дней")}.</p></div>` : ""}

    <div class="kpi">
      <div class="tile-cool"><div class="eyebrow">Баллы</div><div class="kpi-n mono-num" style="margin-top:10px">${num(pointsBalance(u))}</div><div class="small" style="margin-top:6px">1 балл равен 1 ₽</div></div>
      <div><div class="eyebrow">Оплаченных заказов</div><div class="kpi-n mono-num" style="margin-top:10px">${paid.length}</div><div class="small muted" style="margin-top:6px">всего заказов ${orders.length}</div></div>
      <div class="tile-warm"><div class="eyebrow">Выкуплено</div><div class="kpi-n mono-num" style="margin-top:10px">${money(spent)}</div><div class="small muted" style="margin-top:6px">по оплаченным заказам</div></div>
    </div>

    ${last ? `<div class="order-card" style="margin-top:26px">
      <div class="order-card-head">
        <div><b style="font-size:17px">Последний заказ ${last.number}</b><div class="small muted">${fmtDateTime(last.createdAt)}</div></div>
        ${statusBadge(last.status)}
      </div>
      <div class="order-thumbs">
        ${last.items.map((i) => { const p = bySku(i.sku); return `<a class="order-thumb" href="#/catalog/${p.slug}" title="${esc(p.name)}"><img src="${productVisual(p)}" alt="${esc(p.name)}" loading="lazy">${i.qty > 1 ? `<span class="mono-num">${i.qty}</span>` : ""}</a>`; }).join("")}
      </div>
      <div class="order-foot">
        <div><span class="muted small">Сумма</span> <b class="mono-num" style="font-size:19px">${money(last.total)}</b> <span class="badge badge-cool">уровень ${last.discountPct} %</span></div>
        <div class="btn-row"><a class="btn btn-sm btn-quiet" href="#/account/orders/${last.id}">Открыть заказ</a><button class="btn btn-sm" data-act="repeat" data-id="${last.id}">Повторить</button></div>
      </div>
    </div>` : ""}

    ${hints.length ? `<div class="frame" style="margin-top:26px">
      <div class="between" style="margin-bottom:18px">
        <div class="eyebrow eyebrow-accent">Пора дозаказать</div>
        <span class="badge badge-line">${hints.length} ${plural(hints.length, "позиция", "позиции", "позиций")}</span>
      </div>
      <div class="stack" style="gap:14px">
        ${hints.map((h) => { const p = bySku(h.sku); return `<div class="between" style="align-items:center;gap:16px">
          <div class="flex" style="gap:16px;align-items:center">
            <a class="order-thumb" href="#/catalog/${p.slug}"><img src="${productVisual(p)}" alt="${esc(p.name)}" loading="lazy"></a>
            <div><b>${esc(p.name)}</b><div class="xs faint">последний заказ ${h.days} ${plural(h.days, "день", "дня", "дней")} назад, обычный интервал ${h.interval} ${plural(h.interval, "день", "дня", "дней")}</div></div>
          </div>
          <button class="btn btn-sm btn-quiet" data-act="add" data-sku="${h.sku}">В корзину</button>
        </div>`; }).join("")}
      </div>
    </div>` : ""}

    <div class="grid cols-2" style="margin-top:26px">
      <div class="cell cell-flush">
        <div class="media media-16x9"><img src="${VISUALS.maskLabjack}" alt="Протоколы BYRAIN"  loading="lazy"></div>
        <div class="pad-28"><div class="eyebrow eyebrow-accent">Протоколы</div><p class="small muted" style="margin:12px 0 18px">Соберите состав процедуры один раз и дозаказывайте одной кнопкой.</p><a class="btn btn-sm btn-quiet" href="#/account/kits">Наборы</a></div>
      </div>
      <div class="cell cell-flush">
        <div class="media media-16x9"><img src="${VISUALS.microscopeWoman}" alt="Обучение BYRAIN"  loading="lazy"></div>
        <div class="pad-28"><div class="eyebrow eyebrow-accent">Сертификация</div><p class="small muted" style="margin:12px 0 18px">${u.education && u.education.passedAt ? `Сертификат ${esc(u.education.certCode)} получен ${fmtDate(u.education.passedAt)}. ${advState(u).passedAt ? "Ступень Advanced пройдена." : "Открыта продвинутая ступень из пяти модулей."}` : "Курс из пяти уроков и тест, проходной балл 80 %."}</p><a class="btn btn-sm btn-quiet" href="#/education">Обучение</a></div>
      </div>
    </div>`;
}

function statusBadge(s) {
  const cls = s === "PAID" || s === "DELIVERED" ? "badge-sage" : s === "CANCELLED" ? "badge-line" : s === "AWAITING_PAYMENT" ? "badge-accent" : "badge-dark";
  return `<span class="badge ${cls}">${label(ORDER_STATUSES, s)}</span>`;
}

function accOrders(u) {
  const orders = STATE.orders.filter((o) => o.userId === u.id);
  return `
    <div class="acc-head"><div><h1 style="font-size:clamp(28px,3vw,42px)">Заказы</h1>
      <div class="muted" style="margin-top:8px">${orders.length} ${plural(orders.length, "заказ", "заказа", "заказов")} в истории</div></div></div>
    ${orders.length ? `<div class="stack" style="gap:20px">
      ${orders.map((o) => `<div class="order-card">
        <div class="order-card-head">
          <div><b style="font-size:18px">${o.number}</b><div class="small muted">${fmtDateTime(o.createdAt)}, ${o.payment === "INVOICE" ? "счёт на оплату" : "онлайн-оплата"}</div></div>
          ${statusBadge(o.status)}
        </div>
        <div class="order-thumbs">
          ${o.items.map((i) => { const p = bySku(i.sku); return `<a class="order-thumb" href="#/catalog/${p.slug}" title="${esc(p.name)}"><img src="${productVisual(p)}" alt="${esc(p.name)}" loading="lazy">${i.qty > 1 ? `<span class="mono-num">${i.qty}</span>` : ""}</a>`; }).join("")}
        </div>
        <div class="order-foot">
          <div>
            <span class="muted small">${o.items.reduce((n, i) => n + i.qty, 0)} ${plural(o.items.reduce((n, i) => n + i.qty, 0), "единица", "единицы", "единиц")}, уровень ${o.discountPct} %</span>
            <div style="font-size:22px;font-weight:700" class="mono-num">${money(o.total)}</div>
          </div>
          <div class="btn-row">
            <a class="btn btn-sm btn-quiet" href="#/account/orders/${o.id}">Подробности</a>
            <button class="btn btn-sm" data-act="repeat" data-id="${o.id}">Повторить заказ</button>
          </div>
        </div>
      </div>`).join("")}
    </div>` : `<div class="locked">Заказов пока нет. <a href="#/catalog" style="text-decoration:underline;font-weight:600">Собрать заказ</a></div>`}`;
}

function orderDetail(u, id, staff) {
  const o = STATE.orders.find((x) => x.id === id);
  if (!o) return '<div class="locked">Заказ не найден.</div>';
  const owner = STATE.users.find((x) => x.id === o.userId);
  const codes = o.marking || {};
  return `
    <div class="acc-head">
      <div><div class="eyebrow eyebrow-accent">Заказ</div><h1 style="font-size:clamp(28px,3vw,42px);margin-top:10px">${o.number}</h1>
        <div class="muted" style="margin-top:8px">${fmtDateTime(o.createdAt)}, ${o.payment === "INVOICE" ? "счёт на оплату" : "онлайн-оплата"}</div></div>
      ${statusBadge(o.status)}
    </div>

    <div class="card"><div class="table-wrap"><table class="data">
      <thead><tr><th>Продукт</th><th>Уровень</th><th>Цена</th><th>Кол-во</th><th>Сумма</th>${staff ? "<th>Коды маркировки</th>" : ""}</tr></thead>
      <tbody>${o.items.map((i) => { const p = bySku(i.sku); return `<tr>
        <td><div class="flex" style="gap:14px;align-items:center"><a class="order-thumb" href="#/catalog/${p.slug}"><img src="${productVisual(p)}" alt="" loading="lazy"></a>
          <div><b>${esc(p.name)}</b><div class="xs faint">${esc(p.volume)}, ${i.sku}</div></div></div></td>
        <td>${i.pct} %</td>
        <td class="mono-num">${money(i.unitPrice)}<div class="xs strike">${money(i.rrp)}</div></td>
        <td class="mono-num">${i.qty}</td>
        <td class="mono-num"><b>${money(i.unitPrice * i.qty)}</b></td>
        ${staff ? `<td><input class="input" style="padding:10px 12px;font-size:13px" id="mk-${i.sku}" value="${esc((codes[i.sku] || []).join(", "))}" placeholder="${i.qty} ${plural(i.qty, 'код', 'кода', 'кодов')} через запятую"></td>` : ""}
      </tr>`; }).join("")}</tbody>
    </table></div></div>

    <div class="grid cols-2" style="margin-top:24px">
      <div class="cell">
        <div class="eyebrow eyebrow-accent">Суммы</div>
        <div style="margin-top:14px">
          <div class="sum-row"><span class="muted">По РРЦ</span><span class="strike mono-num">${money(o.subtotalRrp)}</span></div>
          <div class="sum-row"><span class="muted">Скидка ${o.discountPct} %</span><span class="mono-num" style="color:var(--accent);font-weight:600">минус ${money(o.discountAmount)}</span></div>
          ${o.pointsUsed ? `<div class="sum-row"><span class="muted">Баллы</span><span class="mono-num">минус ${money(o.pointsUsed)}</span></div>` : ""}
          <div class="sum-row"><span class="muted">Доставка</span><span class="mono-num">${o.shippingCost ? money(o.shippingCost) : "бесплатно"}</span></div>
          <div class="sum-row sum-total"><span>Итого</span><span class="mono-num">${money(o.total)}</span></div>
        </div>
        ${o.giftMaterials ? `<p class="small faint" style="margin-top:14px">В заказ добавлены фирменные пакеты BYRAIN и рабочие тетради врача.</p>` : ""}
      </div>
      <div class="cell tile-warm">
        <div class="eyebrow eyebrow-accent">Доставка и получатель</div>
        <p style="margin:14px 0 0"><b style="font-size:17px">${esc(owner ? owner.fullName : "")}</b></p>
        <p class="muted" style="margin:4px 0 0">${phonePretty(owner ? owner.phone : "")}<br>
        ${o.delivery.mode === "PICKUP" ? "Пункт выдачи" : "Курьером"}, ${esc(o.delivery.city || "")}, ${esc(o.delivery.address || "")} ${esc(o.delivery.zip || "")}</p>
        ${o.delivery.comment ? `<p class="small faint">${esc(o.delivery.comment)}</p>` : ""}
        <div class="btn-row" style="margin-top:20px">
          <a class="btn btn-sm btn-quiet" href="#/account/invoice/${o.id}">Счёт на оплату</a>
          ${!staff ? `<button class="btn btn-sm" data-act="repeat" data-id="${o.id}">Повторить заказ</button>` : ""}
        </div>
      </div>
    </div>

    ${staff ? `<div class="frame" style="margin-top:24px">
      <div class="eyebrow eyebrow-accent">Менеджер</div>
      <div class="btn-row" style="margin-top:16px">
        ${ORDER_STATUSES.filter(([k]) => k !== o.status).map(([k, t]) => `<button class="btn btn-sm btn-quiet" data-act="ostatus" data-id="${o.id}" data-s="${k}">${t}</button>`).join("")}
      </div>
      <div class="btn-row" style="margin-top:18px">
        <button class="btn btn-sm" data-act="save-codes" data-id="${o.id}">Сохранить коды</button>
        <button class="btn btn-sm btn-quiet" data-act="csv" data-id="${o.id}">Выгрузить CSV для кассы</button>
      </div>
      <p class="small faint" style="margin-top:12px">Вывод из оборота выполняет онлайн-касса при формировании чека с кодами.</p>
      ${CSV_VIEW && CSV_VIEW.orderId === o.id ? `
        <div class="panel" style="margin-top:20px">
          <div class="between">
            <div class="eyebrow eyebrow-accent">Выгрузка для кассы, формат CSV</div>
            <button class="btn-link" data-act="csv-close">Закрыть</button>
          </div>
          <textarea class="textarea" id="csv-text" readonly style="margin-top:14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;min-height:130px">${esc(CSV_VIEW.text)}</textarea>
          <div class="btn-row" style="margin-top:14px">
            <button class="btn btn-sm" data-act="csv-copy">Скопировать</button>
            ${CAN_DOWNLOAD ? '<button class="btn btn-sm btn-quiet" data-act="csv-download">Скачать файл</button>' : ""}
          </div>
        </div>` : ""}
    </div>` : ""}`;
}

function invoiceView(u, id) {
  const o = STATE.orders.find((x) => x.id === id);
  if (!o) return '<section class="section"><div class="wrap"><h2>Заказ не найден</h2></div></section>';
  const owner = STATE.users.find((x) => x.id === o.userId);
  return `<section class="section-tight"><div class="wrap narrow">
    <div class="btn-row no-print" style="margin-bottom:24px">${CAN_PRINT ? '<button class="btn btn-sm" data-act="print">Печать или PDF</button>' : ""}<a class="btn btn-sm btn-quiet" href="#/account/orders/${o.id}">К заказу</a></div>
    <div class="frame frame-ink" class="pad-48">
      <div class="between">
        <div><div class="brand-word" style="font-size:17px">BYRAIN</div><div class="eyebrow" style="margin-top:6px">Счёт на оплату</div></div>
        <div style="text-align:right"><b style="font-size:19px">${o.number}</b><div class="small faint">${fmtDate(o.createdAt)}</div></div>
      </div>
      <div class="rule" style="margin:28px 0"></div>
      <div class="grid cols-2">
        <div class="cell"><div class="eyebrow">Продавец</div><p class="small" style="margin-top:10px">${SETTINGS.sellerName}<br>Реквизиты заполняются в настройках платформы</p></div>
        <div class="cell"><div class="eyebrow">Плательщик</div><p class="small" style="margin-top:10px">${esc(owner ? owner.fullName : "")}<br>${phonePretty(owner ? owner.phone : "")}</p></div>
      </div>
      <table class="data" style="margin-top:28px">
        <thead><tr><th>Наименование</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead>
        <tbody>${o.items.map((i) => { const p = bySku(i.sku); return `<tr><td>${esc(p.name)}, ${esc(p.volume)}</td><td class="mono-num">${i.qty}</td><td class="mono-num">${money(i.unitPrice)}</td><td class="mono-num">${money(i.unitPrice * i.qty)}</td></tr>`; }).join("")}
        ${o.shippingCost ? `<tr><td>Доставка</td><td class="mono-num">1</td><td class="mono-num">${money(o.shippingCost)}</td><td class="mono-num">${money(o.shippingCost)}</td></tr>` : ""}</tbody>
      </table>
      <div class="sum-row sum-total" style="margin-top:18px"><span>Всего к оплате</span><span class="mono-num">${money(o.total)}</span></div>
      <p class="small faint" style="margin-top:22px">Основание: Условия программы BYRAIN PRO. Продукция приобретается для профессиональной деятельности. Отгрузка в течение одного рабочего дня после поступления оплаты.</p>
    </div>
  </div></section>`;
}

function accPoints(u) {
  const tx = (u.points || []).slice().reverse();
  const next = (u.points || []).filter((p) => p.delta > 0 && p.expiresAt).sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))[0];
  return `
    <div class="acc-head"><div><h1 style="font-size:clamp(28px,3vw,42px)">Баллы</h1>
      <div class="muted" style="margin-top:8px">${SETTINGS.pointsEarnPct} % от оплаченного заказа, 1 балл равен 1 ₽. Оплата до ${SETTINGS.pointsRedeemMaxPct} % заказа, срок ${SETTINGS.pointsExpiryMonths} месяцев.</div></div></div>
    <div class="kpi" style="grid-template-columns:repeat(2,1fr)">
      <div class="tile-cool"><div class="eyebrow">Доступно</div><div class="kpi-n mono-num" style="margin-top:10px">${num(pointsBalance(u))}</div></div>
      <div><div class="eyebrow">Ближайшее сгорание</div><div style="margin-top:14px;font-size:19px">${next ? `${num(next.delta)} ${plural(next.delta, "балл", "балла", "баллов")}, ${fmtDate(next.expiresAt)}` : "нет начислений"}</div></div>
    </div>
    ${tx.length ? `<div class="card" style="margin-top:24px"><div class="table-wrap"><table class="data">
      <thead><tr><th>Операция</th><th>Дата</th><th>Срок</th><th style="text-align:right">Баллы</th></tr></thead>
      <tbody>${tx.map((t) => `<tr><td><b>${POINT_TYPES[t.type] || t.type}</b></td><td class="muted">${fmtDate(t.createdAt)}</td><td class="muted">${t.expiresAt ? fmtDate(t.expiresAt) : ""}</td><td class="mono-num" style="text-align:right;font-size:17px"><b style="color:${t.delta > 0 ? "var(--sage)" : "var(--accent)"}">${t.delta > 0 ? "плюс " : "минус "}${num(Math.abs(t.delta))}</b></td></tr>`).join("")}</tbody>
    </table></div></div>` : '<div class="locked" style="margin-top:24px">Операций пока нет.</div>'}`;
}

function accKits(u) {
  const kits = u.kits || [];
  return `
    <div class="acc-head"><div><h1 style="font-size:clamp(28px,3vw,42px)">Наборы по протоколам</h1>
      <div class="muted" style="margin-top:8px">Сохраните состав процедуры один раз и дозаказывайте одной кнопкой.</div></div></div>
    <div class="grid cols-3">
      ${PROTOCOLS.map((pr, i) => `<div class="cell cell-flush">
        <div class="media media-4x3"><img src="${PROTOCOL_VISUAL[pr.name] || VISUALS.trayKit}" alt="${esc(pr.name)}"  loading="lazy"></div>
        <div class="pad-26">
          <h4>${esc(pr.name)}</h4>
          <div class="small muted" style="margin:12px 0 18px">${Object.keys(pr.skus).map((s) => `${esc(bySku(s).name)} × ${pr.skus[s]}`).join(", ")}</div>
          <div class="btn-row"><button class="btn btn-sm" data-act="kit-cart" data-i="${i}">В корзину</button><button class="btn btn-sm btn-quiet" data-act="kit-save" data-i="${i}">Сохранить себе</button></div>
        </div>
      </div>`).join("")}
    </div>
    ${kits.length ? `<h3 style="margin:36px 0 18px">Мои наборы</h3><div class="stack">
      ${kits.map((k, i) => `<div class="frame between" style="align-items:center">
        <div><b style="font-size:17px">${esc(k.name)}</b><div class="small faint" style="margin-top:6px">${Object.keys(k.skus).map((s) => `${esc(bySku(s).name)} × ${k.skus[s]}`).join(", ")}</div></div>
        <div class="btn-row"><button class="btn btn-sm" data-act="mykit-cart" data-i="${i}">В корзину</button><button class="btn-link" data-act="mykit-del" data-i="${i}">Удалить</button></div>
      </div>`).join("")}</div>` : ""}`;
}

function accVerification(u) {
  const v = u.verification;
  const m = v ? VERIFY_METHODS.find((x) => x.id === v.method) : null;
  return `
    <div class="acc-head">
      <div><h1 style="font-size:clamp(28px,3vw,42px)">Допуск</h1>
        <div class="muted" style="margin-top:8px">${u.verifiedAt ? `подтверждён ${fmtDate(u.verifiedAt)}` : "решение не принято"}${u.reverifyDueAt ? `, переподтверждение до ${fmtDate(u.reverifyDueAt)}` : ""}</div></div>
      <span class="badge ${u.status === "APPROVED" ? "badge-sage" : "badge-accent"}" style="font-size:12.5px;padding:10px 14px">${STATUS_LABELS[u.status]}</span>
    </div>

    ${v ? `<div class="frame">
      <div class="eyebrow eyebrow-accent">Поданная заявка</div>
      <p style="margin:14px 0 0;font-size:18px"><b>${esc(m ? m.name : v.method)}</b></p>
      <div class="small faint">${fmtDateTime(v.submittedAt)}</div>
      <div class="table-wrap" style="margin-top:16px"><table class="data"><tbody>
        ${Object.keys(v.data || {}).map((k) => `<tr><td class="muted" style="width:40%">${esc(fieldLabel(v.method, k))}</td><td><b>${esc(v.data[k])}</b></td></tr>`).join("")}
      </tbody></table></div>
      ${v.autoResult ? `<div class="ok-box" style="margin-top:16px">${esc(v.autoResult)}</div>` : ""}
      ${v.comment ? `<div class="err" style="margin-top:16px">Комментарий менеджера: ${esc(v.comment)}</div>` : ""}
    </div>` : '<div class="locked">Заявка не подана.</div>'}

    ${u.status === "APPROVED" ? `<div class="grid cols-2" style="margin-top:24px">
      <div class="cell tile-sage"><div class="eyebrow">Допуск активен</div><p class="small" style="margin-top:12px">Статус аккаунта: ${u.tier === "CLINIC" ? "клиника" : "специалист"}. Цены PRO, баллы, обучение и вебинары открыты.</p></div>
      <div class="cell cell-flush"><div class="media media-16x9"><img src="${VISUALS.boxDelivery}" alt="Отгрузка BYRAIN"  loading="lazy"></div>
        <div class="pad-26"><div class="eyebrow">Что дальше</div><p class="small muted" style="margin-top:10px">Соберите первый заказ: от ${SETTINGS.tierThreeUnitsMin} единиц уровень ${SETTINGS.tierThreeUnitsPct} %, от ${SETTINGS.tierFullLineMin} единиц ${SETTINGS.tierFullLinePct} %.</p><div class="btn-row" style="margin-top:16px"><a class="btn btn-sm" href="#/catalog">В каталог</a></div></div></div>
    </div>` : ""}

    ${u.status === "REJECTED" || u.status === "UNVERIFIED" ? `
      <div class="frame" style="margin-top:24px">
        <div class="eyebrow eyebrow-accent">Подать заявку заново</div>
        <div class="radio-row" style="margin-top:18px">
          ${VERIFY_METHODS.map((x) => { const cur = (REG && REG.method) || "EDUCATION"; return `<label class="radio-card ${cur === x.id ? "sel" : ""}"><input type="radio" name="rvm" data-act="method" data-id="${x.id}" ${cur === x.id ? "checked" : ""}><span><b>${esc(x.name)}</b><br><span class="small muted">${esc(x.check)}</span></span></label>`; }).join("")}
        </div>
        ${(() => { const mm = VERIFY_METHODS.find((x) => x.id === ((REG && REG.method) || "EDUCATION")); return `<div class="stack" style="margin-top:20px">${mm.fields.map((f) => f.upload ? uploadZone(f) : `<div class="field"><span class="label">${esc(f.label)}</span><input class="input" id="vf-${f.name}" placeholder="${esc(f.ph)}"></div>`).join("")}</div>`; })()}
        <div class="btn-row" style="margin-top:20px"><button class="btn btn-lg" data-act="resubmit">Отправить заявку</button></div>
      </div>` : ""}

    <div class="frame-accent" style="margin-top:24px">Паспорт и биометрия не запрашиваются. Изображения документов удаляются после решения, в аккаунте остаётся отметка о способе и дате проверки.</div>`;
}

function fieldLabel(method, key) {
  const m = VERIFY_METHODS.find((x) => x.id === method);
  const f = m && m.fields.find((x) => x.name === key);
  return f ? f.label : key;
}

function accProfile(u) {
  return `
    <div class="acc-head"><div><h1 style="font-size:clamp(28px,3vw,42px)">Профиль</h1>
      <div class="muted" style="margin-top:8px">Получателем заказов всегда указывается ФИО из профиля.</div></div></div>
    <div class="frame">
      <div class="form-grid">
        <div class="field"><span class="label">Фамилия, имя, отчество</span><input class="input" id="pf-name" value="${esc(u.fullName)}"></div>
        <div class="field"><span class="label">Город</span><input class="input" id="pf-city" value="${esc(u.city || "")}"></div>
        <div class="field"><span class="label">Специализация</span><select class="select" id="pf-spec">${SPECIALIZATIONS.map(([k, t]) => `<option value="${k}" ${u.specialization === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        <div class="field"><span class="label">Формат работы</span><select class="select" id="pf-format">${WORK_FORMATS.map(([k, t]) => `<option value="${k}" ${u.workFormat === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        <div class="field"><span class="label">Telegram</span><input class="input" id="pf-tg" value="${esc(u.telegram || "")}"></div>
        <div class="field"><span class="label">Email</span><input class="input" id="pf-email" value="${esc(u.email || "")}"></div>
      </div>
      <div class="field" style="margin-top:20px"><span class="label">Телефон, он же логин</span><input class="input" value="${phonePretty(u.phone)}" disabled></div>
      <div class="btn-row" style="margin-top:24px"><button class="btn btn-lg" data-act="profile-save">Сохранить</button></div>
    </div>
    <div class="frame" style="margin-top:24px">
      <div class="eyebrow eyebrow-accent">Согласия</div>
      <div class="stack" style="margin-top:16px">
        ${(u.consents || []).length ? (u.consents || []).map((c) => { const t = CONSENTS.find((x) => x.id === c.id); return `<div><b class="small">Принято ${fmtDateTime(c.at)}</b>, IP ${esc(c.ip)}<div class="small muted" style="margin-top:4px">${esc(t ? t.text : c.id)}</div></div>`; }).join("") : '<div class="small muted">Согласий нет.</div>'}
      </div>
    </div>`;
}

function accEducation(u) {
  const e = u.education;
  return `
    <div class="acc-head"><div><h1 style="font-size:clamp(28px,3vw,42px)">Обучение и размещение</h1></div></div>
    ${e && e.passedAt ? `
      <div class="grid cols-2">
        <div class="cell tile-cool">
          <div class="eyebrow">Сертификат</div>
          <div class="kpi-n mono-num" style="margin-top:12px;font-size:30px">${esc(e.certCode)}</div>
          <p class="small" style="margin:10px 0 18px">Результат ${e.score} %, выдан ${fmtDate(e.passedAt)}</p>
          <a class="btn btn-sm" href="#/education/certificate">Открыть сертификат</a>
        </div>
        <div class="cell cell-flush"><div class="media media-16x9"><img src="${VISUALS.teamOverhead}" alt="Специалисты BYRAIN" style="object-position:center 22%" loading="lazy"></div>
          <div class="pad-26"><div class="eyebrow">Публичный раздел</div><p class="small muted" style="margin-top:10px">${e.listed ? "Вы показаны в разделе «Где пройти процедуру»." : "Размещение выключено."}</p></div></div>
      </div>
      ${advAccountCard(u)}
      <div class="frame" style="margin-top:24px">
        <div class="eyebrow eyebrow-accent">Размещение в разделе «Где пройти процедуру»</div>
        <label class="check ${e.listed ? "sel" : ""}" style="margin-top:18px"><input type="checkbox" data-act="listed" ${e.listed ? "checked" : ""}><span>Показывать меня в публичном разделе специалистов<div class="small muted" style="margin-top:4px">Публикуются имя, город, специализация и описание. Телефон и почта не публикуются: клиент получает контакт у менеджера программы.</div></span></label>
        <div class="form-grid" style="margin-top:20px">
          <div class="field"><span class="label">Город</span><input class="input" value="${esc(u.city || "")}" disabled></div>
          <div class="field"><span class="label">Специализация</span><input class="input" value="${label(SPECIALIZATIONS, u.specialization)}" disabled></div>
        </div>
        <div class="field" style="margin-top:20px"><span class="label">О себе, до 300 знаков</span><textarea class="textarea" id="ed-about" maxlength="300" placeholder="Какие протоколы проводите, где принимаете">${esc(e.about || "")}</textarea></div>
        <div class="btn-row" style="margin-top:20px"><button class="btn btn-lg" data-act="listing-save">Сохранить</button></div>
      </div>` : `<div class="locked">Курс и тест открыты допущенным специалистам. <a href="#/education" style="text-decoration:underline;font-weight:600">Перейти к курсу</a></div>`}`;
}

/* Карточка продвинутой ступени в кабинете специалиста. */
function advAccountCard(u) {
  const a = advState(u);
  const read = advReadCount(u);
  const total = ADVANCED.modules.length;
  const last = advLast(u);
  if (a.passedAt) {
    return `<div class="frame frame-ink" style="margin-top:24px">
      <div class="between" style="align-items:center">
        <div>
          <span class="badge badge-sage">Advanced Specialist</span>
          <h3 style="margin:14px 0 8px">${esc(a.certCode)}</h3>
          <p class="small muted" style="margin:0">Выдан ${fmtDate(a.passedAt)}, действует до ${fmtDate(a.validUntil)}. Результат ${last ? last.right : ADVANCED.passRight} из ${ADVANCED.questions}. Отметка Advanced показана в карточке специалиста.</p>
        </div>
        <div class="btn-row"><a class="btn" href="#/education/advanced/certificate">Сертификат</a><a class="btn btn-quiet" href="#/education/advanced/result">Разбор</a></div>
      </div>
    </div>`;
  }
  const gate = advGate(u);
  return `<div class="frame" style="margin-top:24px">
    <div class="between" style="align-items:center">
      <div style="max-width:54ch">
        <div class="eyebrow eyebrow-accent">Ступень 02, продвинутая сертификация</div>
        <h3 style="margin:14px 0 8px">Изучено ${read} из ${total} ${plural(total, "модуля", "модулей", "модулей")}</h3>
        <p class="small muted" style="margin:0">${gate.ok
          ? `Итоговая аттестация открыта: ${ADVANCED.questions} вопросов, ${ADVANCED.minutes} минут, проходной балл ${ADVANCED.passScore} %.`
          : gate.reason === "WAIT" ? `Вторая попытка откроется ${fmtDate(gate.at)}.`
          : gate.reason === "SPENT" ? "Две попытки использованы, третья по отдельной оплате."
          : "Механизмы активов, доказательная база и подбор по клинической картине. Тест откроется после всех пяти модулей."}</p>
      </div>
      <div class="btn-row">
        <a class="btn" href="#/education/advanced">${read ? "Продолжить" : "Открыть программу"}</a>
        ${gate.ok ? '<a class="btn btn-quiet" href="#/education/advanced/test">К аттестации</a>' : ""}
      </div>
    </div>
    <div class="progress" style="margin-top:22px"><i style="width:${Math.round((read / total) * 100)}%"></i></div>
  </div>`;
}

function viewBlocked(u) {
  return `<section class="section"><div class="wrap">
    <div class="split">
      <div class="split-body">
        <span class="badge badge-accent">Аккаунт заблокирован</span>
        <h1 style="font-size:clamp(30px,3.4vw,48px);margin:18px 0 16px">Доступ к программе PRO закрыт</h1>
        <p class="lead">${esc(u.blockedReason || "Нарушение Условий программы PRO")}. Баллы аннулированы. По вопросам блокировки обратитесь к менеджеру.</p>
        <div class="btn-row" style="margin-top:28px"><a class="btn btn-lg" href="${SETTINGS.managerTelegram}" target="_blank" rel="noopener">Написать менеджеру</a><button class="btn btn-lg btn-outline" data-act="logout">Выйти</button></div>
      </div>
      <div class="split-media"><img src="${VISUALS.jarDark}" alt="BYRAIN" loading="lazy"></div>
    </div>
  </div></section>`;
}

/* ---------- обучение ---------- */

let QUIZ = null;
/* Активная попытка продвинутой аттестации живёт в памяти: порядок вопросов,
   порядок вариантов, ответы и срок таймера. Результат попытки сохраняется
   в профиле, поэтому страница результата работает и после перезагрузки. */
let ADV = null;
let ADV_TIMER = null;

const DECK_TONE = { dark: "tile-dark", navy: "tile-navy", cool: "tile-cool", warm: "tile-warm" };

function deckHref(id) {
  return DOCS_BASE + id + ".pdf";
}

function viewEducation(sub, sub2) {
  const u = me();
  if (sub === "certificate") return viewCertificate(u);
  if (sub === COURSE.slug) return viewCourse(u);
  if (sub === "deck") return viewDeck(sub2);
  if (sub === "advanced") {
    if (sub2 === "test") return viewAdvTest(u);
    if (sub2 === "result") return viewAdvResult(u);
    if (sub2 === "certificate") return viewAdvCertificate(u);
    return viewAdvanced(u);
  }
  return viewAcademy(u);
}

/* ---------- академия: обзор ---------- */

function baseState(u) {
  if (!isApproved(u)) return { badge: "После допуска", text: "Курс и тест открываются допущенным специалистам." };
  if (u.education && u.education.passedAt) {
    return { badge: "Пройдена", done: true, text: `Сертификат ${u.education.certCode}, результат ${u.education.score} %, выдан ${fmtDate(u.education.passedAt)}.` };
  }
  return { badge: "Открыта", text: "Пять уроков и тест из пяти вопросов. Попытки не ограничены." };
}

function advSummary(u) {
  if (!isApproved(u)) return { badge: "После допуска", text: "Ступень открывается допущенным специалистам после базовой сертификации." };
  if (!(u.education && u.education.passedAt)) return { badge: "После базовой", text: "Сначала базовая сертификация, затем продвинутая программа." };
  const a = advState(u);
  if (a.passedAt) return { badge: "Пройдена", done: true, text: `Сертификат ${a.certCode}, действует до ${fmtDate(a.validUntil)}.` };
  const read = advReadCount(u);
  if (read === 0) return { badge: "Открыта", text: "Пять модулей, 18 уроков, итоговая аттестация из 40 вопросов." };
  return { badge: "В процессе", text: `Изучено ${read} ${plural(read, "модуль", "модуля", "модулей")} из ${ADVANCED.modules.length}. ${advAllRead(u) ? "Итоговый тест открыт." : "Тест откроется после всех модулей."}` };
}

function viewAcademy(u) {
  const base = baseState(u);
  const adv = advSummary(u);
  const lessons = COURSE.lessons.length + ADVANCED.lessonsCount;
  const questions = COURSE.quiz.length + ADVANCED.questions;
  const deckPages = PRESENTATIONS.reduce((n, p) => n + p.pages, 0);
  return `
    <section class="section-tight"><div class="wrap">
      <div class="split">
        <div class="split-body">
          <div class="eyebrow eyebrow-accent">Академия BYRAIN PRO</div>
          <h1 style="font-size:clamp(32px,4.2vw,62px);margin:18px 0 18px">Две ступени сертификации и библиотека для кабинета</h1>
          <p class="lead">Базовая ступень учит применять линейку, продвинутая объясняет механизмы: почему формулы работают так, как работают, и как подбирать уход по клинической картине, а не по возрасту на упаковке.</p>
          <div class="btn-row" style="margin-top:30px">
            <a class="btn btn-lg" href="#/education/advanced">Продвинутая сертификация</a>
            <a class="btn btn-lg btn-quiet" href="#/education/${COURSE.slug}">Базовый курс</a>
          </div>
        </div>
        <div class="split-media"><img src="${VISUALS.scientist}" alt="Научный подход BYRAIN" loading="lazy"></div>
      </div>
    </div></section>

    <section class="section-tight" style="padding-top:0"><div class="wrap">
      <div class="tile-dark band">
        <div class="eyebrow">Программа обучения 2026</div>
        <h2 style="margin:14px 0 30px;color:#fffffc;max-width:30ch">Содержание, которое специалист может применить в кабинете на следующий день</h2>
        <div class="scale-grid scale-grid-4">
          <div class="scale-item"><div class="scale-n mono-num"><span data-count="2">0</span></div><div class="scale-l">ступени сертификации с разными задачами</div></div>
          <div class="scale-item"><div class="scale-n mono-num"><span data-count="${lessons}">0</span></div><div class="scale-l">уроков в двух программах</div></div>
          <div class="scale-item"><div class="scale-n mono-num"><span data-count="${questions}">0</span></div><div class="scale-l">вопросов аттестации, включая 6 клинических кейсов</div></div>
          <div class="scale-item"><div class="scale-n mono-num"><span data-count="${deckPages}">0</span></div><div class="scale-l">страниц презентаций в библиотеке</div></div>
        </div>
      </div>
    </div></section>

    <section class="section-tight" style="padding-top:0"><div class="wrap">
      <div class="levels">
        <div class="level">
          <div class="between" style="align-items:center">
            <span class="badge badge-line">Ступень 01</span>
            <span class="badge ${base.done ? "badge-sage" : "badge-dark"}">${esc(base.badge)}</span>
          </div>
          <h2 style="margin:22px 0 10px">Базовая сертификация</h2>
          <div class="level-sub">BYRAIN Certified Specialist</div>
          <p class="muted" style="margin:18px 0 0">Линейка, три кабинетных протокола и правила программы PRO. Бесплатно для всех допущенных специалистов.</p>
          <div class="level-nums">
            <div><b>5</b><span>уроков</span></div>
            <div><b>5</b><span>вопросов</span></div>
            <div><b>80 %</b><span>проходной балл</span></div>
          </div>
          <p class="small" style="margin:0 0 22px">${esc(base.text)}</p>
          <div class="btn-row" style="margin-top:auto">
            ${isApproved(u)
              ? `<a class="btn" href="#/education/${COURSE.slug}">${base.done ? "Открыть курс" : "Начать курс"}</a>${base.done ? '<a class="btn btn-quiet" href="#/education/certificate">Сертификат</a>' : ""}`
              : '<a class="btn" href="#/register">Получить допуск</a>'}
          </div>
        </div>

        <div class="level level-on">
          <div class="between" style="align-items:center">
            <span class="badge badge-light-line">Ступень 02</span>
            <span class="badge ${adv.done ? "badge-sage" : "badge-accent"}">${esc(adv.badge)}</span>
          </div>
          <h2 style="margin:22px 0 10px;color:#fffffc">Продвинутая сертификация</h2>
          <div class="level-sub">BYRAIN Advanced Specialist</div>
          <p class="muted" style="margin:18px 0 0">Кожа и барьер, пептиды, фитоэстрогены, активы обновления и клиническая практика. Механизмы, доказательная база, подбор по клинической картине.</p>
          <div class="level-nums">
            <div><b>18</b><span>уроков в 5 модулях</span></div>
            <div><b>40</b><span>вопросов, 6 кейсов</span></div>
            <div><b>85 %</b><span>проходной балл</span></div>
          </div>
          <p class="small" style="margin:0 0 22px;color:rgba(255,255,252,.8)">${esc(adv.text)}</p>
          <div class="btn-row" style="margin-top:auto">
            <a class="btn btn-light" href="#/education/advanced">Программа и модули</a>
            ${adv.done ? '<a class="btn btn-outline" style="color:#fffffc;border-color:rgba(255,255,252,.5)" href="#/education/advanced/certificate">Сертификат</a>' : ""}
          </div>
        </div>
      </div>
    </div></section>

    <section class="section-tight" style="padding-top:0"><div class="wrap">
      <h2 style="margin-bottom:22px">Чем ступени отличаются</h2>
      <div class="card"><div class="table-wrap"><table class="data data-stack"><thead><tr>
        <th></th><th>Certified Specialist</th><th>Advanced Specialist</th>
      </tr></thead><tbody>
        ${ADVANCED.compare.map(([k, a, b]) => `<tr><td class="row-head" style="width:20%">${esc(k)}</td><td style="width:40%" data-label="Certified">${esc(a)}</td><td style="width:40%" data-label="Advanced"><b>${esc(b)}</b></td></tr>`).join("")}
      </tbody></table></div></div>
    </div></section>

    <section class="section-tight" style="padding-top:0"><div class="wrap">
      <div class="between" style="align-items:flex-end;margin-bottom:26px">
        <div>
          <div class="eyebrow eyebrow-accent">Библиотека</div>
          <h2 style="margin-top:14px;max-width:24ch">Презентации для кабинета и консультации</h2>
        </div>
        <p class="small muted" style="max-width:44ch">${PRESENTATIONS.length} ${plural(PRESENTATIONS.length, "презентация", "презентации", "презентаций")}, ${deckPages} ${plural(deckPages, "страница", "страницы", "страниц")}. Каждую можно разобрать на странице или открыть в браузере целиком. Раздел пополняется.</p>
      </div>
      <div class="deck-grid">
        ${PRESENTATIONS.map(deckCard).join("")}
      </div>
    </div></section>

    <section style="padding-bottom:90px"><div class="wrap">
      ${banner(VISUALS.teamOverhead, { short: true, pos: "center 22%", alt: "Вебинары BYRAIN PRO", eyebrow: "Закрытые эфиры", title: "Вебинары с методистом и врачами программы", text: "Разборы линейки и клинической практики с врачами программы. Ссылки на эфиры открыты допущенным специалистам.", cta: ["К вебинарам", "#/webinars"] })}
    </div></section>`;
}

function deckCard(p) {
  return `<div class="deck-card">
    <div class="deck-media"><img src="${VISUALS[p.visual]}" alt="${esc(p.title)}" loading="lazy"></div>
    <div class="deck-body">
      <div class="deck-kicker">${esc(p.kicker)}</div>
      <h3 class="deck-title">${esc(p.title)}</h3>
      <div class="deck-sub">${esc(p.sub)}</div>
      <p class="deck-short">${esc(p.short)}</p>
      <div class="deck-meta">
        <span class="pdf-tag">PDF</span>
        <span class="badge badge-line">${p.pages} ${plural(p.pages, "страница", "страницы", "страниц")}</span>
        <span class="badge badge-cool">${esc(p.module)}</span>
        <span class="xs faint">${esc(p.minutes)}</span>
      </div>
      <div class="deck-figs">
        ${p.figures.slice(0, 3).map((f) => `<div><b>${esc(f.v)}</b><span>${esc(f.t)}</span></div>`).join("")}
      </div>
      <div class="btn-row" style="margin-top:auto">
        <a class="btn btn-sm" href="#/education/deck/${p.id}">Разобрать презентацию</a>
        <a class="btn btn-sm btn-quiet" href="${deckHref(p.id)}" target="_blank" rel="noopener">Смотреть в браузере</a>
      </div>
    </div>
  </div>`;
}

/* ---------- страница презентации ---------- */

function viewDeck(id) {
  const p = presentation(id);
  if (!p) return `<section class="section"><div class="wrap narrow"><h2>Презентация не найдена</h2><div class="btn-row" style="margin-top:20px"><a class="btn" href="#/education">К обучению</a></div></div></section>`;
  const href = deckHref(p.id);
  return `
    <section class="section-tight"><div class="wrap">
      <div class="small faint" style="margin-bottom:22px"><a href="#/education">Обучение</a> / Библиотека презентаций</div>
      <div class="split">
        <div class="split-body">
          <div class="eyebrow eyebrow-accent">${esc(p.kicker)}</div>
          <h1 style="font-size:clamp(32px,4.2vw,60px);margin:16px 0 14px">${esc(p.title)}</h1>
          <p class="lead" style="font-size:clamp(18px,1.8vw,24px);color:var(--ink)">${esc(p.sub)}</p>
          <p class="muted" style="margin:18px 0 0;max-width:52ch">${esc(p.short)}</p>
          <div class="deck-meta" style="margin-top:26px">
            <span class="pdf-tag">PDF</span>
            <span class="badge badge-line">${p.pages} ${plural(p.pages, "страница", "страницы", "страниц")}, ${p.mb} МБ</span>
            <span class="badge badge-cool">${esc(p.module)}</span>
            <span class="xs faint">${esc(p.year)}, ${esc(p.minutes)}</span>
          </div>
          <div class="btn-row" style="margin-top:28px">
            <a class="btn btn-lg" href="${href}" target="_blank" rel="noopener">Смотреть в браузере</a>
            ${CAN_DOWNLOAD ? `<a class="btn btn-lg btn-quiet" href="${href}" target="_blank" rel="noopener" download>Скачать PDF</a>` : ""}
          </div>
        </div>
        <div class="split-media"><img src="${VISUALS[p.visual]}" alt="${esc(p.title)}" loading="lazy"></div>
      </div>
    </div></section>

    <section class="section-tight" style="padding-top:0"><div class="wrap">
      <div class="clin-stats clin-stats-4">
        ${p.figures.map((f) => `<div class="clin-stat"><div class="clin-val">${esc(f.v)}</div><div class="clin-lab">${esc(f.t)}</div></div>`).join("")}
      </div>
    </div></section>

    <section class="section-tight" style="padding-top:0"><div class="wrap">
      <div class="grid cols-3">
        <div class="cell" style="grid-column:span 2">
          <div class="eyebrow eyebrow-accent">О презентации</div>
          <p style="margin:16px 0 0;font-size:17px;line-height:1.65">${esc(p.about)}</p>
        </div>
        <div class="cell ${DECK_TONE[p.tone] || "tile-warm"}">
          <div class="eyebrow">Для кого</div>
          <p class="small" style="margin-top:14px">${esc(p.audience)}</p>
          <div class="rule" style="margin:20px 0;opacity:.3"></div>
          <div class="eyebrow">Объём</div>
          <p class="small" style="margin-top:14px">${p.pages} ${plural(p.pages, "страница", "страницы", "страниц")}, ${esc(p.minutes)}</p>
        </div>
      </div>
    </div></section>

    <section class="section-tight" style="padding-top:0"><div class="wrap">
      <h2 style="margin-bottom:24px">Что внутри</h2>
      <div class="toc">
        ${p.sections.map((s, i) => `<div class="toc-row">
          <div class="toc-n mono-num">${String(i + 1).padStart(2, "0")}</div>
          <div><b class="toc-t">${esc(s[0])}</b><div class="small muted" style="margin-top:4px">${esc(s[1])}</div></div>
        </div>`).join("")}
      </div>
    </div></section>

    <section class="section-tight" style="padding-top:0"><div class="wrap">
      <div class="frame frame-ink">
        <div class="eyebrow eyebrow-accent">Главное из презентации</div>
        <ul class="bullets" style="margin-top:22px">
          ${p.takeaways.map((t) => `<li>${esc(t)}</li>`).join("")}
        </ul>
      </div>
    </div></section>

    <section style="padding-bottom:90px"><div class="wrap">
      <div class="frame-accent"><b>Источники.</b> ${esc(p.sources)}</div>
      <div class="btn-row" style="margin-top:26px">
        <a class="btn btn-lg" href="${href}" target="_blank" rel="noopener">Смотреть в браузере</a>
        <a class="btn btn-lg btn-quiet" href="#/education">Все презентации</a>
      </div>
    </div></section>`;
}

/* ---------- продвинутая сертификация: программа ---------- */

function viewAdvanced(u) {
  const ok = isApproved(u);
  const baseDone = !!(u && u.education && u.education.passedAt);
  const a = ok ? advState(u) : { modules: {}, attempts: [] };
  const read = ok ? advReadCount(u) : 0;
  const total = ADVANCED.modules.length;
  const gate = ok ? advGate(u) : { ok: false, reason: "ACCESS" };
  const last = ok ? advLast(u) : null;

  let testBox;
  if (!ok) {
    testBox = `<div class="locked">Программа открыта допущенным специалистам. <a href="#/register" style="text-decoration:underline;font-weight:600">Подать заявку</a></div>`;
  } else if (!baseDone) {
    testBox = `<div class="locked">Продвинутая ступень открывается после базовой сертификации. <a href="#/education/${COURSE.slug}" style="text-decoration:underline;font-weight:600">Пройти базовый курс</a></div>`;
  } else if (a.passedAt) {
    testBox = `<div class="frame frame-ink">
      <div class="between" style="align-items:center">
        <div>
          <span class="badge badge-sage">Аттестация пройдена</span>
          <h3 style="margin:14px 0 8px">Сертификат ${esc(a.certCode)}</h3>
          <p class="small muted" style="margin:0">Выдан ${fmtDate(a.passedAt)}, действует до ${fmtDate(a.validUntil)}. Результат ${last ? last.right : ADVANCED.passRight} из ${ADVANCED.questions}.</p>
        </div>
        <div class="btn-row"><a class="btn" href="#/education/advanced/certificate">Открыть сертификат</a><a class="btn btn-quiet" href="#/education/advanced/result">Разбор попытки</a></div>
      </div>
    </div>`;
  } else {
    const left = ADVANCED.attempts - a.attempts.length;
    testBox = `<div class="frame frame-ink">
      <div class="between" style="align-items:center">
        <div style="max-width:58ch">
          <div class="eyebrow eyebrow-accent">Итоговая аттестация</div>
          <h3 style="margin:14px 0 8px">${ADVANCED.questions} вопросов, ${ADVANCED.minutes} минут, проходной балл ${ADVANCED.passScore} %</h3>
          <p class="small muted" style="margin:0">${gate.ok
            ? `Тест открыт. ${left === ADVANCED.attempts ? "Включены две попытки" : "Осталась одна попытка"}. Верные ответы после попытки не показываются.`
            : gate.reason === "MODULES" ? `Отметьте просмотр всех ${total} модулей, чтобы открыть тест. Сейчас отмечено ${read}.`
            : gate.reason === "WAIT" ? `Вторая попытка откроется ${fmtDate(gate.at)}.`
            : "Две попытки использованы. Третья по отдельной оплате после повторного просмотра модулей."}</p>
        </div>
        <div class="btn-row">
          ${gate.ok ? '<a class="btn btn-lg" href="#/education/advanced/test">Начать аттестацию</a>' : '<span class="badge badge-line">Тест закрыт</span>'}
          ${last ? '<a class="btn btn-quiet" href="#/education/advanced/result">Прошлый результат</a>' : ""}
        </div>
      </div>
    </div>`;
  }

  return `
    <section class="section-tight"><div class="wrap">
      <div class="small faint" style="margin-bottom:22px"><a href="#/education">Обучение</a> / Ступень 02</div>
      <div class="split">
        <div class="split-body">
          <span class="badge badge-accent">Ступень 02</span>
          <h1 style="font-size:clamp(32px,4.2vw,62px);margin:18px 0 16px">${esc(ADVANCED.title)}</h1>
          <div class="eyebrow" style="margin-bottom:18px">${esc(ADVANCED.level)}</div>
          <p class="lead">${esc(ADVANCED.lead)}</p>
          <p style="margin:18px 0 0;font-size:17px;font-weight:600;max-width:52ch">${esc(ADVANCED.promise)}</p>
        </div>
        <div class="split-media"><img src="${VISUALS.petri}" alt="Исследования BYRAIN" loading="lazy"></div>
      </div>
    </div></section>

    <section class="section-tight" style="padding-top:0"><div class="wrap">
      <div class="metrics">
        <div class="metric"><div class="metric-n mono-num"><span data-count="${total}">0</span></div><div class="metric-t">модуля программы</div></div>
        <div class="metric"><div class="metric-n mono-num"><span data-count="${ADVANCED.lessonsCount}">0</span></div><div class="metric-t">урока, ${esc(ADVANCED.hours)} материала</div></div>
        <div class="metric"><div class="metric-n mono-num"><span data-count="${ADVANCED.questions}">0</span></div><div class="metric-t">вопросов итогового теста</div></div>
        <div class="metric"><div class="metric-n mono-num"><span data-count="${ADVANCED.passScore}">0</span> %</div><div class="metric-t">проходной балл, ${ADVANCED.passRight} верных ответа</div></div>
      </div>
    </div></section>

    <section class="section-tight" style="padding-top:0"><div class="wrap">
      <div class="grid cols-3">
        <div class="cell"><div class="eyebrow eyebrow-accent">Для кого</div><p class="muted" style="margin-top:14px">${esc(ADVANCED.audience)}</p></div>
        <div class="cell tile-cool"><div class="eyebrow">Формат</div><p style="margin-top:14px">${esc(ADVANCED.format)}</p></div>
        <div class="cell tile-warm"><div class="eyebrow eyebrow-accent">Результат</div><p class="muted" style="margin-top:14px">${esc(ADVANCED.result)}</p></div>
      </div>
    </div></section>

    ${ok && baseDone ? `<section class="section-tight" style="padding-top:0"><div class="wrap">
      <div class="prog-box">
        <div class="between" style="align-items:center">
          <div><div class="eyebrow eyebrow-accent">Прогресс</div><h3 style="margin:12px 0 0">Изучено ${read} из ${total} ${plural(total, "модуля", "модулей", "модулей")}</h3></div>
          <div class="prog-pct mono-num">${Math.round((read / total) * 100)} %</div>
        </div>
        <div class="progress" style="margin-top:20px"><i style="width:${Math.round((read / total) * 100)}%"></i></div>
        <div class="prog-steps">
          ${ADVANCED.modules.map((m) => `<span class="prog-step ${a.modules[m.key] ? "on" : ""}">${m.n}</span>`).join("")}
        </div>
      </div>
    </div></section>` : ""}

    <section class="section-tight" style="padding-top:0"><div class="wrap" id="adv-modules">
      <h2 style="margin-bottom:26px">Пять модулей, ${ADVANCED.lessonsCount} уроков</h2>
      <div class="stack" style="gap:24px">
        ${ADVANCED.modules.map((m, mi) => advModuleCard(m, mi, u, ok && baseDone, a)).join("")}
      </div>
    </div></section>

    <section class="section-tight" style="padding-top:0"><div class="wrap">
      ${testBox}
    </div></section>

    <section class="section-tight" style="padding-top:0"><div class="wrap">
      <h2 style="margin-bottom:24px">Регламент аттестации</h2>
      <div class="card"><div class="table-wrap"><table class="data"><tbody>
        ${ADVANCED.rules.map(([k, v]) => `<tr><td class="muted" style="width:24%">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}
      </tbody></table></div></div>
    </div></section>

    <section style="padding-bottom:90px"><div class="wrap">
      <div class="between" style="align-items:flex-end;margin-bottom:24px">
        <div><div class="eyebrow eyebrow-accent">Документ</div><h2 style="margin-top:14px">Образец сертификата</h2></div>
        <p class="small muted" style="max-width:40ch">Именной PDF в личном кабинете. Номер и код проверки ведут на страницу ${esc(ADVANCED.cert.verify)}, где видны имя, дата выдачи, срок действия и статус.</p>
      </div>
      ${advCertCard({ name: "Имя Фамилия", code: `${ADVANCED.cert.prefix}-2026-000001`, issued: null, until: null, sample: true })}
      <div class="grid cols-3" style="margin-top:24px">
        ${ADVANCED.certRules.map(([k, v]) => `<div class="cell"><div class="eyebrow eyebrow-accent">${esc(k)}</div><p class="small muted" style="margin-top:14px">${esc(v)}</p></div>`).join("")}
      </div>
    </div></section>`;
}

function advModuleCard(m, mi, u, active, a) {
  const deck = presentation(m.deck);
  const done = !!a.modules[m.key];
  return `<div class="mod ${done ? "mod-done" : ""}">
    <div class="mod-side">
      <div class="mod-n mono-num">${m.n}</div>
      <div class="mod-media"><img src="${VISUALS[m.visual]}" alt="${esc(m.title)}" loading="lazy"></div>
    </div>
    <div class="mod-body">
      <div class="between" style="align-items:flex-start">
        <div style="max-width:48ch">
          <h3 style="margin:0 0 12px">${esc(m.title)}</h3>
          <p class="muted" style="margin:0">${esc(m.lead)}</p>
        </div>
        <div class="mod-tags">
          <span class="badge badge-line">${m.lessons.length} ${plural(m.lessons.length, "урок", "урока", "уроков")}</span>
          <span class="badge badge-line">${esc(m.minutes)}</span>
          <span class="badge badge-cool">${m.qn} ${plural(m.qn, "вопрос", "вопроса", "вопросов")} в тесте</span>
        </div>
      </div>
      <div class="stack" style="gap:10px;margin-top:22px">
        ${m.lessons.map((l) => `<details class="lesson">
          <summary>${esc(l.t)}<span class="xs faint">урок</span></summary>
          <div class="lesson-body">${esc(l.b)}</div>
        </details>`).join("")}
      </div>
      <div class="mod-after">
        <div class="eyebrow eyebrow-accent">После модуля специалист</div>
        <p style="margin:12px 0 0;font-size:16.5px">${esc(m.after)}</p>
      </div>
      ${deck ? `<div class="mod-deck">
        <div><b>${esc(deck.title)}</b><div class="small muted" style="margin-top:4px">${esc(m.deckNote)}</div></div>
        <div class="btn-row"><a class="btn btn-sm btn-quiet" href="#/education/deck/${deck.id}">Открыть</a></div>
      </div>` : ""}
      ${active ? `<label class="check ${done ? "sel" : ""}" style="margin-top:20px">
        <input type="checkbox" data-act="adv-read" data-m="${mi}" ${done ? "checked" : ""}><span><b>Модуль изучен</b><div class="small muted" style="margin-top:4px">Отметка открывает итоговый тест после всех пяти модулей.</div></span>
      </label>` : ""}
    </div>
  </div>`;
}

/* ---------- продвинутая аттестация: тест ---------- */

function advLetter(i) {
  return ["А", "Б", "В", "Г"][i] || String(i + 1);
}

function viewAdvTest(u) {
  if (!isApproved(u)) return accessGate(u || { status: "UNVERIFIED" });
  if (!(u.education && u.education.passedAt)) {
    return `<section class="section"><div class="wrap narrow"><div class="locked">Сначала базовая сертификация. <a href="#/education/${COURSE.slug}" style="text-decoration:underline;font-weight:600">Пройти курс</a></div></div></section>`;
  }
  if (ADV) return advRunning(u);

  const gate = advGate(u);
  if (!gate.ok) {
    const a = advState(u);
    const text = gate.reason === "PASSED" ? "Аттестация уже пройдена."
      : gate.reason === "MODULES" ? `Отметьте просмотр всех ${ADVANCED.modules.length} модулей. Сейчас отмечено ${advReadCount(u)}.`
      : gate.reason === "WAIT" ? `Вторая попытка откроется ${fmtDate(gate.at)}, через ${ADVANCED.retryDays} дней после первой.`
      : "Две попытки использованы. Третья по отдельной оплате после повторного просмотра модулей.";
    return `<section class="section"><div class="wrap narrow">
      <div class="locked">${esc(text)}<div class="btn-row" style="justify-content:center;margin-top:22px">
        <a class="btn" href="#/education/advanced">К программе</a>
        ${a.attempts.length ? '<a class="btn btn-quiet" href="#/education/advanced/result">Результат попытки</a>' : ""}
        ${gate.reason === "WAIT" ? '<button class="btn btn-quiet" data-act="adv-skip-wait">Открыть сейчас, демонстрация</button>' : ""}
      </div></div>
    </div></section>`;
  }

  const n = advState(u).attempts.length + 1;
  return `<section class="section-tight"><div class="wrap narrow">
    <div class="small faint" style="margin-bottom:22px"><a href="#/education/advanced">Продвинутая сертификация</a> / Аттестация</div>
    <div class="eyebrow eyebrow-accent">Попытка ${n} из ${ADVANCED.attempts}</div>
    <h1 style="font-size:clamp(30px,3.6vw,50px);margin:16px 0 20px">Итоговая аттестация</h1>
    <p class="lead">${ADVANCED.questions} вопросов по пяти модулям, один верный ответ из четырёх. На попытку ${ADVANCED.minutes} минут, таймер виден на экране.</p>
    <div class="grid cols-2" style="margin-top:30px">
      <div class="cell"><div class="eyebrow eyebrow-accent">Как проходит</div><ul class="bullets" style="margin-top:16px">
        <li>Вопросы идут по модулям, между ними можно возвращаться</li>
        <li>Порядок вопросов и вариантов перемешан</li>
        <li>По истечении времени ответы фиксируются автоматически</li>
      </ul></div>
      <div class="cell tile-cool"><div class="eyebrow">Результат</div><ul class="bullets" style="margin-top:16px">
        <li>Проходной балл ${ADVANCED.passScore} %, это ${ADVANCED.passRight} верных ответа из ${ADVANCED.questions}</li>
        <li>При успехе номер сертификата сразу</li>
        <li>При неудаче перечень тем для повторения, верные ответы не показываются</li>
      </ul></div>
    </div>
    <div class="frame-accent" style="margin-top:24px"><b>Честность.</b> Один аккаунт, одна попытка одновременно. Публикация вопросов теста влечёт аннулирование сертификата.</div>
    <div class="btn-row" style="margin-top:30px"><button class="btn btn-lg" data-act="adv-start">Начать попытку</button><a class="btn btn-lg btn-quiet" href="#/education/advanced">Вернуться к модулям</a></div>
  </div></section>`;
}

function advRunning(u) {
  const step = ADV.step;
  const m = ADVANCED.modules[step];
  const items = ADV.order[step];
  const answered = Object.keys(ADV.answers).length;
  const blank = ADVANCED.questions - answered;
  const last = step === ADVANCED.modules.length - 1;
  return `<section class="section-tight" style="padding-bottom:90px"><div class="wrap narrow">
    <div class="test-bar">
      <div>
        <div class="eyebrow eyebrow-accent">Модуль ${m.n} из 0${ADVANCED.modules.length}</div>
        <div class="test-bar-t">${esc(m.title)}</div>
      </div>
      <div class="test-bar-right">
        <div class="test-count mono-num" id="adv-count">${answered} из ${ADVANCED.questions}</div>
        <div class="test-clock mono-num" id="adv-clock">${ADVANCED.minutes}:00</div>
      </div>
    </div>
    <div class="progress" style="margin-bottom:8px"><i id="adv-progress" style="width:${Math.round((answered / ADVANCED.questions) * 100)}%"></i></div>
    <div class="steps steps-5" style="margin:18px 0 32px">
      ${ADVANCED.modules.map((x, i) => `<button class="step ${i === step ? "on" : ""} ${i < step ? "done" : ""}" data-act="adv-step" data-i="${i}">${x.n}</button>`).join("")}
    </div>

    <div class="stack-lg">
      ${items.map((it, k) => {
        const q = ADV_QUIZ[it.qi];
        return `<div class="q-block" data-qi="${it.qi}">
          <div class="q-head">
            <div class="q-n mono-num">${String(k + 1).padStart(2, "0")}</div>
            <div>
              ${q.kase ? '<span class="badge badge-accent" style="margin-bottom:10px">Клинический кейс</span>' : ""}
              <b class="q-text">${esc(q.q)}</b>
            </div>
          </div>
          <div class="radio-row" style="margin-top:18px">
            ${it.opts.map((oi, pos) => `<label class="radio-card ${ADV.answers[it.qi] === oi ? "sel" : ""}">
              <input type="radio" name="adv${it.qi}" data-act="adv-ans" data-q="${it.qi}" data-o="${oi}" ${ADV.answers[it.qi] === oi ? "checked" : ""}>
              <span><i class="q-letter">${advLetter(pos)}</i>${esc(q.o[oi])}</span>
            </label>`).join("")}
          </div>
        </div>`;
      }).join("")}
    </div>

    ${ADV.confirm ? `<div class="frame frame-ink" style="margin-top:34px">
      <div class="eyebrow eyebrow-accent">Завершение попытки</div>
      <h3 style="margin:14px 0 10px">${blank ? `Без ответа ${blank} ${plural(blank, "вопрос", "вопроса", "вопросов")}` : "Ответы на все вопросы даны"}</h3>
      <p class="small muted" style="margin:0 0 20px">После завершения вернуться к ответам нельзя. Результат появится сразу.</p>
      <div class="btn-row"><button class="btn btn-lg" data-act="adv-submit">Завершить и узнать результат</button><button class="btn btn-lg btn-quiet" data-act="adv-cancel-submit">Продолжить тест</button></div>
    </div>` : `<div class="btn-row" style="margin-top:34px">
      ${step > 0 ? '<button class="btn btn-quiet" data-act="adv-prev">Предыдущий модуль</button>' : ""}
      ${last ? '<button class="btn btn-lg" data-act="adv-finish">Завершить попытку</button>' : '<button class="btn btn-lg" data-act="adv-next">Следующий модуль</button>'}
    </div>`}
  </div></section>`;
}

function viewAdvResult(u) {
  if (!isApproved(u)) return accessGate(u || { status: "UNVERIFIED" });
  const a = advState(u);
  const r = advLast(u);
  if (!r) return `<section class="section"><div class="wrap narrow"><div class="locked">Попыток ещё не было. <a href="#/education/advanced" style="text-decoration:underline;font-weight:600">К программе</a></div></div></section>`;
  const weak = r.byModule.map((x, i) => ({ x, i })).filter((p) => p.x.right < p.x.total);
  const gate = advGate(u);
  return `
    <section class="section-tight"><div class="wrap narrow">
      <div class="small faint" style="margin-bottom:22px"><a href="#/education/advanced">Продвинутая сертификация</a> / Результат</div>
      <div class="res ${r.passed ? "res-ok" : "res-no"}">
        <div>
          <span class="badge ${r.passed ? "badge-sage" : "badge-accent"}">${r.passed ? "Аттестация пройдена" : "Аттестация не пройдена"}</span>
          <h1 style="font-size:clamp(30px,3.6vw,52px);margin:18px 0 10px">${r.right} из ${ADVANCED.questions} верных ответов</h1>
          <p class="muted" style="margin:0">Попытка ${a.attempts.length} из ${ADVANCED.attempts}, ${fmtDateTime(r.at)}, ${r.minutes} ${plural(r.minutes, "минута", "минуты", "минут")}${r.auto ? ", время вышло" : ""}. Проходной балл ${ADVANCED.passScore} %, это ${ADVANCED.passRight} ответа.</p>
        </div>
        <div class="res-score mono-num">${r.score} %</div>
      </div>
    </div></section>

    <section class="section-tight" style="padding-top:0"><div class="wrap narrow">
      <div class="clin-chart">
        <div class="eyebrow" style="margin-bottom:20px">Результат по модулям</div>
        ${r.byModule.map((x, i) => {
          const m = ADVANCED.modules[i];
          const pct = Math.round((x.right / x.total) * 100);
          return `<div class="bar-row ${x.right < x.total ? "on" : ""}">
            <div class="bar-label">${m.n}. ${esc(m.title)}</div>
            <div class="bar-track"><i class="bar-fill" style="width:${pct}%"></i></div>
            <div class="bar-val">${x.right} из ${x.total}</div>
          </div>`;
        }).join("")}
      </div>
    </div></section>

    ${r.passed ? `
      <section class="section-tight" style="padding-top:0"><div class="wrap narrow">
        <div class="frame frame-ink">
          <div class="eyebrow eyebrow-accent">Сертификат</div>
          <h3 style="margin:14px 0 8px">${esc(a.certCode)}</h3>
          <p class="small muted" style="margin:0 0 20px">Выдан ${fmtDate(a.passedAt)}, действует до ${fmtDate(a.validUntil)}. За 30 дней до истечения срока откроется короткий тест по обновлениям линейки.</p>
          <div class="btn-row"><a class="btn btn-lg" href="#/education/advanced/certificate">Открыть сертификат</a><a class="btn btn-lg btn-quiet" href="#/account/education">В кабинет</a></div>
        </div>
      </div></section>
      <section style="padding-bottom:90px"><div class="wrap narrow">
        <h2 style="margin-bottom:10px">Разбор аттестации</h2>
        <p class="small muted" style="margin:0 0 24px">Пояснения методиста открываются после успешной попытки. Вопросы банка не публикуются и не передаются третьим лицам.</p>
        <div class="stack" style="gap:12px">
          ${ADVANCED.modules.map((m, mi) => `<details class="lesson">
            <summary>${m.n}. ${esc(m.title)}<span class="xs faint">${r.byModule[mi].right} из ${r.byModule[mi].total}</span></summary>
            <div class="lesson-body"><div class="stack" style="gap:18px">
              ${ADV_QUIZ.filter((q) => q.m === mi).map((q) => `<div>
                <b style="color:var(--ink);font-size:15.5px">${esc(q.q)}</b>
                <div class="small" style="margin-top:8px"><b>Верно:</b> ${esc(q.o[q.a])}</div>
                <div class="small muted" style="margin-top:6px">${esc(q.why)}</div>
              </div>`).join("")}
            </div></div>
          </details>`).join("")}
        </div>
      </div></section>`
    : `
      <section style="padding-bottom:90px"><div class="wrap narrow">
        <div class="frame frame-accent">
          <div class="eyebrow eyebrow-accent">Темы для повторения</div>
          <ul class="bullets" style="margin-top:18px">
            ${weak.map((p) => { const m = ADVANCED.modules[p.i]; return `<li>${m.n}. ${esc(m.title)}: ${esc(m.lead)}</li>`; }).join("")}
          </ul>
          <p class="small muted" style="margin:20px 0 0">Верные ответы не показываются: банк вопросов закрыт. Вернитесь к модулям и презентациям, затем откройте следующую попытку.</p>
        </div>
        <div class="btn-row" style="margin-top:26px">
          <a class="btn btn-lg" href="#/education/advanced">Вернуться к модулям</a>
          ${gate.ok ? '<a class="btn btn-lg btn-quiet" href="#/education/advanced/test">Следующая попытка</a>' : gate.reason === "WAIT" ? `<span class="badge badge-line" style="align-self:center">Следующая попытка ${fmtDate(gate.at)}</span>` : '<span class="badge badge-line" style="align-self:center">Попытки использованы</span>'}
        </div>
      </div></section>`}`;
}

/* ---------- сертификат продвинутой ступени ---------- */

function advCertCard(o) {
  const c = ADVANCED.cert;
  return `<div class="cert cert-adv">
    <div class="cert-top">
      <div class="brand-word" style="font-size:17px">BYRAIN<span class="brand-pro" style="margin-left:9px">PRO</span></div>
      <div class="xs faint mono-num">Сертификат № ${esc(o.code)}</div>
    </div>
    <h2 class="cert-level">Advanced Specialist</h2>
    <p class="small muted" style="margin:26px 0 8px">Настоящим подтверждается:</p>
    <div class="cert-name">${esc(o.name)}</div>
    <p class="cert-text">Программа продвинутой сертификации BYRAIN PRO пройдена полностью, по разделам «Кожа как орган-мишень», «Пептиды», «Фитоэстрогены и гормональное старение», «Активы обновления и барьер», «Клиническая практика». Итоговая аттестация сдана.</p>
    <div class="cert-grid">
      <div><div class="eyebrow">Дата выдачи</div><b>${o.issued ? fmtDate(o.issued) : "01.12.2026"}</b></div>
      <div><div class="eyebrow">Действителен до</div><b>${o.until ? fmtDate(o.until) : "01.12.2028"}</b></div>
      <div><div class="eyebrow">Проверка</div><b style="text-transform:uppercase">${esc(c.verify)}</b></div>
      <div class="cert-qr"><span>QR</span><div class="xs faint">код проверки</div></div>
    </div>
    <div class="cert-foot">
      <div><div class="xs faint">${esc(c.issuer)}</div></div>
      <div class="cert-sign"><div class="xs faint">${esc(c.role)}</div></div>
    </div>
    ${o.sample ? '<div class="cert-sample">Образец</div>' : ""}
  </div>`;
}

function viewAdvCertificate(u) {
  const a = u ? advState(u) : null;
  if (!a || !a.passedAt) {
    return `<section class="section"><div class="wrap narrow"><div class="locked">Сертификат Advanced Specialist выдаётся после итоговой аттестации. <a href="#/education/advanced" style="text-decoration:underline;font-weight:600">К программе</a></div></div></section>`;
  }
  return `<section class="section-tight" style="padding-bottom:90px"><div class="wrap narrow">
    <div class="btn-row no-print" style="margin-bottom:24px">${CAN_PRINT ? '<button class="btn btn-sm" data-act="print">Печать или PDF</button>' : ""}<a class="btn btn-sm btn-quiet" href="#/account/education">В кабинет</a><a class="btn btn-sm btn-quiet" href="#/education/advanced/result">Разбор аттестации</a></div>
    ${advCertCard({ name: u.fullName, code: a.certCode, issued: a.passedAt, until: a.validUntil })}
    <p class="small faint" style="margin-top:18px">${label(SPECIALIZATIONS, u.specialization)}, ${esc(u.city || "")}. Результат аттестации ${advLast(u) ? advLast(u).right : ADVANCED.passRight} из ${ADVANCED.questions}. Проверка по номеру на странице ${esc(ADVANCED.cert.verify)} или у менеджера программы PRO.</p>
  </div></section>`;
}

function viewCourse(u) {
  if (!isApproved(u)) return accessGate(u || { status: "UNVERIFIED" });
  const done = u.education && u.education.passedAt;
  return `
    <section class="section-tight"><div class="wrap narrow">
      <div class="eyebrow eyebrow-accent">Курс</div>
      <h1 style="font-size:clamp(30px,3.4vw,48px);margin:18px 0 26px">${esc(COURSE.title)}</h1>
      ${done ? `<div class="ok-box" style="margin-bottom:26px">Тест сдан ${fmtDate(u.education.passedAt)} с результатом ${u.education.score} %. Сертификат ${esc(u.education.certCode)}. <a href="#/education/certificate" style="text-decoration:underline;font-weight:600">Открыть</a></div>` : ""}
      <div class="stack">
        ${COURSE.lessons.map((l, i) => `<details class="lesson" ${i === 0 ? "open" : ""}>
          <summary>${esc(l.title)}<span class="xs faint">урок ${i + 1} из ${COURSE.lessons.length}</span></summary>
          <div class="lesson-body">${esc(l.body)}</div>
        </details>`).join("")}
      </div>

      <div class="frame frame-ink" style="margin-top:36px">
        <div class="eyebrow eyebrow-accent">Тест, ${COURSE.quiz.length} вопросов, проходной ${COURSE.passScore} %</div>
        <div class="stack-lg" style="margin-top:24px">
          ${COURSE.quiz.map((q, qi) => `<div>
            <b style="font-size:17px">${qi + 1}. ${esc(q.q)}</b>
            <div class="radio-row" style="margin-top:14px">
              ${q.options.map((o, oi) => `<label class="radio-card ${QUIZ && QUIZ[qi] === oi ? "sel" : ""}" class="pad-16">
                <input type="radio" name="q${qi}" data-act="quiz" data-q="${qi}" data-o="${oi}" ${QUIZ && QUIZ[qi] === oi ? "checked" : ""}><span>${esc(o)}</span></label>`).join("")}
            </div>
          </div>`).join("")}
        </div>
        <div class="btn-row" style="margin-top:28px"><button class="btn btn-lg" data-act="quiz-submit">Проверить ответы</button></div>
      </div>
    </div></section>`;
}

function viewCertificate(u) {
  if (!u || !u.education || !u.education.passedAt) return `<section class="section"><div class="wrap narrow"><h2>Сертификат ещё не выдан</h2><div class="btn-row" style="margin-top:20px"><a class="btn" href="#/education">К курсу</a></div></div></section>`;
  const e = u.education;
  return `<section class="section-tight"><div class="wrap narrow">
    <div class="btn-row no-print" style="margin-bottom:24px">${CAN_PRINT ? '<button class="btn btn-sm" data-act="print">Печать или PDF</button>' : ""}<a class="btn btn-sm btn-quiet" href="#/account/education">В кабинет</a></div>
    <div class="cert">
      <div class="brand-word" style="font-size:18px">BYRAIN</div>
      <div class="eyebrow eyebrow-accent" style="margin-top:10px">Certified Specialist</div>
      <h2 style="margin:34px 0 12px">${esc(u.fullName)}</h2>
      <p class="muted">${label(SPECIALIZATIONS, u.specialization)}, ${esc(u.city || "")}</p>
      <div class="rule" style="margin:32px 0"></div>
      <p>Программа «${esc(COURSE.title)}» пройдена,<br>знание кабинетных протоколов бренда подтверждено</p>
      <div class="cert-code" style="margin-top:32px">${esc(e.certCode)}</div>
      <p class="small faint" style="margin-top:12px">Результат теста ${e.score} %. Выдан ${fmtDate(e.passedAt)} Проверка сертификата по номеру у менеджера программы PRO.</p>
    </div>
  </div></section>`;
}

/* ---------- специалисты и вебинары ---------- */

function viewSpecialists() {
  const list = listingsPublic();
  const cities = [...new Set(list.map((s) => s.city))];
  return `
    <section class="section-tight"><div class="wrap">
      <div class="eyebrow eyebrow-accent">Публичный раздел</div>
      <h1 style="margin:18px 0 18px">Где пройти процедуру BYRAIN</h1>
      <p class="lead">Специалисты с подтверждённым допуском, которые включили размещение в кабинете. Города: ${cities.map(esc).join(", ")}. Контакты специалистов не публикуются: чтобы записаться, напишите менеджеру программы, он передаст телефон кабинета.</p>
    </div></section>
    <section class="section-tight" style="padding-top:0"><div class="wrap">
      ${banner(VISUALS.teamOverhead, { short: true, pos: "center 22%", alt: "Специалисты BYRAIN", eyebrow: "Сообщество", title: `${list.length} ${plural(list.length, "специалист", "специалиста", "специалистов")} в ${cities.length} ${plural(cities.length, "городе", "городах", "городах")}` })}
    </div></section>
    <section style="padding-bottom:90px"><div class="wrap">
      <div class="grid cols-2">
        ${list.map((s) => `<div class="cell">
          <div class="between"><b style="font-size:19px">${esc(s.name)}</b><span class="badge badge-cool">${esc(s.city)}</span></div>
          <div class="flex" style="gap:8px;margin-top:10px"><span class="small faint">${esc(s.spec)}</span>${s.adv ? '<span class="badge badge-dark">Advanced</span>' : ""}</div>
          <p class="muted" style="margin:16px 0 0">${esc(s.about)}</p>
        </div>`).join("")}
      </div>
      <div class="frame" style="margin-top:24px">
        <div class="between" style="align-items:center">
          <div style="max-width:54ch">
            <div class="eyebrow eyebrow-accent">Запись на процедуру</div>
            <h3 style="margin:14px 0 8px">Как попасть к специалисту</h3>
            <p class="small muted" style="margin:0">Напишите менеджеру программы, укажите город и задачу. Менеджер передаст контакты ближайшего специалиста с подтверждённым допуском и расскажет, какие протоколы он ведёт.</p>
          </div>
          <div class="btn-row"><a class="btn" href="${SETTINGS.managerTelegram}" target="_blank" rel="noopener">Написать менеджеру</a></div>
        </div>
      </div>
    </div></section>`;
}

function webCard(w, u, ok) {
  const done = w.status === "DONE";
  return `<div class="web ${done ? "web-done" : ""}">
    <div class="web-main">
      <div class="web-meta">
        <span class="badge ${done ? "badge-sage" : "badge-accent"}">${done ? "Завершён" : "Скоро"}</span>
        <span class="small faint">${done ? fmtDate(w.date) : esc(w.when)}</span>
        <span class="small faint">${esc(w.duration)}</span>
      </div>
      <h3 style="margin:16px 0 10px">${esc(w.title)}</h3>
      <p class="muted" style="margin:0 0 16px;max-width:62ch">${esc(w.description)}</p>
      <div class="chips">${(w.topics || []).map((t) => `<span class="badge badge-line">${esc(t)}</span>`).join("")}</div>
      <div class="small faint" style="margin-top:16px">${esc(w.speaker)}</div>
    </div>
    <div class="web-side">
      ${done
        ? `<div class="web-soon"><b>Завершён</b><span>${fmtDate(w.date)}</span></div>`
        : `<div class="web-soon"><b>Скоро</b><span>${esc(w.when)}</span></div>${ok ? '<div class="xs faint" style="margin-top:12px;max-width:22ch">Ссылка придёт в кабинет и на почту перед эфиром</div>' : '<span class="badge badge-line" style="margin-top:12px">Ссылка после допуска</span>'}`}
    </div>
  </div>`;
}

function viewWebinars() {
  const u = me();
  const ok = isApproved(u);
  const done = WEBINARS.filter((w) => w.status === "DONE");
  const soon = WEBINARS.filter((w) => w.status !== "DONE");
  return `
    <section class="section-tight"><div class="wrap">
      <div class="eyebrow eyebrow-accent">Вебинары</div>
      <h1 style="margin:18px 0 18px">Закрытые эфиры для специалистов</h1>
      <p class="lead">Темы, даты и спикеры открыты всем. Ссылки на эфир приходят допущенным специалистам. ${done.length} ${plural(done.length, "эфир", "эфира", "эфиров")} уже прошло, ${soon.length} ${plural(soon.length, "эфир", "эфира", "эфиров")} в плане.</p>
    </div></section>

    <section class="section-tight" style="padding-top:0"><div class="wrap">
      <div class="between" style="align-items:flex-end;margin-bottom:22px">
        <h2>Прошедшие эфиры</h2>
        <p class="small muted" style="max-width:40ch">Темы, которые уже разобрали с врачами программы. Материалы этих эфиров собраны в презентациях раздела «Обучение».</p>
      </div>
      <div class="stack" style="gap:20px">${done.map((w) => webCard(w, u, ok)).join("")}</div>
    </div></section>

    <section class="section-tight" style="padding-top:0"><div class="wrap">
      <div class="between" style="align-items:flex-end;margin-bottom:22px">
        <h2>Скоро в эфире</h2>
        <p class="small muted" style="max-width:40ch">Расписание на зиму и начало 2027 года. Точная дата и ссылка приходят в кабинет за три дня до эфира.</p>
      </div>
      <div class="stack" style="gap:20px">${soon.map((w) => webCard(w, u, ok)).join("")}</div>
    </div></section>

    <section style="padding-bottom:90px"><div class="wrap">
      ${ok
        ? '<div class="frame-accent"><b>Как попасть на эфир.</b> Анонс и ссылка приходят в личный кабинет и на почту, указанную в профиле, за три дня до эфира. Разобранные темы остаются в презентациях раздела «Обучение».</div>'
        : '<div class="locked">Ссылки на эфиры открыты допущенным специалистам. <a href="#/register" style="text-decoration:underline;font-weight:600">Подать заявку</a></div>'}
    </div></section>`;
}

/* ---------- документы ---------- */

function viewLegal(key) {
  const d = LEGAL[key] || LEGAL.terms;
  return `<section class="section-tight" style="padding-bottom:90px"><div class="wrap narrow">
    <div class="eyebrow eyebrow-accent">${esc(d.eyebrow)}</div>
    <h1 style="font-size:clamp(30px,3.4vw,50px);margin:18px 0 32px">${esc(d.title)}</h1>
    <div style="line-height:1.75">${d.html()}</div>
  </div></section>`;
}

/* ---------- админка ---------- */

const ADMIN_NAV = [
  ["#/admin", "Сводка"],
  ["#/admin/verifications", "Очередь допуска"],
  ["#/admin/orders", "Заказы"],
  ["#/admin/users", "Пользователи"],
  ["#/admin/products", "Каталог"],
  ["#/admin/reviews", "Отзывы"],
  ["#/admin/academy", "Обучение"],
  ["#/admin/settings", "Настройки"],
];

function viewAdmin(sub, id) {
  const u = me();
  if (!isStaff(u)) return `<section class="section"><div class="wrap narrow center">
    <h1 style="margin-bottom:18px">Раздел для сотрудников</h1>
    <p class="lead" style="margin:0 auto 26px">Войдите как администратор: кнопка в верхней полосе демо-стенда.</p>
    <button class="btn btn-lg" data-act="demo-admin">Войти как администратор</button></div></section>`;

  const inner = sub === "orders" && id ? orderDetail(u, id, true)
    : { undefined: () => admDash(), verifications: () => admVerifications(), orders: () => admOrders(), users: () => admUsers(), products: () => admProducts(), reviews: () => admReviews(), academy: () => admAcademy(), settings: () => admSettings() }[sub]();

  return `<section class="section-tight"><div class="wrap">
    <div class="acc-layout">
      <nav class="side-nav">${ADMIN_NAV.map(([h, t]) => `<a href="${h}" class="${h === (sub ? "#/admin/" + sub : "#/admin") ? "on" : ""}">${t}</a>`).join("")}</nav>
      <div>${inner}</div>
    </div>
  </div></section>`;
}

function admDash() {
  const pend = STATE.users.filter((u) => u.status === "PENDING").length;
  const awaiting = STATE.orders.filter((o) => o.status === "AWAITING_PAYMENT").length;
  const paid = STATE.orders.filter((o) => ["PAID", "PACKING", "SHIPPED", "DELIVERED"].includes(o.status));
  const revenue = paid.reduce((n, o) => n + o.total, 0);
  const flagged = STATE.users.filter((u) => {
    if (u.status !== "APPROVED" || !u.verifiedAt) return false;
    const months = (Date.now() - new Date(u.verifiedAt)) / 86400000 / 30;
    const units = STATE.orders.filter((o) => o.userId === u.id && o.status !== "CANCELLED").reduce((n, o) => n + o.items.reduce((m, i) => m + i.qty, 0), 0);
    return months > 6 && units <= 1;
  });
  return `
    <div class="acc-head"><div><div class="eyebrow eyebrow-accent">Админка</div><h1 style="font-size:clamp(28px,3vw,42px);margin-top:10px">Сводка</h1></div></div>
    <div class="kpi">
      <div class="${pend ? "tile-warm" : ""}"><div class="eyebrow">Очередь допуска</div><div class="kpi-n mono-num" style="margin-top:10px">${pend}</div><div class="small muted">${plural(pend, "заявка", "заявки", "заявок")} на проверке</div></div>
      <div class="${awaiting ? "tile-cool" : ""}"><div class="eyebrow">Ожидают оплаты</div><div class="kpi-n mono-num" style="margin-top:10px">${awaiting}</div><div class="small muted">${plural(awaiting, "заказ", "заказа", "заказов")}</div></div>
      <div class="tile-sage"><div class="eyebrow">Оплачено</div><div class="kpi-n mono-num" style="margin-top:10px">${money(revenue)}</div><div class="small">по ${paid.length} ${plural(paid.length, "заказу", "заказам", "заказам")}</div></div>
    </div>
    <div class="grid cols-2" style="margin-top:24px">
      <div class="cell"><div class="eyebrow">Допущено специалистов</div><div class="kpi-n mono-num" style="margin-top:10px">${STATE.users.filter((u) => u.status === "APPROVED" && u.role === "USER").length}</div></div>
      <div class="cell"><div class="eyebrow">Флаг на проверку</div><div class="kpi-n mono-num" style="margin-top:10px">${flagged.length}</div><div class="small muted">допуск старше 6 месяцев, выкуп до 1 единицы</div></div>
    </div>
    ${STATE.audit.length ? `<div class="card" style="margin-top:24px"><div class="table-wrap"><table class="data">
      <thead><tr><th>Действие</th><th>Детали</th><th>Кто</th><th>Когда</th></tr></thead>
      <tbody>${STATE.audit.slice(0, 12).map((a) => `<tr><td><b>${esc(a.action)}</b></td><td class="muted">${esc(a.detail || "")}</td><td class="muted">${esc(a.who)}</td><td class="muted">${fmtDateTime(a.at)}</td></tr>`).join("")}</tbody>
    </table></div></div>` : ""}`;
}

function admVerifications() {
  const q = STATE.users.filter((u) => u.status === "PENDING");
  return `
    <div class="acc-head"><div><h1 style="font-size:clamp(28px,3vw,42px)">Очередь допуска</h1>
      <div class="muted" style="margin-top:8px">Заявок на проверке: ${q.length}. Сканы удаляются сразу после решения.</div></div></div>
    <div class="stack" style="gap:20px">
      ${q.length ? q.map((u) => { const m = VERIFY_METHODS.find((x) => x.id === u.verification.method); return `<div class="frame">
        <div class="between">
          <div><b style="font-size:19px">${esc(u.fullName)}</b><div class="small faint" style="margin-top:6px">${phonePretty(u.phone)}, ${esc(u.city)}, ${label(SPECIALIZATIONS, u.specialization)}, ${label(WORK_FORMATS, u.workFormat)}</div></div>
          <span class="badge badge-accent">${esc(m ? m.name : u.verification.method)}</span>
        </div>
        <div class="table-wrap" style="margin-top:18px"><table class="data"><tbody>
          ${Object.keys(u.verification.data || {}).map((k) => `<tr><td class="muted" style="width:38%">${esc(fieldLabel(u.verification.method, k))}</td><td><b>${esc(u.verification.data[k])}</b></td></tr>`).join("")}
          <tr><td class="muted">Проверка</td><td>${esc(m ? m.check : "")}</td></tr>
          ${u.verification.autoResult ? `<tr><td class="muted">Автопроверка</td><td>${esc(u.verification.autoResult)}</td></tr>` : ""}
          <tr><td class="muted">Согласия</td><td>${(u.consents || []).length} из ${CONSENTS.length}, ${fmtDateTime((u.consents || [{}])[0].at)}, IP ${esc((u.consents || [{}])[0].ip || "")}</td></tr>
        </tbody></table></div>
        <div class="btn-row" style="margin-top:20px">
          <button class="btn btn-sm" data-act="approve" data-id="${u.id}" data-tier="SPECIALIST">Допустить, специалист</button>
          <button class="btn btn-sm btn-outline" data-act="approve" data-id="${u.id}" data-tier="CLINIC">Допустить, клиника</button>
          <button class="btn btn-sm btn-quiet" data-act="reject" data-id="${u.id}">Отказать</button>
        </div>
        <div class="field" style="margin-top:14px"><input class="input" id="rj-${u.id}" placeholder="Комментарий при отказе"></div>
      </div>`; }).join("") : '<div class="locked">Очередь пуста.</div>'}
    </div>`;
}

function admOrders() {
  return `
    <div class="acc-head"><div><h1 style="font-size:clamp(28px,3vw,42px)">Заказы</h1>
      <div class="muted" style="margin-top:8px">Всего ${STATE.orders.length} ${plural(STATE.orders.length, "заказ", "заказа", "заказов")}</div></div></div>
    ${STATE.orders.length ? `<div class="card"><div class="table-wrap"><table class="data">
      <thead><tr><th>Номер</th><th>Специалист</th><th>Дата</th><th>Единиц</th><th>Сумма</th><th>Оплата</th><th>Статус</th></tr></thead>
      <tbody>${STATE.orders.map((o) => { const ow = STATE.users.find((x) => x.id === o.userId); return `<tr>
        <td class="nowrap"><a href="#/admin/orders/${o.id}" style="text-decoration:underline;font-weight:600">${o.number}</a></td>
        <td>${esc(ow ? ow.fullName : "")}<div class="xs faint">${ow ? phonePretty(ow.phone) : ""}</div></td>
        <td class="muted">${fmtDateTime(o.createdAt)}</td>
        <td class="mono-num">${o.items.reduce((n, i) => n + i.qty, 0)}</td>
        <td class="mono-num"><b>${money(o.total)}</b></td>
        <td class="muted">${o.payment === "INVOICE" ? "счёт" : "онлайн"}</td>
        <td>${statusBadge(o.status)}</td></tr>`; }).join("")}</tbody>
    </table></div></div>` : '<div class="locked">Заказов нет.</div>'}`;
}

function admUsers() {
  return `
    <div class="acc-head"><div><h1 style="font-size:clamp(28px,3vw,42px)">Пользователи</h1>
      <div class="muted" style="margin-top:8px">Блокировка аннулирует баллы и закрывает доступ немедленно, по пункту 5 Условий программы PRO.</div></div></div>
    <div class="card"><div class="table-wrap"><table class="data">
      <thead><tr><th>Специалист</th><th>Статус</th><th>Баллы</th><th>Выкуп</th><th>Действия</th></tr></thead>
      <tbody>${STATE.users.map((u) => {
        const units = STATE.orders.filter((o) => o.userId === u.id && o.status !== "CANCELLED").reduce((n, o) => n + o.items.reduce((m, i) => m + i.qty, 0), 0);
        return `<tr>
          <td><b>${esc(u.fullName)}</b><div class="xs faint">${phonePretty(u.phone)}, ${esc(u.city || "")}${u.role !== "USER" ? ", " + u.role : ""}</div></td>
          <td>${STATUS_LABELS[u.status]}${u.status === "APPROVED" ? `<div class="xs faint">${u.tier === "CLINIC" ? "клиника" : "специалист"}, до ${fmtDate(u.reverifyDueAt)}</div>` : ""}${u.blockedReason ? `<div class="xs faint">${esc(u.blockedReason)}</div>` : ""}</td>
          <td class="mono-num">${num(pointsBalance(u))}</td>
          <td class="mono-num">${units} ед.</td>
          <td>${u.role === "ADMIN" ? '<span class="xs faint">нельзя изменить</span>' : u.status === "BLOCKED"
            ? `<button class="btn-link" data-act="unblock" data-id="${u.id}">Разблокировать</button>`
            : ASK_BLOCK === u.id
            ? `<div class="stack" style="gap:10px;min-width:250px">
                 <input class="input" style="padding:10px 12px;font-size:13px" id="bl-${u.id}" value="Перепродажа на маркетплейсе, пункт 4 Условий">
                 <div class="btn-row" style="gap:10px">
                   <button class="btn btn-sm btn-accent" data-act="block-yes" data-id="${u.id}">Заблокировать</button>
                   <button class="btn-link" data-act="block-no">Отмена</button>
                 </div>
               </div>`
            : `<button class="btn-link" data-act="block" data-id="${u.id}">Заблокировать</button>`}</td>
        </tr>`; }).join("")}</tbody>
    </table></div></div>`;
}

function admProducts() {
  return `
    <div class="acc-head"><div><h1 style="font-size:clamp(28px,3vw,42px)">Каталог</h1>
      <div class="muted" style="margin-top:8px">Источник правды по РРЦ, изображениям и id продуктов: Medusa-бэкенд byrain.ru. Синхронизация по handle.</div></div>
      <button class="btn btn-sm" data-act="sync">Синхронизировать</button></div>
    <div class="card"><div class="table-wrap"><table class="data">
      <thead><tr><th>Продукт</th><th>Коллекция</th><th>Объём</th><th>РРЦ</th><th>30 %</th><th>40 %</th><th>50 %</th></tr></thead>
      <tbody>${CATALOG.map((p) => `<tr>
        <td><div class="flex" style="gap:14px;align-items:center"><a class="order-thumb" href="#/catalog/${p.slug}"><img src="${productVisual(p)}" alt="" loading="lazy"></a>
          <div><b>${esc(p.name)}</b><div class="xs faint">${p.sku}, ${esc(p.medusaHandle)}</div></div></div></td>
        <td class="muted">${esc(p.collection)}</td>
        <td class="mono-num">${esc(p.volume)}</td>
        <td class="mono-num">${money(p.rrp)}</td>
        <td class="mono-num">${money(discountedPrice(p.rrp, 30))}</td>
        <td class="mono-num">${money(discountedPrice(p.rrp, 40))}</td>
        <td class="mono-num"><b>${money(discountedPrice(p.rrp, 50))}</b></td>
      </tr>`).join("")}</tbody>
    </table></div></div>`;
}

function admReviews() {
  const pend = STATE.reviews.filter((r) => r.status === "PENDING");
  const pub = STATE.reviews.filter((r) => r.status === "PUBLISHED");
  return `
    <div class="acc-head"><div><h1 style="font-size:clamp(28px,3vw,42px)">Отзывы</h1>
      <div class="muted" style="margin-top:8px">На модерации ${pend.length}, опубликовано ${pub.length}</div></div></div>
    <div class="stack" style="gap:18px">
      ${pend.length ? pend.map((r) => `<div class="frame frame-ink">
        <div class="between"><b style="font-size:17px">${esc(r.author)}</b><span class="badge badge-line">${esc(bySku(r.sku).name)}, оценка ${r.rating}</span></div>
        <p class="muted" style="margin:14px 0">${esc(r.text)}</p>
        <div class="btn-row"><button class="btn btn-sm" data-act="rv-pub" data-id="${r.id}">Опубликовать</button><button class="btn btn-sm btn-quiet" data-act="rv-del" data-id="${r.id}">Удалить</button></div>
      </div>`).join("") : '<div class="locked">Новых отзывов нет.</div>'}
    </div>
    <h3 style="margin:36px 0 18px">Опубликованные</h3>
    <div class="card"><div class="table-wrap"><table class="data">
      <thead><tr><th>Автор</th><th>Продукт</th><th>Оценка</th><th></th></tr></thead>
      <tbody>${pub.map((r) => `<tr><td><b>${esc(r.author)}</b><div class="xs faint">${esc(r.city || "")}</div></td><td class="muted">${esc(bySku(r.sku).name)}</td><td class="mono-num">${r.rating}</td><td style="text-align:right"><button class="btn-link" data-act="rv-del" data-id="${r.id}">Снять</button></td></tr>`).join("")}</tbody>
    </table></div></div>`;
}

/* Закрытый раздел методиста: банк вопросов продвинутой аттестации с ключом,
   пояснениями и долей верных ответов. Специалистам эти данные не показываются
   ни на одном экране, кроме разбора после успешной попытки. */

function advAttemptsAll() {
  const out = [];
  STATE.users.forEach((u) => {
    const a = u.education && u.education.advanced;
    if (!a || !a.attempts) return;
    a.attempts.forEach((at) => out.push({ at, user: u }));
  });
  return out.sort((x, y) => new Date(y.at.at) - new Date(x.at.at));
}

/* Доля верных ответов по вопросу, по всем сохранённым попыткам. */
function advQuestionStat(qi) {
  const scored = advAttemptsAll().filter((r) => Array.isArray(r.at.wrong));
  if (!scored.length) return null;
  const miss = scored.filter((r) => r.at.wrong.includes(qi)).length;
  return { total: scored.length, right: scored.length - miss, pct: Math.round(((scored.length - miss) / scored.length) * 100) };
}

function admAcademy() {
  const specialists = STATE.users.filter((u) => u.role === "USER" && u.status === "APPROVED");
  const base = specialists.filter((u) => u.education && u.education.passedAt);
  const adv = specialists.filter((u) => u.education && u.education.advanced && u.education.advanced.passedAt);
  const inProgress = specialists.filter((u) => {
    const a = u.education && u.education.advanced;
    return a && !a.passedAt && (Object.keys(a.modules || {}).some((k) => a.modules[k]) || (a.attempts || []).length);
  });
  const attempts = advAttemptsAll();
  const passedAttempts = attempts.filter((r) => r.at.passed).length;
  const avg = attempts.length ? Math.round(attempts.reduce((n, r) => n + r.at.score, 0) / attempts.length) : 0;

  /* Модули, в которых теряют баллы чаще всего */
  const byModule = ADVANCED.modules.map((m, mi) => {
    const rows = attempts.map((r) => r.at.byModule[mi]).filter(Boolean);
    const right = rows.reduce((n, x) => n + x.right, 0);
    const total = rows.reduce((n, x) => n + x.total, 0);
    return { m, pct: total ? Math.round((right / total) * 100) : null, total };
  });

  return `
    <div class="acc-head">
      <div><div class="eyebrow eyebrow-accent">Админка</div><h1 style="font-size:clamp(28px,3vw,42px);margin-top:10px">Обучение и аттестация</h1>
        <div class="muted" style="margin-top:8px">Банк вопросов продвинутой сертификации, ключ и пояснения методиста.</div></div>
      <div class="btn-row"><button class="btn btn-sm" data-act="academy-key">Выгрузить ключ</button></div>
    </div>

    <div class="err" style="margin-bottom:24px"><b>Закрытые данные.</b> Вопросы, верные ответы и пояснения не передаются специалистам, не публикуются в соцсетях и не выкладываются в рабочие чаты. Публикация вопросов теста влечёт аннулирование сертификата участника. Специалист видит пояснения только в разборе после успешной попытки.</div>

    ${CSV_VIEW && CSV_VIEW.orderId === "academy" ? `
      <div class="panel" style="margin-bottom:24px">
        <div class="between" style="align-items:center">
          <div class="eyebrow eyebrow-accent">Ключ к тесту, формат CSV</div>
          <button class="btn-link" data-act="csv-close">Закрыть</button>
        </div>
        <textarea class="textarea" id="csv-text" readonly style="margin-top:14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;min-height:160px">${esc(CSV_VIEW.text)}</textarea>
        <div class="btn-row" style="margin-top:14px">
          <button class="btn btn-sm" data-act="csv-copy">Скопировать</button>
          ${CAN_DOWNLOAD ? '<button class="btn btn-sm btn-quiet" data-act="csv-download">Скачать файл</button>' : ""}
        </div>
        <p class="small faint" style="margin:14px 0 0">Файл для внутренней работы методиста. Хранить в закрытом диске компании, не пересылать специалистам.</p>
      </div>` : ""}

    <div class="kpi">
      <div><div class="eyebrow">Базовая сертификация</div><div class="kpi-n mono-num" style="margin-top:10px">${base.length}</div><div class="small muted">из ${specialists.length} ${plural(specialists.length, "допущенного", "допущенных", "допущенных")}</div></div>
      <div class="tile-cool"><div class="eyebrow">Advanced Specialist</div><div class="kpi-n mono-num" style="margin-top:10px">${adv.length}</div><div class="small">сертификатов выдано</div></div>
      <div class="${inProgress.length ? "tile-warm" : ""}"><div class="eyebrow">В процессе</div><div class="kpi-n mono-num" style="margin-top:10px">${inProgress.length}</div><div class="small muted">изучают модули или ждут попытку</div></div>
    </div>

    <div class="grid cols-3" style="margin-top:24px">
      <div class="cell"><div class="eyebrow">Попыток аттестации</div><div class="kpi-n mono-num" style="margin-top:10px">${attempts.length}</div><div class="small muted">${passedAttempts} ${plural(passedAttempts, "успешная", "успешные", "успешных")}</div></div>
      <div class="cell"><div class="eyebrow">Средний балл</div><div class="kpi-n mono-num" style="margin-top:10px">${attempts.length ? avg + " %" : "нет данных"}</div><div class="small muted">проходной ${ADVANCED.passScore} %</div></div>
      <div class="cell"><div class="eyebrow">Банк вопросов</div><div class="kpi-n mono-num" style="margin-top:10px">${ADV_QUIZ.length}</div><div class="small muted">${ADV_QUIZ.filter((q) => q.kase).length} клинических кейса, пересмотр раз в полгода</div></div>
    </div>

    <h2 style="margin:36px 0 18px;font-size:clamp(24px,2.4vw,32px)">Результаты по модулям</h2>
    <div class="clin-chart">
      <div class="eyebrow" style="margin-bottom:20px">Доля верных ответов по всем попыткам</div>
      ${byModule.map((x) => `<div class="bar-row ${x.pct !== null && x.pct < 70 ? "on" : ""}">
        <div class="bar-label">${x.m.n}. ${esc(x.m.title)}</div>
        <div class="bar-track"><i class="bar-fill" style="width:${x.pct === null ? 0 : x.pct}%"></i></div>
        <div class="bar-val">${x.pct === null ? "нет данных" : x.pct + " %"}</div>
      </div>`).join("")}
      <p class="small faint" style="margin:18px 0 0">Модуль с долей ниже 70 % выделен: материал стоит переработать или усилить презентацией.</p>
    </div>

    ${attempts.length ? `
      <h2 style="margin:36px 0 18px;font-size:clamp(24px,2.4vw,32px)">Последние попытки</h2>
      <div class="card"><div class="table-wrap"><table class="data"><thead><tr>
        <th>Специалист</th><th>Дата</th><th>Результат</th><th>Время</th><th>Итог</th>
      </tr></thead><tbody>
        ${attempts.slice(0, 12).map((r) => `<tr>
          <td>${esc(r.user.fullName)}<div class="xs faint">${esc(r.user.city || "")}</div></td>
          <td class="muted">${fmtDateTime(r.at.at)}</td>
          <td><b>${r.at.right} из ${ADVANCED.questions}</b><div class="xs faint">${r.at.score} %</div></td>
          <td class="muted">${r.at.minutes} ${plural(r.at.minutes, "минута", "минуты", "минут")}${r.at.auto ? ", время вышло" : ""}</td>
          <td><span class="badge ${r.at.passed ? "badge-sage" : "badge-accent"}">${r.at.passed ? "Сдано" : "Не сдано"}</span></td>
        </tr>`).join("")}
      </tbody></table></div></div>` : ""}

    <h2 style="margin:36px 0 10px;font-size:clamp(24px,2.4vw,32px)">Банк вопросов и ключ</h2>
    <p class="small muted" style="margin:0 0 20px">Верный ответ выделен, под ним пояснение методиста. Вопросы с долей верных ответов ниже 30 % пересматриваются по регламенту.</p>
    <div class="stack" style="gap:12px">
      ${ADVANCED.modules.map((m, mi) => {
        const items = ADV_QUIZ.map((q, i) => ({ q, i })).filter((x) => x.q.m === mi);
        return `<details class="lesson">
          <summary>${m.n}. ${esc(m.title)}<span class="xs faint">${items.length} ${plural(items.length, "вопрос", "вопроса", "вопросов")}</span></summary>
          <div class="lesson-body" style="padding:0">
            ${items.map((x) => {
              const st = advQuestionStat(x.i);
              /* Пересмотр по доле верных ответов имеет смысл на выборке от пяти попыток */
              const low = st && st.total >= 5 && st.pct < 30;
              return `<div class="key-q ${low ? "key-low" : ""}">
                <div class="key-n mono-num">${String(x.i + 1).padStart(2, "0")}</div>
                <div>
                  ${x.q.kase ? '<span class="badge badge-accent" style="margin-bottom:10px">Клинический кейс</span>' : ""}
                  <b class="key-text">${esc(x.q.q)}</b>
                  <ol class="key-opts">
                    ${x.q.o.map((o, oi) => `<li class="${oi === x.q.a ? "on" : ""}"><i>${advLetter(oi)}</i><span>${esc(o)}</span>${oi === x.q.a ? '<em>верно</em>' : ""}</li>`).join("")}
                  </ol>
                  <div class="key-why"><b>Пояснение.</b> ${esc(x.q.why)}</div>
                  <div class="key-stat">${st
                    ? `Верных ответов ${st.pct} %, ${st.right} из ${st.total} ${plural(st.total, "попытки", "попыток", "попыток")}${low ? ". Ниже 30 %, вопрос на пересмотр" : st.total < 5 ? ". Выборка меньше пяти попыток, для пересмотра мало данных" : ""}`
                    : "Статистики пока нет: попыток не было"}</div>
                </div>
              </div>`;
            }).join("")}
          </div>
        </details>`;
      }).join("")}
    </div>

    <h2 style="margin:36px 0 18px;font-size:clamp(24px,2.4vw,32px)">Материалы программы</h2>
    <div class="card"><div class="table-wrap"><table class="data"><thead><tr>
      <th>Модуль</th><th>Уроки</th><th>Вопросов</th><th>Презентация</th>
    </tr></thead><tbody>
      ${ADVANCED.modules.map((m) => { const d = presentation(m.deck); return `<tr>
        <td><b>${m.n}. ${esc(m.title)}</b></td>
        <td class="muted">${m.lessons.length}, ${esc(m.minutes)}</td>
        <td class="mono-num">${m.qn}</td>
        <td>${d ? `<a href="#/education/deck/${d.id}" style="text-decoration:underline">${esc(d.title)}</a>` : '<span class="faint">нужно подготовить</span>'}</td>
      </tr>`; }).join("")}
    </tbody></table></div></div>

    <div class="frame-accent" style="margin-top:24px"><b>Регламент.</b> Банк вопросов обновляется раз в полгода. При каждой попытке порядок вопросов и вариантов перемешивается. Проходной балл ${ADVANCED.passScore} %, это ${ADVANCED.passRight} ответа из ${ADVANCED.questions}. Две попытки, вторая через ${ADVANCED.retryDays} дней, третья по отдельной оплате после повторного просмотра модулей. Полный регламент на <a href="#/education/advanced" style="text-decoration:underline">странице программы</a>.</div>`;
}

function admSettings() {
  const rows = [
    ["Скидка за 1 единицу", SETTINGS.tierBasePct + " %"],
    [`Скидка от ${SETTINGS.tierThreeUnitsMin} единиц`, SETTINGS.tierThreeUnitsPct + " %"],
    [`Скидка от ${SETTINGS.tierFullLineMin} единиц`, SETTINGS.tierFullLinePct + " %"],
    ["Начисление баллов", SETTINGS.pointsEarnPct + " % от оплаченного заказа"],
    ["Оплата баллами", "до " + SETTINGS.pointsRedeemMaxPct + " % заказа"],
    ["Срок жизни баллов", SETTINGS.pointsExpiryMonths + " месяцев"],
    ["Бонус за допуск", num(SETTINGS.verificationBonus) + " баллов"],
    ["Бонус за первый заказ", num(SETTINGS.firstOrderBonus) + " баллов"],
    ["Бесплатная доставка", "от " + money(SETTINGS.freeShippingFrom)],
    ["Стоимость доставки", money(SETTINGS.shippingCost)],
    ["Материалы в подарок", "от " + money(SETTINGS.materialsGiftFrom) + ", " + SETTINGS.materialsGiftText],
    ["Переподтверждение статуса", "раз в " + SETTINGS.reverifyMonths + " месяцев"],
    ["Автодопуск самозанятых", "включён"],
    ["Хранение сканов", "удаляются после решения"],
    ["Менеджер", SETTINGS.managerPhone + ", " + SETTINGS.managerEmail],
    ["Продавец", SETTINGS.sellerName],
  ];
  return `
    <div class="acc-head"><div><h1 style="font-size:clamp(28px,3vw,42px)">Настройки</h1>
      <div class="muted" style="margin-top:8px">В демонстрации значения показаны только для чтения. В платформе каждый параметр меняется здесь и сразу влияет на расчёты.</div></div></div>
    <div class="card"><div class="table-wrap"><table class="data"><tbody>
      ${rows.map(([k, v]) => `<tr><td class="muted" style="width:46%">${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join("")}
    </tbody></table></div></div>`;
}
/* ---------- роутер ---------- */

function render() {
  const raw = (location.hash || "#/").replace(/^#/, "").split("?")[0];
  const parts = raw.split("/").filter(Boolean);
  const u = me();
  let html;

  if (u && u.status === "BLOCKED" && parts[0] !== "legal") {
    html = viewBlocked(u);
  } else {
    switch (parts[0]) {
      case undefined: html = viewHome(); break;
      case "catalog": html = parts[1] ? viewProduct(parts[1]) : viewCatalog(); break;
      case "pro": html = viewPro(); break;
      case "login": html = u ? viewAccount() : viewLogin(); break;
      case "register": html = viewRegister(); break;
      case "cart": html = viewCart(); break;
      case "checkout": html = viewCheckout(); break;
      case "account": html = viewAccount(parts[1], parts[2]); break;
      case "education": html = viewEducation(parts[1], parts[2]); break;
      case "research": html = viewResearch(); break;
      case "specialists": html = viewSpecialists(); break;
      case "webinars": html = viewWebinars(); break;
      case "legal": html = viewLegal(parts[1]); break;
      case "admin": html = viewAdmin(parts[1], parts[2]); break;
      default: html = viewHome();
    }
  }

  const chrome = header();
  const cut = chrome.indexOf('<header class="site-header');
  document.getElementById("shell").innerHTML = chrome.slice(0, cut);
  document.getElementById("nav").innerHTML = chrome.slice(cut);
  app().innerHTML = html;
  document.getElementById("foot").innerHTML = footer();
  if (KEEP_Y === null) window.scrollTo({ top: 0 });
  KEEP_Y = null;
  initCounters();
  initAdvTimer();
}

/* Если действие не меняет страницу, прокрутка остаётся на месте. */
let KEEP_Y = null;
function keepScroll() {
  KEEP_Y = window.scrollY;
}

/* Таймер попытки. Пересоздаётся после каждой перерисовки. */
function initAdvTimer() {
  if (ADV_TIMER) { clearInterval(ADV_TIMER); ADV_TIMER = null; }
  const el = document.getElementById("adv-clock");
  if (!el || !ADV || !ADV.endsAt) return;
  const tick = () => {
    const left = Math.max(0, ADV.endsAt - Date.now());
    const m = Math.floor(left / 60000);
    const sec = Math.floor((left % 60000) / 1000);
    el.textContent = `${m}:${String(sec).padStart(2, "0")}`;
    if (left < 5 * 60000) el.classList.add("low");
    if (left <= 0) { clearInterval(ADV_TIMER); ADV_TIMER = null; advFinish(true); }
  };
  tick();
  ADV_TIMER = setInterval(tick, 1000);
}

/* Порядок вопросов и вариантов перемешивается при каждой попытке. */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function advStart(u) {
  const order = ADVANCED.modules.map((m, mi) => {
    const idx = ADV_QUIZ.map((q, i) => (q.m === mi ? i : -1)).filter((i) => i >= 0);
    return shuffle(idx).map((qi) => ({ qi, opts: shuffle(ADV_QUIZ[qi].o.map((o, i) => i)) }));
  });
  ADV = { startedAt: Date.now(), endsAt: Date.now() + ADVANCED.minutes * 60000, step: 0, answers: {}, confirm: false, order };
}

function advFinish(auto) {
  const u = me();
  if (!u || !ADV) return;
  const byModule = ADVANCED.modules.map((m, mi) => {
    const qs = ADV_QUIZ.map((q, i) => ({ q, i })).filter((x) => x.q.m === mi);
    return { right: qs.filter((x) => ADV.answers[x.i] === x.q.a).length, total: qs.length };
  });
  const wrong = ADV_QUIZ.map((q, i) => (ADV.answers[i] === q.a ? -1 : i)).filter((i) => i >= 0);
  const right = byModule.reduce((n, x) => n + x.right, 0);
  const score = Math.round((right / ADV_QUIZ.length) * 100);
  const passed = right >= ADVANCED.passRight;
  const st = advState(u);
  st.attempts.push({
    at: nowIso(),
    right,
    score,
    passed,
    auto: !!auto,
    minutes: Math.max(1, Math.round((Date.now() - ADV.startedAt) / 60000)),
    byModule,
    wrong,
  });
  if (passed) {
    st.passedAt = nowIso();
    st.certCode = st.certCode || advCode();
    st.validUntil = addMonths(new Date(), ADVANCED.cert.validMonths);
  }
  save();
  ADV = null;
  if (ADV_TIMER) { clearInterval(ADV_TIMER); ADV_TIMER = null; }
  go("#/education/advanced/result"); render();
  toast(passed
    ? `Аттестация пройдена, ${right} из ${ADV_QUIZ.length}`
    : `Результат ${right} из ${ADV_QUIZ.length}, нужно ${ADVANCED.passRight}`);
}

/* ---------- действия ---------- */

function val(id) {
  const e = document.getElementById(id);
  return e ? e.value.trim() : "";
}

function addToCart(sku, qty) {
  const u = me();
  if (!u) return go("#/login");
  if (!isApproved(u)) { toast("Покупка открывается после допуска"); return go("#/account/verification"); }
  u.cart = u.cart || {};
  u.cart[sku] = (u.cart[sku] || 0) + (qty || 1);
  save();
  toast(`${bySku(sku).name} в корзине`);
  render();
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-act]");
  if (!t) return;
  const a = t.dataset.act;
  const u = me();

  if (a === "burger") { document.getElementById("drawer").classList.toggle("open"); return; }
  if (a === "reset") { ASK_RESET = true; render(); return; }
  if (a === "reset-no") { ASK_RESET = false; render(); return; }
  if (a === "reset-yes") { ASK_RESET = false; resetDemo(); go("#/"); render(); toast("Стенд сброшен в исходное состояние"); return; }
  if (a === "logout") { STATE.session = null; save(); go("#/"); render(); return; }
  if (a === "demo-admin") { const ad = STATE.users.find((x) => x.role === "ADMIN"); STATE.session = ad.id; save(); go("#/admin"); render(); toast("Вход как администратор"); return; }
  if (a === "demo-specialist") {
    const sp = STATE.users.find((x) => x.phone === "+79261234567") || STATE.users.find((x) => x.role === "USER" && x.status === "APPROVED");
    if (!sp) { toast("Профиль специалиста не найден, сбросьте стенд"); return; }
    STATE.session = sp.id;
    save(); go("#/account"); render();
    toast("Вход как специалист с подтверждённым допуском");
    return;
  }
  if (a === "brand-tab") { TAB.brand = Number(t.dataset.i); render(); return; }
  if (a === "upload-del") { UPLOAD.splice(Number(t.dataset.i), 1); render(); return; }
  if (a === "scroll-clinical") {
    const el = document.getElementById("clinical");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (a === "add") { addToCart(t.dataset.sku, 1); return; }
  if (a === "qty") {
    const d = Number(t.dataset.d), sku = t.dataset.sku;
    if (d === 0) delete u.cart[sku];
    else { u.cart[sku] = Math.max(0, (u.cart[sku] || 0) + d); if (!u.cart[sku]) delete u.cart[sku]; }
    save(); render(); return;
  }
  if (a === "fill-tier") {
    /* Добираем до порога максимального уровня: сначала продукты, которых ещё нет
       в заказе, по возрастанию цены, затем добавляем единицы к первой строке. */
    let left = SETTINGS.tierFullLineMin - cartUnits(u);
    const rest = CATALOG.filter((x) => !u.cart[x.sku]).sort((a2, b2) => a2.rrp - b2.rrp);
    for (const x of rest) {
      if (left <= 0) break;
      u.cart[x.sku] = (u.cart[x.sku] || 0) + 1;
      left -= 1;
    }
    if (left > 0) {
      const first = cartItems(u)[0];
      if (first) u.cart[first.sku] += left;
    }
    save();
    toast(`В заказе ${cartUnits(u)} единиц, уровень ${SETTINGS.tierFullLinePct} %`);
    render();
    return;
  }

  if (a === "review") {
    const text = val("rv-text");
    if (text.length < 10) { toast("Напишите подробнее, от 10 знаков"); return; }
    addReview(u, t.dataset.sku, text, Number(val("rv-rating") || 5));
    toast("Отзыв отправлен на модерацию"); render(); return;
  }

  /* вход */
  if (a === "login-send") {
    const s = window.__login;
    const phone = normPhone(val("lg-phone"));
    if (!phone) { s.error = "Проверьте номер телефона."; render(); return; }
    const exists = STATE.users.find((x) => x.phone === phone);
    if (!exists) { s.error = "Аккаунт с таким номером не найден. Подайте заявку на допуск."; s.phone = val("lg-phone"); render(); return; }
    s.phone = phone; s.sent = sendOtp(phone); s.step = 2; s.error = ""; render(); return;
  }
  if (a === "login-back") { window.__login = { step: 1, phone: "", error: "" }; render(); return; }
  if (a === "login-check") {
    const s = window.__login;
    const r = checkOtp(s.phone, val("lg-code"));
    if (!r.ok) { s.error = r.error; render(); return; }
    const user = STATE.users.find((x) => x.phone === s.phone);
    STATE.session = user.id; save();
    window.__login = { step: 1, phone: "", error: "" };
    go(isStaff(user) ? "#/admin" : "#/account"); render(); toast("Вы вошли"); return;
  }

  /* регистрация */
  if (a === "reg-send") {
    const r = regInit();
    const phone = normPhone(val("rg-phone"));
    if (!phone) { r.error = "Проверьте номер телефона."; render(); return; }
    if (STATE.users.find((x) => x.phone === phone)) { r.error = "Такой номер уже зарегистрирован. Войдите в кабинет."; render(); return; }
    r.phone = phone; r.sent = sendOtp(phone); r.step = 1.5; r.error = ""; render(); return;
  }
  if (a === "reg-check") {
    const r = regInit();
    const c = checkOtp(r.phone, val("rg-code"));
    if (!c.ok) { r.error = c.error; render(); return; }
    r.step = 2; r.error = ""; render(); return;
  }
  if (a === "reg-back") { regInit().step = Number(t.dataset.to); REG.error = ""; render(); return; }
  if (a === "reg-profile") {
    const r = regInit();
    r.profile = { fullName: val("rg-name"), city: val("rg-city"), specialization: val("rg-spec"), workFormat: val("rg-format"), telegram: val("rg-tg"), email: val("rg-email") };
    if (r.profile.fullName.split(" ").filter(Boolean).length < 2) { r.error = "Укажите фамилию и имя как в документах."; render(); return; }
    if (!r.profile.city) { r.error = "Укажите город."; render(); return; }
    r.step = 3; r.error = ""; render(); return;
  }
  if (a === "reg-consents") {
    const r = regInit();
    if (CONSENTS.some((c) => !r.consents[c.id])) { r.error = "Все четыре подтверждения обязательны."; render(); return; }
    r.step = 4; r.error = ""; render(); return;
  }
  if (a === "reg-submit") {
    const r = regInit();
    const m = VERIFY_METHODS.find((x) => x.id === r.method);
    const data = {};
    let missing = false;
    m.fields.forEach((f) => {
      const v = f.upload ? UPLOAD.map((x) => x.name).join(", ") : val("vf-" + f.name);
      if (!v) missing = true;
      data[f.name] = v;
    });
    if (missing) { r.error = m.fields.some((f) => f.upload) && !UPLOAD.length ? "Приложите изображение или скан документа." : "Заполните все поля выбранного способа."; render(); return; }
    const auto = autoCheck(r.method, data);
    const user = {
      id: uid(), phone: r.phone, fullName: r.profile.fullName, city: r.profile.city,
      specialization: r.profile.specialization, workFormat: r.profile.workFormat,
      telegram: r.profile.telegram, email: r.profile.email,
      role: "USER", status: "PENDING", tier: r.method === "WORKPLACE" ? "CLINIC" : "SPECIALIST",
      createdAt: nowIso(), cart: {}, points: [], kits: [], education: null,
      consents: CONSENTS.map((c) => ({ id: c.id, at: nowIso(), ip: "203.0.113." + (10 + Math.floor(Math.random() * 80)) })),
      verification: { method: r.method, data, submittedAt: nowIso(), autoResult: auto.text },
    };
    STATE.users.push(user);
    STATE.session = user.id;
    if (auto.approved) approveUser(user, user.tier);
    save();
    REG = null;
    UPLOAD = [];
    go("#/account/verification"); render();
    toast(auto.approved ? "Допуск подтверждён автоматически" : "Заявка отправлена менеджеру");
    return;
  }
  if (a === "resubmit") {
    const method = (REG && REG.method) || "EDUCATION";
    const m = VERIFY_METHODS.find((x) => x.id === method);
    const data = {};
    let missing = false;
    m.fields.forEach((f) => {
      const v = f.upload ? UPLOAD.map((x) => x.name).join(", ") : val("vf-" + f.name);
      if (!v) missing = true;
      data[f.name] = v;
    });
    if (missing) { toast(m.fields.some((f) => f.upload) && !UPLOAD.length ? "Приложите изображение или скан документа" : "Заполните все поля способа"); return; }
    const auto = autoCheck(method, data);
    u.verification = { method, data, submittedAt: nowIso(), autoResult: auto.text };
    u.status = "PENDING";
    if (auto.approved) approveUser(u, method === "WORKPLACE" ? "CLINIC" : "SPECIALIST");
    REG = null;
    UPLOAD = [];
    save(); render();
    toast(auto.approved ? "Допуск подтверждён автоматически" : "Заявка отправлена менеджеру");
    return;
  }

  /* оформление */
  if (a === "order") {
    const delivery = { mode: CHECKOUT.mode || "COURIER", city: val("ck-city"), address: val("ck-address"), zip: val("ck-zip"), comment: val("ck-comment") };
    if (!delivery.city || !delivery.address) { toast("Укажите город и адрес доставки"); return; }
    const r = createOrder(u, delivery, CHECKOUT.pay || "ONLINE", CHECKOUT.points);
    if (!r.ok) { toast(r.error); return; }
    CHECKOUT = { points: 0 };
    go("#/account/orders/" + r.order.id); render();
    toast(`Заказ ${r.order.number} создан, ожидает оплаты`);
    return;
  }
  if (a === "repeat") {
    const o = STATE.orders.find((x) => x.id === t.dataset.id);
    o.items.forEach((i) => { u.cart[i.sku] = (u.cart[i.sku] || 0) + i.qty; });
    save(); go("#/cart"); render(); toast("Товары из заказа добавлены в корзину"); return;
  }

  /* наборы */
  if (a === "protocol-cart") {
    const pr = PROTOCOLS.find((x) => x.name === t.dataset.name);
    if (!pr) { toast("Протокол не найден"); return; }
    if (!isApproved(u)) { toast("Покупка открывается после допуска"); return; }
    Object.keys(pr.skus).forEach((s) => { u.cart[s] = (u.cart[s] || 0) + pr.skus[s]; });
    save(); go("#/cart"); render(); toast(`Набор «${pr.name}» в корзине`);
    return;
  }
  if (a === "kit-cart") { const pr = PROTOCOLS[Number(t.dataset.i)]; Object.keys(pr.skus).forEach((s) => { u.cart[s] = (u.cart[s] || 0) + pr.skus[s]; }); save(); go("#/cart"); render(); toast("Набор добавлен"); return; }
  if (a === "kit-save") { const pr = PROTOCOLS[Number(t.dataset.i)]; u.kits = u.kits || []; u.kits.push({ name: "Протокол «" + pr.name + "»", skus: pr.skus }); save(); render(); toast("Набор сохранён"); return; }
  if (a === "mykit-cart") { const k = u.kits[Number(t.dataset.i)]; Object.keys(k.skus).forEach((s) => { u.cart[s] = (u.cart[s] || 0) + k.skus[s]; }); save(); go("#/cart"); render(); return; }
  if (a === "mykit-del") { u.kits.splice(Number(t.dataset.i), 1); save(); render(); return; }

  /* обучение */
  if (a === "adv-start") {
    const g = advGate(u);
    if (!g.ok) { toast("Тест пока закрыт"); return; }
    advStart(u);
    render(); toast(`Попытка началась, на тест ${ADVANCED.minutes} минут`);
    return;
  }
  if (a === "adv-step") { if (!ADV) return; ADV.step = Number(t.dataset.i); ADV.confirm = false; render(); return; }
  if (a === "adv-next") { if (!ADV) return; ADV.step = Math.min(ADVANCED.modules.length - 1, ADV.step + 1); render(); return; }
  if (a === "adv-prev") { if (!ADV) return; ADV.step = Math.max(0, ADV.step - 1); render(); return; }
  if (a === "adv-finish") { if (!ADV) return; ADV.confirm = true; render(); return; }
  if (a === "adv-cancel-submit") { if (!ADV) return; ADV.confirm = false; render(); return; }
  if (a === "adv-submit") { advFinish(false); return; }
  if (a === "adv-skip-wait") {
    /* В демонстрации ожидание семи дней можно не выжидать. */
    const st = advState(u);
    if (st.attempts.length) {
      const d = new Date();
      d.setDate(d.getDate() - ADVANCED.retryDays - 1);
      st.attempts[st.attempts.length - 1].at = d.toISOString();
      save();
    }
    render(); toast("Вторая попытка открыта");
    return;
  }
  if (a === "quiz-submit") {
    if (!QUIZ || COURSE.quiz.some((q, i) => QUIZ[i] === undefined)) { toast("Ответьте на все вопросы"); return; }
    const right = COURSE.quiz.filter((q, i) => QUIZ[i] === q.correct).length;
    const score = Math.round((right / COURSE.quiz.length) * 100);
    if (score < COURSE.passScore) { toast(`Результат ${score} %. Нужно ${COURSE.passScore} %. Повторите уроки и попробуйте снова.`); return; }
    u.education = u.education || {};
    u.education.passedAt = nowIso();
    u.education.score = score;
    u.education.certCode = u.education.certCode || certCode();
    save(); QUIZ = null;
    go("#/education/certificate"); render();
    toast(`Тест сдан, результат ${score} %`);
    return;
  }
  if (a === "listing-save") {
    u.education.about = val("ed-about");
    save(); render(); toast("Размещение обновлено"); return;
  }
  if (a === "profile-save") {
    u.fullName = val("pf-name") || u.fullName;
    u.city = val("pf-city");
    u.specialization = val("pf-spec");
    u.workFormat = val("pf-format");
    u.telegram = val("pf-tg");
    u.email = val("pf-email");
    save(); render(); toast("Профиль сохранён"); return;
  }

  /* админка */
  if (a === "approve") { const x = STATE.users.find((y) => y.id === t.dataset.id); approveUser(x, t.dataset.tier); audit("Допуск одобрен", x.fullName); save(); render(); toast("Допуск выдан, бонусные баллы начислены"); return; }
  if (a === "reject") { const x = STATE.users.find((y) => y.id === t.dataset.id); rejectUser(x, val("rj-" + x.id)); audit("Отказ в допуске", x.fullName); save(); render(); toast("Отказано, сканы удалены"); return; }
  if (a === "block") { ASK_BLOCK = t.dataset.id; render(); return; }
  if (a === "block-no") { ASK_BLOCK = null; render(); return; }
  if (a === "block-yes") {
    const x = STATE.users.find((y) => y.id === t.dataset.id);
    blockUser(x, val("bl-" + x.id) || "Нарушение пункта 4 Условий программы PRO");
    audit("Блокировка", x.fullName);
    ASK_BLOCK = null;
    save(); render(); toast("Аккаунт заблокирован, баллы списаны");
    return;
  }
  if (a === "unblock") { const x = STATE.users.find((y) => y.id === t.dataset.id); x.status = x.verifiedAt ? "APPROVED" : "UNVERIFIED"; x.blockedReason = null; audit("Разблокировка", x.fullName); save(); render(); return; }
  if (a === "ostatus") { const o = STATE.orders.find((x) => x.id === t.dataset.id); setOrderStatus(o, t.dataset.s); render(); toast("Статус обновлён"); return; }
  if (a === "save-codes") {
    const o = STATE.orders.find((x) => x.id === t.dataset.id);
    o.marking = {};
    o.items.forEach((i) => { const v = val("mk-" + i.sku); if (v) o.marking[i.sku] = v.split(",").map((s) => s.trim()).filter(Boolean); });
    audit("Коды маркировки", o.number); save(); render(); toast("Коды сохранены"); return;
  }
  if (a === "csv") {
    const o = STATE.orders.find((x) => x.id === t.dataset.id);
    const rows = [["order", "sku", "product", "code"]];
    o.items.forEach((i) => (o.marking[i.sku] || []).forEach((c) => rows.push([o.number, i.sku, bySku(i.sku).name, c])));
    if (rows.length === 1) { toast("Сначала заполните коды маркировки и сохраните их"); return; }
    CSV_VIEW = { orderId: o.id, text: rows.map((r) => r.join(";")).join("\n") };
    render();
    return;
  }
  if (a === "academy-key") {
    const rows = [["n", "module", "question", "answer", "explanation"]];
    ADV_QUIZ.forEach((q, i) => rows.push([
      String(i + 1),
      ADVANCED.modules[q.m].n + ". " + ADVANCED.modules[q.m].title,
      q.q.replace(/[;\n]/g, " "),
      advLetter(q.a) + ". " + q.o[q.a].replace(/[;\n]/g, " "),
      q.why.replace(/[;\n]/g, " "),
    ]));
    CSV_VIEW = { orderId: "academy", name: "byrain-advanced-test-key.csv", text: rows.map((r) => r.join(";")).join("\n") };
    audit("Выгрузка ключа к тесту", `${ADV_QUIZ.length} вопросов`);
    save(); render();
    return;
  }
  if (a === "csv-close") { CSV_VIEW = null; render(); return; }
  if (a === "csv-download") {
    const url = URL.createObjectURL(new Blob(["﻿" + CSV_VIEW.text], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = CSV_VIEW.name || "marking-codes.csv";
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  if (a === "csv-copy") {
    const box = document.getElementById("csv-text");
    const done = () => toast(CSV_VIEW.name ? "Выгрузка скопирована" : "Коды скопированы, можно вставить в кассовую программу");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(CSV_VIEW.text).then(done, () => { box.select(); toast("Текст выделен, скопируйте его сочетанием клавиш"); });
    } else {
      box.select();
      toast("Текст выделен, скопируйте его сочетанием клавиш");
    }
    return;
  }
  if (a === "print") { window.print(); return; }
  if (a === "rv-pub") { const r = STATE.reviews.find((x) => x.id === t.dataset.id); r.status = "PUBLISHED"; audit("Отзыв опубликован", r.author); save(); render(); return; }
  if (a === "rv-del") { STATE.reviews = STATE.reviews.filter((x) => x.id !== t.dataset.id); save(); render(); return; }
  if (a === "sync") {
    toast("Синхронизация с byrain.ru: 8 продуктов проверено, РРЦ и изображения совпадают");
    audit("Синхронизация каталога", "Medusa byrain.ru, 8 продуктов");
    save(); return;
  }
});

document.addEventListener("change", (e) => {
  const t = e.target.closest("[data-act]");
  if (!t) return;
  const a = t.dataset.act;
  const u = me();
  if (a === "consent") {
    regInit().consents[t.dataset.id] = t.checked;
    const lab = t.closest("label");
    if (lab) lab.classList.toggle("sel", t.checked);
    if (REG.error) { REG.error = ""; }
    return;
  }
  if (a === "method") { regInit().method = t.dataset.id; REG.data = {}; UPLOAD = []; render(); return; }
  if (a === "upload") { acceptFiles(t.files); t.value = ""; return; }
  if (a === "dmode") { CHECKOUT.mode = t.dataset.v; render(); return; }
  if (a === "pmode") { CHECKOUT.pay = t.dataset.v; render(); return; }
  if (a === "adv-ans") {
    if (!ADV) return;
    const qi = Number(t.dataset.q);
    ADV.answers[qi] = Number(t.dataset.o);
    const block = t.closest(".q-block");
    if (block) block.querySelectorAll("label").forEach((l) => l.classList.toggle("sel", !!l.querySelector("input:checked")));
    const answered = Object.keys(ADV.answers).length;
    const cnt = document.getElementById("adv-count");
    if (cnt) cnt.textContent = `${answered} из ${ADVANCED.questions}`;
    const bar = document.getElementById("adv-progress");
    if (bar) bar.style.width = Math.round((answered / ADVANCED.questions) * 100) + "%";
    return;
  }
  if (a === "adv-read") {
    const m = ADVANCED.modules[Number(t.dataset.m)];
    const st = advState(u);
    st.modules[m.key] = t.checked;
    save(); keepScroll(); render();
    if (advAllRead(u) && !st.passedAt) toast("Все модули отмечены, итоговый тест открыт");
    return;
  }
  if (a === "quiz") {
    QUIZ = QUIZ || {};
    QUIZ[Number(t.dataset.q)] = Number(t.dataset.o);
    const group = t.closest(".radio-row");
    if (group) group.querySelectorAll("label").forEach((l) => l.classList.toggle("sel", !!l.querySelector("input:checked")));
    return;
  }
  if (a === "points") { CHECKOUT.points = Number(t.value); render(); return; }
  if (a === "listed") { u.education.listed = t.checked; save(); render(); return; }
});

document.addEventListener("input", (e) => {
  const t = e.target.closest("[data-act='points']");
  if (!t) return;
  CHECKOUT.points = Number(t.value);
  const u = me();
  const q = quote(cartItems(u), pointsBalance(u), CHECKOUT.points);
  const box = t.parentElement.querySelector("b");
  if (box) box.textContent = "минус " + money(q.pointsUsed);
});

window.addEventListener("hashchange", render);
render();

/* Перетаскивание файлов в зону загрузки */
document.addEventListener("dragover", (e) => {
  const z = e.target.closest && e.target.closest(".dropzone");
  if (!z) return;
  e.preventDefault();
  z.classList.add("over");
});
document.addEventListener("dragleave", (e) => {
  const z = e.target.closest && e.target.closest(".dropzone");
  if (z) z.classList.remove("over");
});
document.addEventListener("drop", (e) => {
  const z = e.target.closest && e.target.closest(".dropzone");
  if (!z) return;
  e.preventDefault();
  z.classList.remove("over");
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) acceptFiles(e.dataTransfer.files);
});
