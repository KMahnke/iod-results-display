let leaderboardData = null;
let activeBoardId = "solo";

const BOARD_ORDER = ["solo", "duotrio", "groups"];
const BOARD_LABELS = {
  solo: "Solo",
  duotrio: "Duo/Trio",
  groups: "Group"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizePlaceEntries(place) {
  if (Array.isArray(place)) {
    return place
      .map((v) => String(v ?? "").trim())
      .filter((v) => v !== "");
  }

  if (typeof place === "string") {
    const trimmed = place.trim();
    return trimmed ? [trimmed] : [];
  }

  return [];
}

function getBoardById(boardId) {
  if (!leaderboardData || !Array.isArray(leaderboardData.boards)) return null;
  return leaderboardData.boards.find((board) => board.id === boardId) || null;
}

async function loadLeaderboard() {
  try {
    const response = await fetch("data/leaders.json?" + Date.now(), { cache: "no-store" });
    leaderboardData = await response.json();

    document.getElementById("eventTitle").textContent =
      leaderboardData.event_title || "Leaderboard";

    document.getElementById("lastUpdate").textContent =
      `Last updated: ${leaderboardData.updated_at || ""}`;

    if (!getBoardById(activeBoardId)) {
      const firstBoard = Array.isArray(leaderboardData.boards) && leaderboardData.boards.length
        ? leaderboardData.boards[0]
        : null;
      activeBoardId = firstBoard ? firstBoard.id : "solo";
    }

    renderBoardTabs();
    renderBoard();
  } catch (err) {
    console.error("Failed to load leaderboard:", err);
  }
}

function renderBoardTabs() {
  const tabs = document.getElementById("boardTabs");
  tabs.innerHTML = "";

  BOARD_ORDER.forEach((boardId) => {
    const board = getBoardById(boardId);
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (activeBoardId === boardId ? " active" : "");

    if (!board) {
      btn.className += " tab-btn-empty";
    }

    btn.textContent = BOARD_LABELS[boardId] || boardId;
    btn.onclick = () => {
      if (!board) return;
      activeBoardId = boardId;
      renderBoardTabs();
      renderBoard();
    };

    tabs.appendChild(btn);
  });
}

function renderBoard() {
  const board = getBoardById(activeBoardId);
  const boardTitle = document.getElementById("boardTitle");
  const boardUpdated = document.getElementById("boardUpdated");
  const divisionsWrap = document.getElementById("divisionsWrap");
  const sponsorLogo = document.getElementById("sponsorLogo");
  const boardCard = document.getElementById("boardCard");

  if (!board) {
    boardTitle.textContent = "No leaderboard data";
    boardUpdated.textContent = "";
    divisionsWrap.innerHTML = "";
    sponsorLogo.style.display = "none";
    return;
  }

  boardTitle.textContent = board.title || BOARD_LABELS[board.id] || "Leaderboard";
  boardUpdated.textContent = leaderboardData?.publish_version
    ? `Publish version: ${leaderboardData.publish_version}`
    : "";

  if (board.sponsor_logo) {
    sponsorLogo.src = board.sponsor_logo;
    sponsorLogo.style.display = "block";
  } else {
    sponsorLogo.removeAttribute("src");
    sponsorLogo.style.display = "none";
  }

  const divisions = Array.isArray(board.divisions) ? board.divisions : [];
  divisionsWrap.innerHTML = divisions.map((division) => {
    const places = Array.isArray(division.places) ? division.places : [];

    const rowsHtml = [0, 1, 2, 3, 4].map((idx) => {
      const entries = normalizePlaceEntries(places[idx]);
      const placeNo = idx + 1;

      let rowClass = "rank-row";
      if (entries.length > 1) rowClass += " rank-row-tie";

      const valueHtml = entries.length
        ? entries.map((entry) => `<div class="rank-entry">${escapeHtml(entry)}</div>`).join("")
        : `<div class="rank-entry rank-entry-empty">&nbsp;</div>`;

      return `
        <div class="${rowClass}">
          <div class="rank-num">${placeNo}.</div>
          <div class="rank-values">${valueHtml}</div>
        </div>
      `;
    }).join("");

    return `
      <section class="division-card">
        <h3 class="division-title">${escapeHtml(division.name || "")}</h3>
        <div class="rank-list">
          ${rowsHtml}
        </div>
      </section>
    `;
  }).join("");

  applyDynamicFit(boardCard);
}

function applyDynamicFit(boardCard) {
  boardCard.classList.remove("fit-tight", "fit-tighter", "fit-tightest");
  void boardCard.offsetHeight;

  const maxAllowed = window.innerHeight - 190;
  if (boardCard.offsetHeight <= maxAllowed) return;

  boardCard.classList.add("fit-tight");
  void boardCard.offsetHeight;
  if (boardCard.offsetHeight <= maxAllowed) return;

  boardCard.classList.remove("fit-tight");
  boardCard.classList.add("fit-tighter");
  void boardCard.offsetHeight;
  if (boardCard.offsetHeight <= maxAllowed) return;

  boardCard.classList.remove("fit-tighter");
  boardCard.classList.add("fit-tightest");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("backToResultsBtn").addEventListener("click", () => {
    window.location.href = "index.html";
  });

  loadLeaderboard();
  setInterval(loadLeaderboard, 10000);

  window.addEventListener("resize", () => {
    const boardCard = document.getElementById("boardCard");
    if (boardCard) {
      applyDynamicFit(boardCard);
    }
  });
});