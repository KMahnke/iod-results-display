const AWARDS_FILE = "data/awards.json";
const PUBLISHED_AWARDS_FILE = "data/published_awards.json";
const DISPLAY_TIME_ZONE = "America/Regina";
const DISPLAY_LOCALE = "en-CA";

const PAGE_MODE = document.body?.dataset?.awardsMode === "published" ? "published" : "session";

const AWARD_SLOT_CONFIG = [
  {
    slotId: "excellence",
    key: "excellence_in_dance",
    title: "Excellence in Dance"
  },
  {
    slotId: "applause",
    key: "another_round_of_applause",
    title: "Another Round of Applause"
  },
  {
    slotId: "smile",
    key: "smile_award",
    title: "Smile Award"
  },
  {
    slotId: "full-throttle",
    key: "full_throttle",
    title: "Full Throttle"
  },
  {
    slotId: "choreography",
    key: "choreography",
    title: "Choreography"
  }
];

const FALLBACK_SPONSOR_LOGOS = {
  excellence_in_dance: "img/oilwomen.png",
  another_round_of_applause: "img/anotherround.jpeg",
  smile_award: "img/liquorspot.PNG",
  full_throttle: "img/barber.png",
  choreography: ""
};

const FULL_AWARD_SECTIONS = ["Solos", "Duo/Trio", "Groups", "Special Awards"];
const PUBLISHED_AWARD_SECTIONS = ["Solos", "Duo/Trios", "Groups", "Special Awards/Scholarships"];

let awardsData = null;
let publishedAwardsData = null;

document.addEventListener("DOMContentLoaded", () => {
  applyQueryStringToLinks();
  loadAwards();
  setInterval(loadAwards, 10000);
});

function getQueryString() {
  return window.location.search || "";
}

function applyQueryStringToLinks() {
  const qs = getQueryString();
  const leaderboardLink = document.getElementById("leaderboardLink");
  const resultsLink = document.getElementById("resultsLink");
  const tabLinks = document.querySelectorAll('.tab-row a[href$=".html"]');

  if (leaderboardLink) {
    leaderboardLink.href = `leaderboard.html${qs}`;
  }

  if (resultsLink) {
    resultsLink.href = `index.html${qs}`;
  }

  tabLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href.endsWith(".html")) {
      link.href = `${href}${qs}`;
    }
  });
}

async function loadAwards() {
  try {
    const cacheBust = Date.now();

    if (PAGE_MODE === "published") {
      const publishedResponse = await fetch(`${PUBLISHED_AWARDS_FILE}?t=${cacheBust}`, { cache: "no-store" });
      if (!publishedResponse.ok) {
        throw new Error(`HTTP ${publishedResponse.status}`);
      }

      publishedAwardsData = await publishedResponse.json();
      awardsData = null;

      updateHeader();
      renderPublishedAwardsList();
      return;
    }

    const sessionResponse = await fetch(`${AWARDS_FILE}?t=${cacheBust}`, { cache: "no-store" });
    if (!sessionResponse.ok) {
      throw new Error(`HTTP ${sessionResponse.status}`);
    }

    awardsData = await sessionResponse.json();
    publishedAwardsData = null;

    updateHeader();
    renderAwards();
    renderFullAwardsList();
  } catch (error) {
    console.error("Unable to load awards data:", error);

    if (PAGE_MODE === "published") {
      renderPublishedAwardsErrorState();
    } else {
      renderAwardsErrorState();
      renderFullAwardsErrorState();
    }
  }
}

function updateHeader() {
  const eventTitle = document.getElementById("eventTitle");
  const lastUpdate = document.getElementById("lastUpdate");

  if (eventTitle) {
    if (PAGE_MODE === "published") {
      eventTitle.textContent = firstNonEmpty(publishedAwardsData?.event, "Published Awards");
    } else {
      eventTitle.textContent = firstNonEmpty(awardsData?.event, "Session Awards");
    }
  }

  if (lastUpdate) {
    lastUpdate.textContent = PAGE_MODE === "published"
      ? buildLastUpdateText(publishedAwardsData)
      : buildLastUpdateText(awardsData);
  }
}

