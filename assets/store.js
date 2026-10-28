/* Состояние демо-платформы: пользователи, допуск, корзина, заказы, баллы, обучение.
   Всё хранится в localStorage браузера, сервера нет. Логика цен и баллов повторяет
   src/lib/pricing.ts и src/lib/points.ts платформы. */

const KEY = "byrain-pro-demo-v5";

function money(n) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n)) + " ₽";
}
function num(n) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n));
}
/* Склонение существительного при числе: 1 код, 2 кода, 5 кодов. */
function plural(n, one, few, many) {
  const m10 = Math.abs(n) % 10;
  const m100 = Math.abs(n) % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function nowIso() {
  return new Date().toISOString();
}
function addMonths(d, m) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x.toISOString();
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(11, 20, 0, 0);
  return d.toISOString();
}
function fmtDate(iso) {
  if (!iso) return "";
  /* Локаль добавляет «г.» в конце, из-за чего в тексте появлялись две точки
     подряд: «выдан 18 сентября 2026 г..». Сокращение убираем. */
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" }).replace(/\s*г\.$/, "");
}
function fmtDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function bySku(sku) {
  return CATALOG.find((p) => p.sku === sku);
}
function bySlug(slug) {
  return CATALOG.find((p) => p.slug === slug);
}

/* ---------- state ---------- */

function freshState() {
  const admin = {
    id: uid(),
    phone: "+79990000000",
    fullName: "Администратор BYRAIN",
    city: "Москва",
    specialization: "PURCHASER",
    workFormat: "CLINIC",
    role: "ADMIN",
    status: "APPROVED",
    tier: "CLINIC",
    createdAt: nowIso(),
    verifiedAt: nowIso(),
    reverifyDueAt: addMonths(new Date(), 12),
    cart: {},
    points: [],
    kits: [],
    consents: [],
    education: null,
    verification: null,
  };
  const st = {
    v: 5,
    session: null,
    users: [admin],
    orders: [],
    reviews: REVIEWS_SEED.map((r) => ({ ...r, id: uid(), status: "PUBLISHED", createdAt: nowIso() })),
    listings: SPECIALISTS_SEED.map((s) => ({ ...s, id: uid(), source: "seed" })),
    audit: [],
    otp: null,
  };
  seedDemoQueue(st);
  st.session = seedSpecialist(st);
  return st;
}

/* Готовый профиль специалиста с допуском: история заказов, баллы,
   сохранённый набор, сданный курс и размещение в публичном разделе.
   Стенд открывается сразу под ним. */
