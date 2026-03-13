(() => {
  "use strict";

  const dataUrl = "data/leaders.json";
  const pollMs = 30000;

  const boardOrder = ["solo", "duotrio", "groups"];

  const boardCardEl = document.getElementById("boardCard");
  const boardTitleEl = document.getElementById("boardTitle");
  const eventTitleEl = document.getElementById("eventTitle");
  const updatedAtEl = document.getElementById("updatedAt");
  const divisionsWrapEl = document.getElementById("divisionsWrap");
  const boardTabsEl = document.getElementById("boardTabs");

  let payload = null;
  let currentBoardId = "solo";
  let pollTimer = null;

  async function fetchData() {
    try {
      const res = await fetch(`${dataUrl}?_=${Date.now()}`, { cache: "no-store" });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      if (!json || !Array.isArray(json.boards)) {
        throw new Error("Invalid leaderboard payload");
      }

      payload = json;

      if (!getBoardById(currentBoardId)) {
        currentBoardId = getDefaultBoardId();
      }

      renderBoardTabs();
      renderCurrentBoard();
    } catch (err) {
      console.error("Leaderboard fetch failed:", err);
      showErrorState("Unable to load leaderboard data");
    }
  }

  function getBoardById(boardId) {
    if (!payload || !Array.isArray(payload.boards)) return null;
    return payload.boards.find((board) => board.id === boardId) || null;
  }

  function getDefaultBoardId() {
    if (!payload || !Array.isArray(payload.boards) || payload.boards.length === 0) {
      return "solo";
    }

    const firstKnown = boardOrder.find((id) => getBoardById(id));
    return firstKnown || payload.boards[0].id;
  }

  function showErrorState(message) {
    boardTitleEl.textContent = message;
    eventTitleEl.textContent = "";
    updatedAtEl.textContent = "";
    divisionsWrapEl.innerHTML = "";
  }

  function renderBoardTabs() {
    if (!boardTabsEl || !payload) return;

    boardTabsEl.innerHTML = "";

    const tabs = [
      { id: "solo", label: "Solo" },
      { id: "duotrio", label: "Duo/Trio" },
      { id: "groups", label: "Group" }
    ];

    tabs.forEach((tab) => {
      const exists = !!getBoardById(tab.id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "boardTab" + (currentBoardId === tab.id ? " active" : "") + (!exists ? " is-empty" : "");
      btn.textContent = tab.label;
      btn.disabled = !exists;
      btn.addEventListener("click", () => {
        currentBoardId = tab.id;
        renderBoardTabs();
        renderCurrentBoard();
      });
      boardTabsEl.appendChild(btn);
    });
  }

  function renderCurrentBoard() {
    const board = getBoardById(currentBoardId);
    if (!board) {
      showErrorState("No leaderboard available");
      return;
    }

    fillBoard(board);
    fitBoardToViewport();
  }

  function fillBoard(board) {
    boardTitleEl.textContent = board.title || "";
    eventTitleEl.textContent = payload && payload.event_title ? payload.event_title : "";
    updatedAtEl.textContent = payload && payload.updated_at ? `Updated ${formatUpdated(payload.updated_at)}` : "";

    divisionsWrapEl.innerHTML = "";

    const divisions = Array.isArray(board.divisions) ? board.divisions : [];

    divisions.forEach((division) => {
      const divisionEl = document.createElement("section");
      divisionEl.className = "division";

      const titleEl = document.createElement("h2");
      titleEl.className = "divisionTitle";
      titleEl.textContent = division.name || "";
      divisionEl.appendChild(titleEl);

      const listEl = document.createElement("ol");
      listEl.className = "rankList";

      const places = Array.isArray(division.places) ? division.places : [];

      for (let i = 0; i < 5; i += 1) {
        const rowEl = document.createElement("li");
        rowEl.className = "rankRow";

        const numEl = document.createElement("div");
        numEl.className = "rankNum";
        numEl.textContent = `${i + 1}.`;

        const nameEl = document.createElement("div");
        nameEl.className = "rankName";

        const placeEntries = normalizePlaceEntries(places[i]);
        nameEl.textContent = placeEntries.length ? placeEntries.join(", ") : "";

        rowEl.appendChild(numEl);
        rowEl.appendChild(nameEl);
        listEl.appendChild(rowEl);
      }

      divisionEl.appendChild(listEl);
      divisionsWrapEl.appendChild(divisionEl);
    });
  }

  function normalizePlaceEntries(place) {
    if (Array.isArray(place)) {
      return place.map((v) => String(v || "").trim()).filter(Boolean);
    }

    if (typeof place === "string") {
      const trimmed = place.trim();
      return trimmed ? [trimmed] : [];
    }

    return [];
  }

  function fitBoardToViewport() {
    if (!boardCardEl) return;

    for (let i = 0; i <= 6; i += 1) {
      boardCardEl.classList.remove(`fit-${i}`);
    }

    let applied = 0;
    boardCardEl.classList.add("fit-0");

    while (applied < 6 && document.documentElement.scrollHeight > window.innerHeight) {
      boardCardEl.classList.remove(`fit-${applied}`);
      applied += 1;
      boardCardEl.classList.add(`fit-${applied}`);
    }
  }

  function formatUpdated(value) {
    const dt = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(dt.getTime())) {
      return value;
    }

    return dt.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function startPolling() {
    stopPolling();
    pollTimer = window.setInterval(fetchData, pollMs);
  }

  function stopPolling() {
    if (pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  document.getElementById("resultsBtn").addEventListener("click", () => {
    window.location.href = "index.html";
  });

  window.addEventListener("resize", fitBoardToViewport);

  fetchData();
  startPolling();
})();