function renderAwards() {
  const normalizedAwards = getNormalizedAwards();

  AWARD_SLOT_CONFIG.forEach((config) => {
    const award =
      normalizedAwards.find((item) => item.key === config.key) ||
      {
        key: config.key,
        title: config.title,
        logo: "",
        winners: []
      };

    renderAward(config.slotId, award);
  });
}

function getNormalizedAwards() {
  if (!awardsData || typeof awardsData !== "object") {
    return [];
  }

  if (Array.isArray(awardsData.awards)) {
    return awardsData.awards.map((award, index) => normalizeAwardFromArray(award, index));
  }

  return [
    normalizeLegacyAward("excellence_in_dance", awardsData.excellence, "Excellence in Dance"),
    normalizeLegacyAward("another_round_of_applause", awardsData.applause, "Another Round of Applause"),
    normalizeLegacyAward("smile_award", awardsData.smile, "Smile Award"),
    normalizeLegacyAward("full_throttle", awardsData.full_throttle, "Full Throttle"),
    normalizeLegacyAward("choreography", awardsData.choreography, "Choreography")
  ].filter(Boolean);
}

function normalizeAwardFromArray(award, index) {
  const fallbackConfig = AWARD_SLOT_CONFIG[index] || null;
  const key = firstNonEmpty(award?.award_key, fallbackConfig?.key);
  const title = firstNonEmpty(award?.award_title, fallbackConfig?.title, "Award");
  const logo = resolveSponsorPath(
    firstNonEmpty(
      award?.sponsor_logo,
      FALLBACK_SPONSOR_LOGOS[key]
    )
  );

  const winners = normalizeWinners(award);

  return {
    key,
    title,
    logo,
    winners
  };
}

function normalizeLegacyAward(key, award, fallbackTitle) {
  if (!award) {
    return {
      key,
      title: fallbackTitle,
      logo: resolveSponsorPath(firstNonEmpty(FALLBACK_SPONSOR_LOGOS[key])),
      winners: []
    };
  }

  return {
    key,
    title: firstNonEmpty(award?.title, fallbackTitle),
    logo: resolveSponsorPath(
      firstNonEmpty(
        award?.logo,
        award?.sponsor_logo,
        FALLBACK_SPONSOR_LOGOS[key]
      )
    ),
    winners: normalizeLegacyWinners(award?.winners)
  };
}