function seedSpecialist(st) {
  const u = {
    id: uid(),
    phone: "+79261234567",
    fullName: "Орлова Мария Викторовна",
    city: "Москва",
    specialization: "COSMETOLOGIST",
    workFormat: "PRIVATE",
    telegram: "@orlova.cosmo",
    email: "orlova@byrain.pro",
    role: "USER",
    status: "APPROVED",
    tier: "SPECIALIST",
    createdAt: daysAgo(64),
    verifiedAt: daysAgo(62),
    reverifyDueAt: addMonths(new Date(daysAgo(62)), SETTINGS.reverifyMonths),
    verificationBonusGiven: true,
    firstOrderBonusGiven: true,
    cart: {},
    consents: CONSENTS.map((c) => ({ id: c.id, at: daysAgo(64), ip: "95.24.118.7" })),
    verification: {
      method: "EDUCATION",
      data: {
        docType: "Диплом о профессиональной переподготовке",
        school: "Первый МГМУ имени И. М. Сеченова, кафедра дерматовенерологии и косметологии",
        year: "2017",
        files: "удалены после решения",
      },
      submittedAt: daysAgo(64),
      decidedAt: daysAgo(62),
      autoResult: "Серия и номер документа сверены в ФРДО, данные совпадают с ФИО аккаунта",
    },
    kits: [
      { name: "Протокол «Мгновенное преображение»", skus: { "A190525-10": 1, "A190525-7": 1, "A190525-12": 1 } },
    ],
    education: {
      passedAt: daysAgo(40),
      score: 100,
      certCode: "BYR-2026-104377",
      advanced: {
        modules: { skin: true, peptides: true },
        attempts: [],
      },
      listed: true,
      about: "Пептидные протоколы на линейке BYRAIN, работа с мимическими морщинами и плотностью кожи. Частный кабинет в центре Москвы, приём по записи.",
    },
    points: [
      { id: uid(), type: "VERIFICATION_BONUS", delta: SETTINGS.verificationBonus, createdAt: daysAgo(62), expiresAt: addMonths(new Date(daysAgo(62)), SETTINGS.pointsExpiryMonths) },
      { id: uid(), type: "ORDER_EARN", delta: 4150, createdAt: daysAgo(62), expiresAt: addMonths(new Date(daysAgo(62)), SETTINGS.pointsExpiryMonths) },
      { id: uid(), type: "FIRST_ORDER_BONUS", delta: SETTINGS.firstOrderBonus, createdAt: daysAgo(62), expiresAt: addMonths(new Date(daysAgo(62)), SETTINGS.pointsExpiryMonths) },
      { id: uid(), type: "ORDER_REDEEM", delta: -3000, createdAt: daysAgo(24), expiresAt: null },
      { id: uid(), type: "ORDER_EARN", delta: 2280, createdAt: daysAgo(24), expiresAt: addMonths(new Date(daysAgo(24)), SETTINGS.pointsExpiryMonths) },
    ],
  };
  st.users.push(u);

  const place = { mode: "COURIER", city: "Москва", address: "улица Малая Бронная, 12, кабинет 4", zip: "123022", comment: "Удобно после 15:00" };

  // Первый заказ: вся линейка, уровень 50 %
  pushOrder(st, u, CATALOG.map((p) => ({ sku: p.sku, qty: 1 })), {
    status: "DELIVERED", payment: "ONLINE", createdAt: daysAgo(62), pointsUsed: 0, delivery: place,
    marking: { "A190525-10": ["0104607001234567215aQw1x"] },
  });

  // Повторный заказ по протоколу, часть оплачена баллами
  pushOrder(st, u, [{ sku: "A190525-10", qty: 2 }, { sku: "A190525-12", qty: 1 }], {
    status: "PAID", payment: "ONLINE", createdAt: daysAgo(24), pointsUsed: 3000, delivery: place, marking: {},
  });

  // Текущий заказ, ждёт оплаты
  pushOrder(st, u, [{ sku: "A190525-3", qty: 1 }], {
    status: "AWAITING_PAYMENT", payment: "INVOICE", createdAt: daysAgo(1), pointsUsed: 0, delivery: place, marking: {},
  });

  st.reviews.unshift({
    id: uid(), sku: "A190525-7", author: u.fullName, city: u.city, rating: 5,
    text: "Беру комплектом с пептидным кремом для лица. Клиентки отмечают, что веки выглядят свежее уже к третьей процедуре, отёчность уходит.",
    status: "PUBLISHED", createdAt: daysAgo(30), userId: u.id,
  });

  return u.id;
}

/* Заказ из состава корзины, с готовыми суммами и статусом. */
function pushOrder(st, user, items, opts) {
  const q = quote(items, 999999, opts.pointsUsed || 0);
  st.orders.push({
    id: uid(),
    number: orderNumber(st, opts.createdAt),
    userId: user.id,
    items: q.lines.map((l) => ({ sku: l.sku, qty: l.qty, rrp: l.rrp, pct: l.pct, unitPrice: l.unitPrice })),
    subtotalRrp: q.subtotalRrp, discountAmount: q.discountAmount, discountPct: q.discountPct,
    afterDiscount: q.afterDiscount, pointsUsed: q.pointsUsed, shippingCost: q.shippingCost,
    total: q.total, pointsToEarn: q.pointsToEarn, giftMaterials: q.giftMaterials,
    status: opts.status, payment: opts.payment, createdAt: opts.createdAt,
    delivery: opts.delivery, marking: opts.marking || {},
  });
}

