const AWARDS_FILE = "data/awards.json";
const DISPLAY_TIME_ZONE = "America/Regina";
const DISPLAY_LOCALE = "en-CA";

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
  }
];

const FALLBACK_SPONSOR_LOGOS = {
  excellence_in_dance: "img/oilwomen.png",
  another_round_of_applause: "img/anotherround.jpeg",
  smile_award: "img/liquorspot.PNG"
};

let awardsData = null;

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

  if (leaderboardLink) {
    leaderboardLink.href = `leaderboard.html${qs}`;
  }

  if (resultsLink) {
    resultsLink.href = `index.html${qs}`;
  }
}

async function loadAwards() {
  try {
    const response = await fetch(`${AWARDS_FILE}?t=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    awardsData = await response.json();

    updateHeader();
    renderAwards();
  } catch (error) {
    console.error("Unable to load awards.json:", error);
    renderAwardsErrorState();
  }
}

function updateHeader() {
  const eventTitle = document.getElementById("eventTitle");
  const lastUpdate = document.getElementById("lastUpdate");
  const publishVersion = document.getElementById("publishVersion");
  const headerSponsorLogo = document.getElementById("headerSponsorLogo");

  if (eventTitle) {
    eventTitle.textContent = firstNonEmpty(awardsData?.event, "Session Awards");
  }

  if (lastUpdate) {
    lastUpdate.textContent = buildLastUpdateText(awardsData);
  }

  if (publishVersion) {
    publishVersion.textContent = "";
  }

  if (headerSponsorLogo) {
    const firstAwardWithLogo = getNormalizedAwards().find((award) => award.logo);
    if (firstAwardWithLogo && firstAwardWithLogo.logo) {
      headerSponsorLogo.src = firstAwardWithLogo.logo;
      headerSponsorLogo.alt = `${firstAwardWithLogo.title} sponsor logo`;
      headerSponsorLogo.hidden = false;
    } else {
      headerSponsorLogo.hidden = true;
      headerSponsorLogo.removeAttribute("src");
    }
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
    normalizeLegacyAward("smile_award", awardsData.smile, "Smile Award")
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
    return award.winners.map((winner) => ({
      num: firstNonEmpty(winner?.entry, winner?.num),
      title: firstNonEmpty(winner?.title),
      studio: firstNonEmpty(winner?.studio)
    }));
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

  return winners.map((winner) => ({
    num: firstNonEmpty(winner?.num, winner?.entry),
    title: firstNonEmpty(winner?.title),
    studio: firstNonEmpty(winner?.studio)
  }));
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
  const publishVersion = document.getElementById("publishVersion");
  const headerSponsorLogo = document.getElementById("headerSponsorLogo");

  if (eventTitle) {
    eventTitle.textContent = "Session Awards";
  }

  if (lastUpdate) {
    lastUpdate.textContent = "Last updated: unable to load awards data";
  }

  if (publishVersion) {
    publishVersion.textContent = "";
  }

  if (headerSponsorLogo) {
    headerSponsorLogo.hidden = true;
    headerSponsorLogo.removeAttribute("src");
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

function formatZonedDateToRegina(value) {
  if (!value) {
    return "";
  }

  const date = new Date(String(value).trim());
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short"
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute} ${map.dayPeriod} ${map.timeZoneName}`;
}

function buildLastUpdateText(data) {
  const zonedValue =
    data?.publish_version ||
    data?.updated_at ||
    data?.updated ||
    data?.last_update ||
    "";

  const formattedZoned = formatZonedDateToRegina(zonedValue);
  if (formattedZoned) {
    return `Last updated: ${formattedZoned}`;
  }

  const fallback =
    data?.last_update ||
    data?.updated_at ||
    data?.updated ||
    "";

  return fallback ? `Last updated: ${fallback}` : "Last updated:";
}

function resolveSponsorPath(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

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