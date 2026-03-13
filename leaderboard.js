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
    const response = await fetch(`${LEADERS_FILE}?t=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    leadersData = await response.json();

    updateHeader();
    renderDivision();
  } catch (error) {
    console.error("Failed to load leaders.json:", error);

    const lastUpdate = document.getElementById("lastUpdate");
    const publishVersion = document.getElementById("publishVersion");
    const divisionTitle = document.getElementById("divisionTitle");
    const sponsorLogo = document.getElementById("sponsorLogo");

    if (lastUpdate) {
      lastUpdate.textContent = "Last Update: unable to load leaderboard data";
    }

    if (publishVersion) {
      publishVersion.textContent = "";
    }

    if (divisionTitle) {
      divisionTitle.textContent = "Leaderboard";
    }

    if (sponsorLogo) {
      sponsorLogo.hidden = true;
      sponsorLogo.removeAttribute("src");
    }

    renderEmptyCards();
  }
}

function updateHeader() {
  const eventTitle = document.getElementById("eventTitle");
  const lastUpdate = document.getElementById("lastUpdate");
  const publishVersion = document.getElementById("publishVersion");

  if (eventTitle) {
    eventTitle.textContent = firstNonEmpty(
      leadersData?.event_title,
      "Inspirations of Dance 2026"
    );
  }

  if (lastUpdate) {
    const updated = firstNonEmpty(
      leadersData?.updated_at,
      leadersData?.updated,
      leadersData?.last_update
    );
    lastUpdate.textContent = updated ? `Last Update: ${updated}` : "Last Update:";
  }

  if (publishVersion) {
    const version = firstNonEmpty(leadersData?.publish_version);
    publishVersion.textContent = version ? `Publish version: ${version}` : "";
  }
}

function renderDivision() {
  const divisionTitle = document.getElementById("divisionTitle");
  const board = getBoard(currentDivision);

  if (divisionTitle) {
    divisionTitle.textContent = board?.title
      ? `${board.title} Leaderboard`
      : "Leaderboard";
  }

  updateSponsorLogo(board);

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

  const division = board.divisions.find(
    (item) => normalizeText(item?.name) === normalizeText(divisionName)
  );

  if (!division || !Array.isArray(division.places)) {
    return [];
  }

  return division.places;
}

function updateSponsorLogo(board) {
  const sponsorLogo = document.getElementById("sponsorLogo");
  if (!sponsorLogo) {
    return;
  }

  const sponsorValue = firstNonEmpty(board?.sponsor_logo);

  if (!sponsorValue) {
    sponsorLogo.hidden = true;
    sponsorLogo.removeAttribute("src");
    return;
  }

  sponsorLogo.src = resolveSponsorPath(sponsorValue);
  sponsorLogo.alt = `${board?.title || "Board"} sponsor logo`;
  sponsorLogo.hidden = false;
}

function resolveSponsorPath(value) {
  const trimmed = String(value || "").trim();

  if (
    trimmed.startsWith("img/") ||
    trimmed.startsWith("./img/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  return `img/${trimmed}`;
}

function renderLevelCard(cardId, levelTitle, places) {
  const card = document.getElementById(cardId);
  if (!card) {
    return;
  }

  let html = `<h3>${escapeHtml(levelTitle)}</h3>`;

  for (let placeNumber = 1; placeNumber <= 5; placeNumber += 1) {
    const items = Array.isArray(places[placeNumber - 1]) ? places[placeNumber - 1] : [];
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