/* Заявки и заказы для демонстрации админки */
function seedDemoQueue(st) {
  const u1 = {
    id: uid(), phone: "+79031112233", fullName: "Громова Наталья Сергеевна", city: "Москва",
    specialization: "COSMETOLOGIST", workFormat: "CLINIC", telegram: "@gromova_cosmo", email: "gromova@clinic.ru",
    role: "USER", status: "PENDING", tier: "SPECIALIST", createdAt: nowIso(), cart: {}, points: [], kits: [], education: null,
    consents: CONSENTS.map((c) => ({ id: c.id, at: nowIso(), ip: "95.108.213.4" })),
    verification: { method: "EDUCATION", data: { docType: "Диплом о профессиональной переподготовке", school: "РУДН, кафедра дерматовенерологии", year: "2018", files: "diplom-gromova.pdf, prilozhenie.jpg" }, submittedAt: nowIso(), autoResult: null },
  };
  const u2 = {
    id: uid(), phone: "+79165554433", fullName: "Исаев Руслан Маратович", city: "Казань",
    specialization: "DERMATOLOGIST", workFormat: "PRIVATE", telegram: "@isaev.derm", email: "isaev@mail.ru",
    role: "USER", status: "PENDING", tier: "SPECIALIST", createdAt: nowIso(), cart: {}, points: [], kits: [], education: null,
    consents: CONSENTS.map((c) => ({ id: c.id, at: nowIso(), ip: "178.69.14.90" })),
    verification: { method: "PROFILE", data: { platform: "Яндекс Услуги", link: "https://yandex.ru/profile/isaev-derm" }, submittedAt: nowIso(), autoResult: null },
  };
  const u3 = {
    id: uid(), phone: "+78122223344", fullName: "Петрова Елена Андреевна", city: "Санкт-Петербург",
    specialization: "PURCHASER", workFormat: "CLINIC", telegram: "", email: "zakup@aestetica.spb.ru",
    role: "USER", status: "APPROVED", tier: "CLINIC", createdAt: nowIso(), verifiedAt: nowIso(), reverifyDueAt: addMonths(new Date(), 12),
    cart: {}, points: [{ id: uid(), type: "VERIFICATION_BONUS", delta: SETTINGS.verificationBonus, createdAt: nowIso(), expiresAt: addMonths(new Date(), SETTINGS.pointsExpiryMonths) }],
    kits: [], education: null, consents: CONSENTS.map((c) => ({ id: c.id, at: nowIso(), ip: "77.234.1.12" })),
    verification: { method: "WORKPLACE", data: { clinic: "ООО Эстетика", inn: "7801234567", position: "Главный врач", email: "zakup@aestetica.spb.ru" }, submittedAt: nowIso(), autoResult: "Лицензия клиники проверена в реестре Росздравнадзора, подтверждение получено с корпоративной почты", decidedAt: nowIso() },
  };
  st.users.push(u1, u2, u3);

  const items = [
    { sku: "A190525-10", qty: 2 },
    { sku: "A190525-12", qty: 1 },
    { sku: "A190525-7", qty: 1 },
  ];
  const q = quote(items, 0, 0);
  st.orders.push({
    id: uid(),
    number: orderNumber(st),
    userId: u3.id,
    items: q.lines.map((l) => ({ sku: l.sku, qty: l.qty, rrp: l.rrp, pct: l.pct, unitPrice: l.unitPrice })),
    subtotalRrp: q.subtotalRrp, discountAmount: q.discountAmount, discountPct: q.discountPct,
    afterDiscount: q.afterDiscount, pointsUsed: 0, shippingCost: q.shippingCost, total: q.total,
    pointsToEarn: q.pointsToEarn, giftMaterials: q.giftMaterials,
    status: "PAID", payment: "INVOICE", createdAt: nowIso(),
    delivery: { mode: "COURIER", city: "Санкт-Петербург", address: "Невский проспект, 100", zip: "191025", comment: "" },
    marking: {},
  });
}

let STATE = load();
/* Сразу закрепляем состояние в браузере, чтобы сессия и сид не терялись при перезагрузке. */
save();

function load() {
  try {
    /* Чистим ключи прошлых версий стенда, чтобы не копить мусор в браузере. */
    ["byrain-pro-demo-v1", "byrain-pro-demo-v2", "byrain-pro-demo-v3", "byrain-pro-demo-v4"].forEach((k) => {
      if (k !== KEY) localStorage.removeItem(k);
    });
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshState();
    const st = JSON.parse(raw);
    if (!st || st.v !== 5) return freshState();
    return st;
  } catch (e) {
    return freshState();
  }
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(STATE));
  } catch (e) {}
}
function resetDemo() {
  STATE = freshState();
  save();
}
function me() {
  return STATE.users.find((u) => u.id === STATE.session) || null;
}
function isApproved(u) {
  return !!u && u.status === "APPROVED" && u.role !== "BLOCKED_ROLE" && u.status !== "BLOCKED";
}
function isStaff(u) {
  return !!u && (u.role === "ADMIN" || u.role === "MANAGER");
}
function audit(action, detail) {
  const u = me();
  STATE.audit.unshift({ id: uid(), at: nowIso(), who: u ? u.fullName : "Гость", action, detail });
  STATE.audit = STATE.audit.slice(0, 200);
}

