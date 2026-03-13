const LEADERS_FILE = "data/leaders.json";

let leadersData = null;
let currentDivision = "solo";

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  loadLeaders();
  setInterval(loadLeaders, 15000);
});

function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      currentDivision = btn.dataset.division || "solo";
      renderDivision();
    });
  });
}

async function loadLeaders() {
  try {
    const res = await fetch(`${LEADERS_FILE}?t=${Date.now()}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    leadersData = await res.json();
    updateHeader();
    renderDivision();
  } catch (err) {
    console.error("Failed to load leaders.json:", err);

    const lastUpdate = document.getElementById("lastUpdate");
    const publishVersion = document.getElementById("publishVersion");
    const divisionTitle = document.getElementById("divisionTitle");

    if (lastUpdate) {
      lastUpdate.textContent = "Last updated: unable to load leaderboard data";
    }

    if (publishVersion) {
      publishVersion.textContent = "";
    }

    if (divisionTitle) {
      divisionTitle.textContent = "Leaderboard";
    }

    renderEmptyCards();
  }
}

function updateHeader() {
  const lastUpdate = document.getElementById("lastUpdate");
  const publishVersion = document.getElementById("publishVersion");

  if (lastUpdate) {
    const updated =
      firstNonEmpty(
        leadersData?.updated_at,
        leadersData?.updated,
        leadersData?.last_update
      ) || "";
    lastUpdate.textContent = updated ? `Last updated: ${updated}` : "Last updated:";
  }

  if (publishVersion) {
    const version = firstNonEmpty(leadersData?.publish_version) || "";
    publishVersion.textContent = version ? `Publish version: ${version}` : "Publish version:";
  }
}

function renderDivision() {
  const divisionTitle = document.getElementById("divisionTitle");
  if (divisionTitle) {
    divisionTitle.textContent = getDivisionLabel(currentDivision);
  }

  const board = getBoard(currentDivision);

  if (!board) {
    renderEmptyCards();
    return;
  }

  renderLevelCard("beginnerCard", "Beginner", getDivisionPlaces(board, "Beginner"));
  renderLevelCard("noviceCard", "Novice", getDivisionPlaces(board, "Novice"));
  renderLevelCard("openCard", "Open", getDivisionPlaces(board, "Open"));
}

function getBoard(boardId) {
  if (!leadersData || !Array.isArray(leadersData.boards)) {
    return null;
  }

  return leadersData.boards.find((board) => board && board.id === boardId) || null;
}

function getDivisionPlaces(board, divisionName) {
  if (!board || !Array.isArray(board.divisions)) {
    return [];
  }

  const division =
    board.divisions.find(
      (item) => normalizeText(item?.name) === normalizeText(divisionName)
    ) || null;

  return Array.isArray(division?.places) ? division.places : [];
}

function renderLevelCard(cardId, levelTitle, places) {
  const card = document.getElementById(cardId);
  if (!card) {
    return;
  }

  let html = `<h3>${escapeHtml(levelTitle)}</h3>`;

  for (let i = 0; i < 5; i += 1) {
    const placeNumber = i + 1;
    const items = Array.isArray(places[i]) ? places[i] : [];
    html += renderPlaceRow(placeNumber, items);
  }

  card.innerHTML = html;
}

function renderPlaceRow(placeNumber, items) {
  const value = formatPlacementItems(items);

  return `
    <div class="place-row">
      <div class="place-num">${ordinal(placeNumber)}</div>
      <div class="place-val ${value ? "" : "empty"}">${escapeHtml(value)}</div>
    </div>
  `;
}

function formatPlacementItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  return items
    .map((item) => String(item || "").trim())
    .filter((item) => item !== "")
    .join(", ");
}

function renderEmptyCards() {
  renderLevelCard("beginnerCard", "Beginner", []);
  renderLevelCard("noviceCard", "Novice", []);
  renderLevelCard("openCard", "Open", []);
}

function getDivisionLabel(division) {
  switch (division) {
    case "solo":
      return "Solo";
    case "duotrio":
      return "Duo/Trio";
    case "groups":
      return "Group";
    default:
      return "Leaderboard";
  }
}

function ordinal(n) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}