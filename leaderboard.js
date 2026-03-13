(() => {
  "use strict";

  const dataUrl = "data/leaders.json";
  const rotateMs = 12000;
  const pollMs = 30000;

  const appEl = document.getElementById("app");
  const boardCardEl = document.getElementById("boardCard");
  const boardTitleEl = document.getElementById("boardTitle");
  const eventTitleEl = document.getElementById("eventTitle");
  const updatedAtEl = document.getElementById("updatedAt");
  const divisionsWrapEl = document.getElementById("divisionsWrap");

  let payload = null;
  let currentBoardIndex = 0;
  let rotateTimer = null;
  let pollTimer = null;
  let previousTopMap = {};

  async function fetchData() {
    try {
      const res = await fetch(`${dataUrl}?_=${Date.now()}`, {
        cache: "no-store"
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();

      if (!json || !Array.isArray(json.boards)) {
        throw new Error("Invalid leaderboard payload");
      }

      const oldTopMap = buildTopMap(payload);
      payload = json;
      previousTopMap = oldTopMap;

      if (currentBoardIndex >= payload.boards.length) {
        currentBoardIndex = 0;
      }

      renderBoard(currentBoardIndex, false);
      appEl.classList.remove("loading");
    } catch (err) {
      console.error("Leaderboard fetch failed:", err);
      showErrorState("Unable to load leaderboard data");
    }
  }

  function buildTopMap(data) {
    const map = {};
    if (!data || !Array.isArray(data.boards)) return map;

    data.boards.forEach((board) => {
      if (!board || !Array.isArray(board.divisions)) return;

      board.divisions.forEach((division) => {
        const key = `${board.id}::${division.name}`;
        const slot1 = Array.isArray(division.places) ? division.places[0] : null;
        map[key] = JSON.stringify(normalizePlaceEntries(slot1));
      });
    });

    return map;
  }

  function showErrorState(message) {
    boardTitleEl.textContent = message;
    eventTitleEl.textContent = "";
    updatedAtEl.textContent = "";
    divisionsWrapEl.innerHTML = "";
  }

  function renderBoard(index, animate = true) {
    if (!payload || !Array.isArray(payload.boards) || payload.boards.length === 0) {
      showErrorState("No leaderboards available");
      return;
    }

    const board = payload.boards[index];
    if (!board) return;

    if (!animate) {
      fillBoard(board);
      return;
    }

    boardCardEl.classList.add("is-switching-out");

    window.setTimeout(() => {
      boardCardEl.classList.remove("is-switching-out");
      boardCardEl.classList.add("is-switching-in");

      fillBoard(board);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          boardCardEl.classList.remove("is-switching-in");
        });
      });
    }, 300);
  }

  function fillBoard(board) {
    boardTitleEl.textContent = board.title || "";
    eventTitleEl.textContent = payload && payload.event_title ? payload.event_title : "";

    const updatedText = payload && payload.updated_at
      ? `Updated ${formatUpdated(payload.updated_at)}`
      : "";
    updatedAtEl.textContent = updatedText;

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

        const place = places[i];
        const placeEntries = normalizePlaceEntries(place);

        if (placeEntries.length === 0) {
          nameEl.innerHTML = "&nbsp;";
        } else {
          nameEl.textContent = placeEntries.join(", ");
        }

        rowEl.appendChild(numEl);
        rowEl.appendChild(nameEl);
        listEl.appendChild(rowEl);
      }

      divisionEl.appendChild(listEl);
      divisionsWrapEl.appendChild(divisionEl);

      maybeCelebrateNewLeader(board, division);
    });
  }

  function normalizePlaceEntries(place) {
    if (Array.isArray(place)) {
      return place
        .map((v) => String(v || "").trim())
        .filter((v) => v !== "");
    }

    if (typeof place === "string") {
      const trimmed = place.trim();
      return trimmed ? [trimmed] : [];
    }

    return [];
  }

  function maybeCelebrateNewLeader(board, division) {
    const key = `${board.id}::${division.name}`;
    const slot1 = Array.isArray(division.places) ? division.places[0] : null;
    const currentTop = JSON.stringify(normalizePlaceEntries(slot1));
    const previousTop = previousTopMap[key] || "";

    if (!currentTop || currentTop === "[]" || !previousTop || currentTop === previousTop) {
      return;
    }

    flashCelebration();
  }

  function flashCelebration() {
    document.body.animate(
      [
        { transform: "scale(1)", filter: "brightness(1)" },
        { transform: "scale(1.01)", filter: "brightness(1.08)" },
        { transform: "scale(1)", filter: "brightness(1)" }
      ],
      {
        duration: 900,
        easing: "ease-out"
      }
    );
  }

  function formatUpdated(value) {
    const dt = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(dt.getTime())) {
      return value;
    }

    return dt.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function startRotation() {
    stopRotation();

    rotateTimer = window.setInterval(() => {
      if (!payload || !Array.isArray(payload.boards) || payload.boards.length < 2) {
        return;
      }

      currentBoardIndex = (currentBoardIndex + 1) % payload.boards.length;
      renderBoard(currentBoardIndex, true);
    }, rotateMs);
  }

  function stopRotation() {
    if (rotateTimer) {
      window.clearInterval(rotateTimer);
      rotateTimer = null;
    }
  }

  function startPolling() {
    stopPolling();

    pollTimer = window.setInterval(() => {
      fetchData();
    }, pollMs);
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

  fetchData();
  startRotation();
  startPolling();
})();