/* ---------- цены: порт src/lib/pricing.ts ---------- */

function discountedPrice(rrp, pct) {
  return Math.round((rrp * (100 - pct)) / 100);
}

function quote(items, pointsBalance, pointsRequested) {
  const lines = items.filter((i) => i.qty > 0).map((i) => ({ ...i, product: bySku(i.sku) })).filter((i) => i.product);
  const units = lines.reduce((n, l) => n + l.qty, 0);
  /* Максимальный уровень даёт любой набор из восьми и более единиц:
     состав значения не имеет, можно взять восемь одинаковых продуктов. */
  const fullLine = units >= SETTINGS.tierFullLineMin;

  let pct = SETTINGS.tierBasePct;
  if (fullLine) pct = SETTINGS.tierFullLinePct;
  else if (units >= SETTINGS.tierThreeUnitsMin) pct = SETTINGS.tierThreeUnitsPct;

  const priced = lines.map((l) => {
    const unitPrice = discountedPrice(l.product.rrp, pct);
    return { sku: l.sku, qty: l.qty, product: l.product, rrp: l.product.rrp, pct, unitPrice, lineTotal: unitPrice * l.qty };
  });

  const subtotalRrp = priced.reduce((n, l) => n + l.rrp * l.qty, 0);
  const afterDiscount = priced.reduce((n, l) => n + l.lineTotal, 0);
  const discountAmount = subtotalRrp - afterDiscount;
  const effectivePct = subtotalRrp > 0 ? Math.round((discountAmount / subtotalRrp) * 100) : pct;

  const balance = Math.max(0, pointsBalance || 0);
  const pointsMax = Math.min(balance, Math.floor((afterDiscount * SETTINGS.pointsRedeemMaxPct) / 100));
  const pointsUsed = Math.max(0, Math.min(pointsMax, Math.floor(pointsRequested || 0)));

  const freeShipping = afterDiscount >= SETTINGS.freeShippingFrom;
  const shippingCost = units === 0 || freeShipping ? 0 : SETTINGS.shippingCost;
  const giftMaterials = afterDiscount >= SETTINGS.materialsGiftFrom && units > 0;
  const total = afterDiscount - pointsUsed + shippingCost;
  const pointsToEarn = Math.floor(((afterDiscount - pointsUsed) * SETTINGS.pointsEarnPct) / 100);

  let unitsToNextTier = 0;
  let nextTierPct = null;
  if (units < SETTINGS.tierThreeUnitsMin) {
    unitsToNextTier = SETTINGS.tierThreeUnitsMin - units;
    nextTierPct = SETTINGS.tierThreeUnitsPct;
  } else if (!fullLine) {
    unitsToNextTier = SETTINGS.tierFullLineMin - units;
    nextTierPct = SETTINGS.tierFullLinePct;
  }

  return { lines: priced, units, subtotalRrp, discountPct: effectivePct, discountAmount, afterDiscount,
    pointsMax, pointsUsed, shippingCost, freeShipping, giftMaterials, total, pointsToEarn,
    fullLine, unitsToNextTier, nextTierPct };
}

function cartItems(u) {
  const c = (u && u.cart) || {};
  return Object.keys(c).map((sku) => ({ sku, qty: c[sku] })).filter((i) => i.qty > 0);
}
function cartUnits(u) {
  return cartItems(u).reduce((n, i) => n + i.qty, 0);
}

/* ---------- баллы ---------- */

function pointsBalance(u) {
  if (!u || !u.points) return 0;
  return u.points.reduce((n, p) => n + p.delta, 0);
}
function addPoints(u, type, delta) {
  u.points.push({ id: uid(), type, delta, createdAt: nowIso(), expiresAt: delta > 0 ? addMonths(new Date(), SETTINGS.pointsExpiryMonths) : null });
}

/* ---------- OTP ---------- */