function normalizeWinners(award) {
  if (Array.isArray(award?.winners) && award.winners.length > 0) {
    return [...award.winners]
      .map((winner) => ({
        num: firstNonEmpty(winner?.entry, winner?.num),
        title: firstNonEmpty(winner?.title),
        studio: firstNonEmpty(winner?.studio)
      }))
      .sort((a, b) => Number(a?.num || 999999) - Number(b?.num || 999999));
  }

  const winnerText = firstNonEmpty(award?.winner_text);
  if (!winnerText) {
    return [];
  }

  return winnerText
    .split(" • ")
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .reduce((rows, value, index, arr) => {
      if (value.startsWith("#")) {
        const next = arr[index + 1] || "";
        const match = value.match(/^#\s*(\d+)\s*(.*)$/);

        rows.push({
          num: match ? match[1] : "",
          title: match ? match[2].trim() : value.replace(/^#\s*/, "").trim(),
          studio: next && !next.startsWith("#") ? next : ""
        });
      }
      return rows;
    }, []);
}

function normalizeLegacyWinners(winners) {
  if (!Array.isArray(winners)) {
    return [];
  }

  return winners
    .map((winner) => ({
      num: firstNonEmpty(winner?.num, winner?.entry),
      title: firstNonEmpty(winner?.title),
      studio: firstNonEmpty(winner?.studio)
    }))
    .sort((a, b) => Number(a?.num || 999999) - Number(b?.num || 999999));
}

function renderAward(slotId, award) {
  const titleEl = document.getElementById(`title-${slotId}`);
  const logoEl = document.getElementById(`logo-${slotId}`);
  const winnersEl = document.getElementById(`winners-${slotId}`);

  if (titleEl) {
    titleEl.textContent = firstNonEmpty(award?.title, "Award");
  }

  if (logoEl) {
    if (award?.logo) {
      logoEl.src = award.logo;
      logoEl.alt = `${award.title || "Award"} sponsor logo`;
      logoEl.hidden = false;
    } else {
      logoEl.hidden = true;
      logoEl.removeAttribute("src");
    }
  }

  if (!winnersEl) {
    return;
  }

  winnersEl.innerHTML = "";

  if (!Array.isArray(award?.winners) || award.winners.length === 0) {
    winnersEl.innerHTML = `<div class="award-empty">Winner to be announced</div>`;
    return;
  }

  award.winners.forEach((winner) => {
    const row = document.createElement("div");
    row.className = "award-row";

    row.innerHTML = `
      <div class="award-num">${escapeHtml(firstNonEmpty(winner?.num))}</div>
      <div class="award-val">${escapeHtml(buildWinnerText(winner))}</div>
    `;

    winnersEl.appendChild(row);
  });
}

function renderFullAwardsList() {
  const cardEl = document.getElementById("fullAwardsCard");
  const sectionsEl = document.getElementById("fullAwardsSections");

  if (!cardEl || !sectionsEl) {
    return;
  }

  const fullAwards = Array.isArray(awardsData?.full_awards) ? awardsData.full_awards : [];

  if (!fullAwards.length) {
    cardEl.hidden = true;
    sectionsEl.innerHTML = "";
    return;
  }

  const grouped = {};
  FULL_AWARD_SECTIONS.forEach((section) => {
    grouped[section] = [];
  });

  fullAwards.forEach((award) => {
    const section = grouped[award?.section] ? award.section : "Special Awards";
    grouped[section].push(award);
  });

  const html = FULL_AWARD_SECTIONS.map((section) => {
    const rows = grouped[section] || [];
    const itemsHtml = rows.map((award) => {
      const winnerText = buildFullAwardWinnerText(award?.winner);
      return `
        <li class="full-award-item">
          <div class="full-award-name">${escapeHtml(firstNonEmpty(award?.award, "Award"))}</div>
          <div class="full-award-winner ${winnerText ? "" : "is-empty"}">${escapeHtml(winnerText || "Winner to be announced")}</div>
        </li>
      `;
    }).join("");

    return `
      <section class="full-award-section">
        <h3>${escapeHtml(section)}</h3>
        <ul class="full-award-list">
          ${itemsHtml || '<li class="full-award-item"><div class="full-award-winner is-empty">No awards in this section.</div></li>'}
        </ul>
      </section>
    `;
  }).join("");

  sectionsEl.innerHTML = html;
  cardEl.hidden = false;
}

function renderPublishedAwardsList() {
  const cardEl = document.getElementById("publishedAwardsCard");
  const sectionsEl = document.getElementById("publishedAwardsSections");

  if (!cardEl || !sectionsEl) {
    return;
  }

  const fullAwards = Array.isArray(publishedAwardsData?.full_awards)
    ? publishedAwardsData.full_awards
    : [];

  if (!fullAwards.length) {
    cardEl.hidden = true;
    sectionsEl.innerHTML = "";
    return;
  }

  const grouped = {};
  PUBLISHED_AWARD_SECTIONS.forEach((section) => {
    grouped[section] = [];
  });

  fullAwards.forEach((award) => {
    const normalizedSection = normalizePublishedSectionName(firstNonEmpty(award?.section));
    const section = grouped[normalizedSection] ? normalizedSection : "Special Awards/Scholarships";
    grouped[section].push(award);
  });

  const html = PUBLISHED_AWARD_SECTIONS.map((section) => {
    const rows = grouped[section] || [];
    const itemsHtml = rows
      .map((award) => {
        const winnerText = buildPublishedAwardWinnerText(award?.winner);
        return `
          <li class="full-award-item">
            <div class="full-award-name">${escapeHtml(firstNonEmpty(award?.award, "Award"))}</div>
            <div class="full-award-winner ${winnerText ? "" : "is-empty"}">${escapeHtml(
              winnerText || "Winner to be announced"
            )}</div>
          </li>
        `;
      })
      .join("");

    return `
      <section class="full-award-section">
        <h3>${escapeHtml(section)}</h3>
        <ul class="full-award-list">
          ${
            itemsHtml ||
            '<li class="full-award-item"><div class="full-award-winner is-empty">No awards in this section.</div></li>'
          }
        </ul>
      </section>
    `;
  }).join("");

  sectionsEl.innerHTML = html;
  cardEl.hidden = false;
}

function normalizePublishedSectionName(value) {
  const text = String(value || "").trim();
  const lower = text.toLowerCase();

  if (!lower) {
    return "Special Awards/Scholarships";
  }

  if (lower.includes("solo")) {
    return "Solos";
  }

  if (lower.includes("duo") || lower.includes("trio")) {
    return "Duo/Trios";
  }

  if (lower.includes("group")) {
    return "Groups";
  }

  if (lower.includes("scholar")) {
    return "Special Awards/Scholarships";
  }

  if (lower.includes("special")) {
    return "Special Awards/Scholarships";
  }

  return "Special Awards/Scholarships";
}

function buildPublishedAwardWinnerText(winner) {
  if (!winner || typeof winner !== "object") {
    return "";
  }

  const displayText = firstNonEmpty(winner?.display_text);
  if (displayText) {
    return displayText;
  }

  return buildFullAwardWinnerText(winner);
}

function buildFullAwardWinnerText(winner) {
  if (!winner || typeof winner !== "object") {
    return "";
  }

  const entry = firstNonEmpty(winner?.entry);
  const title = firstNonEmpty(winner?.title);
  const lastNames = Array.isArray(winner?.dance_last_names)
    ? winner.dance_last_names.map((value) => String(value || "").trim()).filter(Boolean)
    : [];

  let text = "";

  if (entry && title) {
    text = `${entry} - ${title}`;
  } else if (entry || title) {
    text = entry || title;
  }

  if (lastNames.length) {
    text += `${text ? " - " : ""}${lastNames.join(", ")}`;
  }

  return text;
}

function buildWinnerText(winner) {
  const title = firstNonEmpty(winner?.title);
  const studio = firstNonEmpty(winner?.studio);

  if (title && studio) {
    return `${title} • ${studio}`;
  }

  return title || studio || "";
}

function renderAwardsErrorState() {
  const eventTitle = document.getElementById("eventTitle");
  const lastUpdate = document.getElementById("lastUpdate");

  if (eventTitle) {
    eventTitle.textContent = "Session Awards";
  }

  if (lastUpdate) {
    lastUpdate.textContent = "Last updated: unable to load session awards data";
  }

  AWARD_SLOT_CONFIG.forEach((config) => {
    renderAward(config.slotId, {
      key: config.key,
      title: config.title,
      logo: resolveSponsorPath(FALLBACK_SPONSOR_LOGOS[config.key]),
      winners: []
    });
  });
}

function renderFullAwardsErrorState() {
  const cardEl = document.getElementById("fullAwardsCard");
  const sectionsEl = document.getElementById("fullAwardsSections");

  if (!cardEl || !sectionsEl) {
    return;
  }

  cardEl.hidden = true;
  sectionsEl.innerHTML = "";
}

function renderPublishedAwardsErrorState() {
  const eventTitle = document.getElementById("eventTitle");
  const lastUpdate = document.getElementById("lastUpdate");
  const cardEl = document.getElementById("publishedAwardsCard");
  const sectionsEl = document.getElementById("publishedAwardsSections");

  if (eventTitle) {
    eventTitle.textContent = "Published Awards";
  }

  if (lastUpdate) {
    lastUpdate.textContent = "Last updated: unable to load published awards data";
  }

  if (!cardEl || !sectionsEl) {
    return;
  }

  cardEl.hidden = true;
  sectionsEl.innerHTML = "";
}

function formatZonedDateToRegina(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
}

function buildLastUpdateText(data) {
  const lastUpdateValue = firstNonEmpty(data?.last_update, data?.updated_at, data?.publish_version);
  if (!lastUpdateValue) {
    return "Last updated:";
  }

  return `Last updated: ${formatZonedDateToRegina(lastUpdateValue)}`;
}

function resolveSponsorPath(value) {
  const path = firstNonEmpty(value);
  if (!path) {
    return "";
  }

  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) {
    return path;
  }

  if (path.startsWith("./") || path.startsWith("../") || path.startsWith("img/")) {
    return path;
  }

  return `img/${path.replace(/^\/+/, "")}`;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }

    const text = String(value).trim();
    if (text !== "") {
      return text;
    }
  }

  return "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}