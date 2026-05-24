(function () {
  const store = window.IuteStore;
  if (!store) return;

  const style = document.createElement("style");
  style.textContent = `
    .order-actions{display:flex;gap:8px;flex-wrap:wrap}
    .order-actions .btn{min-height:36px;padding:8px 12px}
  `;
  document.head.appendChild(style);

  const listMap = {
    cardsAdminList: { name: "cards", tab: "cards" },
    chatsAdminList: { name: "chats", tab: "chats" },
    availabilityAdminList: { name: "cities", tab: "availability" },
    reviewsAdminList: { name: "reviews", tab: "reviews" }
  };

  function getList(data, name) {
    if (name === "cards") return data.cards;
    if (name === "chats") return data.chats;
    if (name === "reviews") return data.reviews;
    if (name === "cities") return data.availability && data.availability.cities;
    return null;
  }

  function password(data) {
    return data.password || document.getElementById("adminPassword")?.value || store.DEFAULT_PASSWORD;
  }

  function activeTab() {
    return document.querySelector(".tab-btn.is-active")?.dataset.tab || "cards";
  }

  function restoreTab(tabName) {
    if (!tabName) return;
    const button = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (button) setTimeout(() => button.click(), 50);
  }

  function move(name, index, direction) {
    const data = store.loadData();
    const list = getList(data, name);
    if (!Array.isArray(list)) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= list.length) return;
    const item = list[index];
    list[index] = list[nextIndex];
    list[nextIndex] = item;
    const tabName = activeTab();
    store.saveData(data, password(data)).then(() => {
      sessionStorage.setItem("iuteAdminOrderTab", tabName);
      location.reload();
    });
  }

  function addControls(container) {
    const config = listMap[container.id];
    if (!config) return;
    [...container.querySelectorAll(".admin-item")].forEach((item, index) => {
      if (item.querySelector(".order-actions")) return;
      const fields = item.querySelector(".admin-fields") || item;
      const row = document.createElement("div");
      row.className = "order-actions wide";
      row.innerHTML = `
        <button class="btn ghost" data-order-list="${config.name}" data-order-index="${index}" data-order-dir="-1" type="button">Выше</button>
        <button class="btn ghost" data-order-list="${config.name}" data-order-index="${index}" data-order-dir="1" type="button">Ниже</button>
      `;
      const actions = fields.querySelector(".row-actions");
      fields.insertBefore(row, actions || null);
    });
  }

  function scan() {
    Object.keys(listMap).forEach(id => {
      const container = document.getElementById(id);
      if (container) addControls(container);
    });
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-order-list]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    move(button.dataset.orderList, Number(button.dataset.orderIndex), Number(button.dataset.orderDir));
  }, true);

  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  restoreTab(sessionStorage.getItem("iuteAdminOrderTab"));
  sessionStorage.removeItem("iuteAdminOrderTab");
  scan();
})();