function normPhone(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  let x = d;
  if (x.length === 11 && x[0] === "8") x = "7" + x.slice(1);
  if (x.length === 10) x = "7" + x;
  if (x.length !== 11 || x[0] !== "7") return "";
  return "+" + x;
}
function phonePretty(p) {
  const d = String(p || "").replace(/\D/g, "");
  if (d.length !== 11) return p || "";
  return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`;
}
function sendOtp(phone) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  STATE.otp = { phone, code, expiresAt: Date.now() + 5 * 60 * 1000, tries: 0 };
  save();
  return code;
}
function checkOtp(phone, code) {
  const o = STATE.otp;
  if (!o || o.phone !== phone) return { ok: false, error: "Код не запрошен. Запросите код заново." };
  if (Date.now() > o.expiresAt) return { ok: false, error: "Срок действия кода истёк. Запросите новый." };
  o.tries += 1;
  if (o.tries > 5) return { ok: false, error: "Превышено число попыток. Запросите новый код." };
  if (String(code).trim() !== o.code) return { ok: false, error: "Код неверный." };
  STATE.otp = null;
  save();
  return { ok: true };
}

/* ---------- допуск ---------- */

/* Автоматических проверок в продукте больше нет: все три способа
   подтверждения статуса рассматривает менеджер. */
function autoCheck() {
  return { approved: false, text: null };
}

function approveUser(u, tier) {
  u.status = "APPROVED";
  u.tier = tier || u.tier || "SPECIALIST";
  u.verifiedAt = nowIso();
  u.reverifyDueAt = addMonths(new Date(), SETTINGS.reverifyMonths);
  if (u.verification) {
    u.verification.decidedAt = nowIso();
    if (u.verification.data && u.verification.data.files) u.verification.data.files = "удалены после решения";
  }
  if (!u.verificationBonusGiven && SETTINGS.verificationBonus > 0) {
    addPoints(u, "VERIFICATION_BONUS", SETTINGS.verificationBonus);
    u.verificationBonusGiven = true;
  }
}
function rejectUser(u, comment) {
  u.status = "REJECTED";
  if (u.verification) {
    u.verification.decidedAt = nowIso();
    u.verification.comment = comment || "";
    if (u.verification.data && u.verification.data.files) u.verification.data.files = "удалены после решения";
  }
}
function blockUser(u, reason) {
  u.status = "BLOCKED";
  u.blockedReason = reason || "Нарушение пункта 4 Условий программы PRO";
  const bal = pointsBalance(u);
  if (bal > 0) addPoints(u, "SANCTION", -bal);
}

/* ---------- заказы ---------- */

function orderNumber(st, iso) {
  const d = iso ? new Date(iso) : new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const sameDay = (st.orders || []).filter((o) => o.number.startsWith(`PRO-${ymd}-`)).length;
  return `PRO-${ymd}-${String(sameDay + 1).padStart(3, "0")}`;
}

function createOrder(u, delivery, payment, pointsRequested) {
  const items = cartItems(u);
  if (!items.length) return { ok: false, error: "Корзина пуста." };
  const q = quote(items, pointsBalance(u), pointsRequested);
  const order = {
    id: uid(),
    number: orderNumber(STATE),
    userId: u.id,
    items: q.lines.map((l) => ({ sku: l.sku, qty: l.qty, rrp: l.rrp, pct: l.pct, unitPrice: l.unitPrice })),
    subtotalRrp: q.subtotalRrp, discountAmount: q.discountAmount, discountPct: q.discountPct,
    afterDiscount: q.afterDiscount, pointsUsed: q.pointsUsed, shippingCost: q.shippingCost,
    total: q.total, pointsToEarn: q.pointsToEarn, giftMaterials: q.giftMaterials,
    status: "AWAITING_PAYMENT", payment, createdAt: nowIso(), delivery, marking: {},
  };
  if (q.pointsUsed > 0) addPoints(u, "ORDER_REDEEM", -q.pointsUsed);
  STATE.orders.unshift(order);
  u.cart = {};
  audit("Создан заказ", order.number);
  save();
  return { ok: true, order };
}

function setOrderStatus(order, status) {
  const u = STATE.users.find((x) => x.id === order.userId);
  if (status === "PAID" && order.status !== "PAID" && u) {
    addPoints(u, "ORDER_EARN", order.pointsToEarn);
    const paidBefore = STATE.orders.filter((o) => o.userId === u.id && o.status === "PAID" && o.id !== order.id).length;
    if (paidBefore === 0 && !u.firstOrderBonusGiven && SETTINGS.firstOrderBonus > 0) {
      addPoints(u, "FIRST_ORDER_BONUS", SETTINGS.firstOrderBonus);
      u.firstOrderBonusGiven = true;
    }
  }
  if (status === "CANCELLED" && order.pointsUsed > 0 && u) {
    addPoints(u, "REFUND", order.pointsUsed);
    order.pointsUsed = 0;
  }
  order.status = status;
  audit("Статус заказа", `${order.number}: ${label(ORDER_STATUSES, status)}`);
  save();
}

function label(pairs, key) {
  const f = pairs.find((p) => p[0] === key);
  return f ? f[1] : key;
}

/* ---------- дозаказ ---------- */

function reorderHints(u) {
  const paid = STATE.orders.filter((o) => o.userId === u.id && ["PAID", "PACKING", "SHIPPED", "DELIVERED"].includes(o.status));
  const seen = {};
  paid.forEach((o) => o.items.forEach((i) => { seen[i.sku] = seen[i.sku] || []; seen[i.sku].push(o.createdAt); }));
  const out = [];
  Object.keys(seen).forEach((sku) => {
    const dates = seen[sku].sort();
    const last = new Date(dates[dates.length - 1]);
    const days = (Date.now() - last.getTime()) / 86400000;
    const interval = dates.length > 1 ? Math.max(7, (new Date(dates[dates.length - 1]) - new Date(dates[0])) / 86400000 / (dates.length - 1)) : 30;
    if (days > interval) out.push({ sku, days: Math.round(days), interval: Math.round(interval) });
  });
  return out;
}

/* ---------- отзывы, наборы, обучение ---------- */

function reviewsFor(sku) {
  return STATE.reviews.filter((r) => r.sku === sku && r.status === "PUBLISHED");
}
function addReview(u, sku, text, rating) {
  STATE.reviews.unshift({ id: uid(), sku, author: u.fullName, city: u.city, text, rating, status: "PENDING", createdAt: nowIso(), userId: u.id });
  save();
}
/* ---------- продвинутая сертификация ---------- */

/* Состояние продвинутой ступени у специалиста. Создаётся при первом обращении. */
function advState(u) {
  u.education = u.education || {};
  if (!u.education.advanced) u.education.advanced = { modules: {}, attempts: [] };
  const a = u.education.advanced;
  a.modules = a.modules || {};
  a.attempts = a.attempts || [];
  return a;
}
function advReadCount(u) {
  const a = advState(u);
  return ADVANCED.modules.filter((m) => a.modules[m.key]).length;
}
function advAllRead(u) {
  return advReadCount(u) === ADVANCED.modules.length;
}
function advLast(u) {
  const a = advState(u);
  return a.attempts.length ? a.attempts[a.attempts.length - 1] : null;
}
/* Когда откроется следующая попытка: вторая через 7 дней после первой. */
function advNextAt(u) {
  const last = advLast(u);
  if (!last) return null;
  const d = new Date(last.at);
  d.setDate(d.getDate() + ADVANCED.retryDays);
  return d.toISOString();
}
function advGate(u) {
  const a = advState(u);
  if (a.passedAt) return { ok: false, reason: "PASSED" };
  if (!advAllRead(u)) return { ok: false, reason: "MODULES" };
  if (a.attempts.length >= ADVANCED.attempts) return { ok: false, reason: "SPENT" };
  const next = advNextAt(u);
  if (next && new Date(next).getTime() > Date.now()) return { ok: false, reason: "WAIT", at: next };
  return { ok: true };
}
function advCode() {
  const n = String(Math.floor(1 + Math.random() * 999999)).padStart(6, "0");
  return `${ADVANCED.cert.prefix}-${new Date().getFullYear()}-${n}`;
}

function certCode() {
  return `BYR-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;
}
function listingsPublic() {
  const fromUsers = STATE.users
    .filter((u) => u.status === "APPROVED" && u.education && u.education.listed)
    .map((u) => ({ id: u.id, name: u.fullName, city: u.city, spec: label(SPECIALIZATIONS, u.specialization), about: u.education.about || "", adv: !!(u.education.advanced && u.education.advanced.passedAt), source: "user" }));
  /* Специалисты с продвинутой сертификацией идут первыми: приоритет в выдаче. */
  return fromUsers.concat(STATE.listings).sort((a, b) => (b.adv ? 1 : 0) - (a.adv ? 1 : 0));
}
