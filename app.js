(function () {
  const STORAGE_KEY = "iuteSiteData";
  const OWNER_KEY = "iuteOwnerMode";
  const DEFAULT_PASSWORD = "iutecc228";

  const defaults = {
    password: DEFAULT_PASSWORD,
    news: {
      enabled: true,
      title: "Актуальные новости",
      text: "Здесь владелец может написать свежую информацию для посетителей. Текст, заголовок и показ окна меняются в админ панели."
    },
    hero: {
      eyebrow: "локальная визитка",
      title: "Iute 🌶",
      description: "Сайт создан для того что бы вы были в курсе каждый день актуальных новостей/наличий и контактов",
      logo: "logo.jpg",
      banner: "banner.jpg"
    },
    availability: {
      eyebrow: "наличие",
      title: "Наличие",
      cities: [
        { id: cryptoId(), name: "Кишинев", description: "Актуальное наличие по Кишиневу обновляется каждый день.", url: "https://t.me/iute555bot" },
        { id: cryptoId(), name: "Бельцы", description: "Информация по Бельцам: свежие новости, наличие и важные обновления.", url: "https://t.me/iute555bot" },
        { id: cryptoId(), name: "Фалешты", description: "По Фалештам здесь будет отдельное описание и актуальная информация.", url: "https://t.me/iute555bot" },
        { id: cryptoId(), name: "Унгены", description: "По Унгены здесь можно указать отдельное наличие и контакты.", url: "https://t.me/iute555bot" }
      ]
    },
    cards: [
      {
        id: cryptoId(),
        title: "Iute 🌶",
        description: "Постоянный переход на актуальную страницу с контактами и обновлениями.",
        image: "banner.jpg",
        button: "Перейти",
        url: "https://tut.contact/iutecc"
      },
      {
        id: cryptoId(),
        title: "Каталог",
        description: "Быстрый доступ к разделу с удобной навигацией и свежими обновлениями.",
        image: "logo.jpg",
        button: "Открыть",
        url: "https://tut.contact/iutecc"
      },
      {
        id: cryptoId(),
        title: "Поддержка",
        description: "Контакт для вопросов, уточнений и связи с оператором.",
        image: "banner.jpg",
        button: "Написать",
        url: "https://t.me/iuteccc"
      }
    ],
    chats: [
      { id: cryptoId(), title: "Оператор", hint: "@iuteccc", url: "https://t.me/iuteccc" },
      { id: cryptoId(), title: "Маркетолог", hint: "@marketologccc", url: "https://t.me/marketologccc" },
      { id: cryptoId(), title: "Отзывы", hint: "Telegram", url: "https://t.me/+uV5gGpLumI43ZjE6" },
      { id: cryptoId(), title: "Стикеры", hint: "Набор", url: "https://t.me/addstickers/iutecc" }
    ],
    reviews: [
      {
        id: cryptoId(),
        login: "@moskva",
        text: "в касаний",
        createdAt: new Date(Date.now() - 5400000).toISOString(),
        approved: true,
        rating: 4
      },
      {
        id: cryptoId(),
        login: "@sasha227",
        text: "лучшие",
        createdAt: new Date(Date.now() - 93600000).toISOString(),
        approved: true,
        rating: 5
      },
      {
        id: cryptoId(),
        login: "@bratmsk",
        text: "Был ннх спустя 17 раз покупки опер быстро среагировал выдал пз",
        createdAt: new Date(Date.now() - 183900000).toISOString(),
        approved: true,
        rating: 4
      },
      {
        id: cryptoId(),
        login: "@bigpack7",
        text: "хороший товар,лучший на рынке брат",
        createdAt: new Date(Date.now() - 291300000).toISOString(),
        approved: true,
        rating: 5
      }
    ],
    seedVersion: 3
  };

  function cryptoId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Math.random().toString(16).slice(2) + Date.now();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadData() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return mergeData(saved);
    } catch (error) {
      return clone(defaults);
    }
  }

  function mergeData(saved) {
    if (!saved || typeof saved !== "object") return clone(defaults);
    return {
      password: !saved.password || saved.password === "iute2026" ? DEFAULT_PASSWORD : saved.password,
      news: { ...defaults.news, ...(saved.news || {}) },
      hero: { ...defaults.hero, ...(saved.hero || {}) },
      availability: normalizeAvailability(saved.availability),
      cards: Array.isArray(saved.cards) ? saved.cards.map(normalizeCardImage) : clone(defaults.cards),
      chats: Array.isArray(saved.chats) ? saved.chats : clone(defaults.chats),
      reviews: enrichReviews(saved),
      seedVersion: Math.max(Number(saved.seedVersion || 0), defaults.seedVersion)
    };
  }

  function enrichReviews(saved) {
    const savedReviews = Array.isArray(saved.reviews) ? saved.reviews : [];
    const oldSeedLogins = new Set(["@alex_m", "@vika_online", "@roman_77", "@visitor", "@testuser", "@v_kasanii", "@top_client", "@nnxbuyer", "@brat_market"]);
    const normalized = savedReviews.filter(review => {
      if (Number(saved.seedVersion || 0) >= defaults.seedVersion) return true;
      return !oldSeedLogins.has(review.login);
    }).map(review => ({
      ...review,
      rating: Number(review.rating || 5)
    }));

    if (Number(saved.seedVersion || 0) >= defaults.seedVersion) return normalized;

    const existingLogins = new Set(normalized.map(review => review.login));
    const additions = defaults.reviews.filter(review => !existingLogins.has(review.login));
    return [...additions, ...normalized];
  }

  function normalizeCardImage(card, index = 0) {
    const fixed = { ...card };
    const image = String(fixed.image || "").trim();
    if (!image || image.includes("assets/iute")) {
      fixed.image = index % 2 === 0 ? "banner.jpg" : "logo.jpg";
    }
    return fixed;
  }

  function normalizeAvailability(value) {
    const source = value && typeof value === "object" ? value : {};
    const cities = Array.isArray(source.cities) && source.cities.length ? source.cities : defaults.availability.cities;
    return {
      eyebrow: source.eyebrow || defaults.availability.eyebrow,
      title: source.title || defaults.availability.title,
      cities: cities.map(city => ({
        id: city.id || cryptoId(),
        name: city.name || "Город",
        description: city.description || "",
        url: city.url || "https://t.me/iute555bot"
      }))
    };
  }

  function saveData(data, password) {
    data.seedVersion = Math.max(Number(data.seedVersion || 0), defaults.seedVersion);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (password) {
      fetch("/api/data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": password
        },
        body: JSON.stringify(data)
      }).catch(() => {});
    }
  }

  async function loadServerData() {
    try {
      const response = await fetch("/api/data", { cache: "no-store" });
      if (!response.ok) return false;
      const value = await response.json();
      if (!value || !Object.keys(value).length) return false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergeData(value)));
      return true;
    } catch (error) {
      return false;
    }
  }

  function submitReview(review, data) {
    data.reviews.unshift(review);
    saveData(data);
    fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(review)
    }).catch(() => {});
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function normalizeUrl(url) {
    const clean = String(url || "").trim();
    if (!clean) return "#";
    if (clean.startsWith("@")) return "https://t.me/" + clean.slice(1);
    if (/^[a-z]+:\/\//i.test(clean)) return clean;
    if (clean.startsWith("t.me/") || clean.startsWith("tut.contact/")) return "https://" + clean;
    return clean;
  }

  function renderCards(data) {
    const grid = document.getElementById("cardGrid");
    if (!grid) return;
    grid.innerHTML = data.cards.map(card => `
      <article class="link-card">
        <img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.title)}" onerror="this.onerror=null;this.src='banner.jpg';">
        <div class="link-card-body">
          <h3>${escapeHtml(card.title)}</h3>
          <p>${escapeHtml(card.description)}</p>
          <a class="btn primary" href="${escapeHtml(normalizeUrl(card.url))}" target="_blank" rel="noopener">${escapeHtml(card.button || "Перейти")}</a>
        </div>
      </article>
    `).join("");
  }

  function renderHero(data) {
    const eyebrow = document.getElementById("heroEyebrow");
    const title = document.getElementById("heroTitle");
    const description = document.getElementById("heroDescription");
    const brandLogo = document.getElementById("brandLogo");
    const heroBanner = document.getElementById("heroBanner");
    const hero = { ...defaults.hero, ...(data.hero || {}) };
    if (eyebrow) eyebrow.textContent = hero.eyebrow;
    if (title) title.textContent = hero.title;
    if (description) description.textContent = hero.description;
    if (brandLogo) brandLogo.src = hero.logo || defaults.hero.logo;
    if (heroBanner) heroBanner.src = hero.banner || defaults.hero.banner;
  }

  function renderChats(data) {
    const list = document.getElementById("chatList");
    if (!list) return;
    list.innerHTML = data.chats.map(chat => `
      <a class="chat-button" href="${escapeHtml(normalizeUrl(chat.url))}" target="_blank" rel="noopener">
        <span>${escapeHtml(chat.title)}</span>
        <small>${escapeHtml(chat.hint || "перейти")}</small>
      </a>
    `).join("");
  }

  function renderAvailability(data) {
    const section = document.getElementById("availability");
    const eyebrow = document.getElementById("availabilityEyebrow");
    const title = document.getElementById("availabilityTitle");
    const tabs = document.getElementById("cityTabs");
    const description = document.getElementById("cityDescription");
    if (!section || !tabs || !description) return;

    const cities = data.availability?.cities || [];
    if (!cities.length) {
      section.classList.add("is-hidden");
      return;
    }

    section.classList.remove("is-hidden");
    if (eyebrow) eyebrow.textContent = data.availability.eyebrow || defaults.availability.eyebrow;
    if (title) title.textContent = data.availability.title || defaults.availability.title;

    let selected = cities[0].id;
    const paint = () => {
      const city = cities.find(item => item.id === selected) || cities[0];
      tabs.querySelectorAll(".city-tab").forEach(button => {
        button.classList.toggle("is-active", button.dataset.cityId === city.id);
      });
      description.innerHTML = `
        <h3>${escapeHtml(city.name)}</h3>
        <p>${escapeHtml(city.description).replaceAll("\n", "<br>")}</p>
        <a class="btn primary city-link" href="${escapeHtml(city.url || "https://t.me/iute555bot")}" target="_blank" rel="noopener">Перейти в Telegram</a>
      `;
    };

    tabs.innerHTML = cities.map((city, index) => `
      <button class="city-tab ${index === 0 ? "is-active" : ""}" type="button" data-city-id="${escapeHtml(city.id)}">${escapeHtml(city.name)}</button>
    `).join("");
    tabs.addEventListener("click", event => {
      const button = event.target.closest(".city-tab");
      if (!button) return;
      selected = button.dataset.cityId;
      paint();
    });
    paint();
  }

  function renderReviews(data) {
    const track = document.getElementById("reviewTrack");
    if (!track) return;
    const approved = data.reviews.filter(review => review.approved);
    if (!approved.length) {
      track.innerHTML = `<article class="review-card"><strong>Пока нет отзывов</strong><p>Будьте первым, кто оставит отзыв.</p></article>`;
      return;
    }
    const doubled = [...approved, ...approved];
    track.innerHTML = doubled.map(review => `
      <article class="review-card">
        <strong>${escapeHtml(review.login)}</strong>
        <div class="review-rating" aria-label="${Number(review.rating || 5)} из 5">${stars(review.rating)}</div>
        <p>${escapeHtml(review.text)}</p>
        <time>${formatDate(review.createdAt)}</time>
      </article>
    `).join("");
  }

  function stars(rating) {
    const value = Math.max(1, Math.min(5, Number(rating || 5)));
    return "★".repeat(value) + "☆".repeat(5 - value);
  }

  function setupStars() {
    const picker = document.getElementById("starPicker");
    if (!picker) return;
    let current = 5;
    const paint = () => {
      picker.querySelectorAll(".star").forEach(button => {
        button.classList.toggle("is-active", Number(button.dataset.rating) <= current);
      });
    };
    picker.addEventListener("click", event => {
      const button = event.target.closest(".star");
      if (!button) return;
      current = Number(button.dataset.rating);
      picker.dataset.value = String(current);
      paint();
    });
    picker.dataset.value = String(current);
    paint();
  }

  function setupReviewForm(data) {
    const form = document.getElementById("reviewForm");
    if (!form) return;
    if (form.dataset.bound === "1") return;
    form.dataset.bound = "1";
    form.addEventListener("submit", event => {
      event.preventDefault();
      const login = document.getElementById("reviewLogin").value.trim();
      const text = document.getElementById("reviewText").value.trim();
      const notice = document.getElementById("reviewNotice");

      if (!/^@[A-Za-z0-9_]{4,32}$/.test(login)) {
        notice.textContent = "Логин должен начинаться с @ и быть похожим на Telegram username.";
        return;
      }

      if (text.length < 5) {
        notice.textContent = "Отзыв слишком короткий.";
        return;
      }

      submitReview({
        id: cryptoId(),
        login,
        text,
        createdAt: new Date().toISOString(),
        approved: false,
        rating: Number(document.getElementById("starPicker")?.dataset.value || 5)
      }, data);
      form.reset();
      setupStars();
      notice.classList.remove("is-hidden");
      notice.textContent = "Отзыв оставлен.";
    });
  }

  function setupNews(data) {
    const overlay = document.getElementById("newsOverlay");
    if (!overlay || !data.news.enabled) return;
    document.getElementById("newsTitle").textContent = data.news.title || "Новости";
    document.getElementById("newsText").textContent = data.news.text || "";
    overlay.classList.remove("is-hidden");
    const close = () => overlay.classList.add("is-hidden");
    document.getElementById("closeNews").addEventListener("click", close);
    document.getElementById("acceptNews").addEventListener("click", close);
  }

  function setupOwnerLink() {
    const params = new URLSearchParams(location.search);
    if (params.get("owner") === "1") localStorage.setItem(OWNER_KEY, "1");
    const link = document.getElementById("adminLink");
    if (link && localStorage.getItem(OWNER_KEY) === "1") link.classList.remove("is-hidden");
  }

  function setupTapFeedback() {
    if (document.body.dataset.tapFeedback === "1") return;
    document.body.dataset.tapFeedback = "1";
    document.addEventListener("pointerdown", event => {
      const target = event.target.closest(".btn, .chat-button, .city-tab");
      if (!target) return;
      target.classList.remove("tap-feedback");
      void target.offsetWidth;
      target.classList.add("tap-feedback");
      window.setTimeout(() => target.classList.remove("tap-feedback"), 430);
    });
  }

  function setupScrollReveal() {
    const items = document.querySelectorAll(".hero, .section, .reviews-section, .link-card, .chat-button, .review-form");
    items.forEach(item => item.classList.add("reveal-on-scroll"));

    if (!("IntersectionObserver" in window)) {
      items.forEach(item => item.classList.add("is-visible"));
      return;
    }

    if (!window.iuteRevealObserver) {
      window.iuteRevealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          window.iuteRevealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    }

    items.forEach(item => {
      if (item.classList.contains("is-visible")) return;
      window.iuteRevealObserver.observe(item);
    });
  }

  function renderPublicPage() {
    const data = loadData();
    renderHero(data);
    renderCards(data);
    renderAvailability(data);
    renderChats(data);
    renderReviews(data);
    setupStars();
    setupReviewForm(data);
    setupNews(data);
    setupOwnerLink();
    setupTapFeedback();
    setupScrollReveal();
  }

  window.IuteStore = {
    STORAGE_KEY,
    OWNER_KEY,
    DEFAULT_PASSWORD,
    cryptoId,
    loadData,
    saveData,
    loadServerData,
    submitReview,
    escapeHtml,
    formatDate,
    normalizeUrl
  };

  setupTapFeedback();
  setupScrollReveal();

  if (document.getElementById("cardGrid")) {
    renderPublicPage();
    loadServerData().then(changed => {
      if (changed) renderPublicPage();
    });
  }
})();
