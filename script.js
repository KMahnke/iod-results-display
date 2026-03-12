let pageData = null;
let activeTab = null;

const DAY_TABS = ["Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_ALIASES = {
  wed: "Wed",
  wednesday: "Wed",
  thu: "Thu",
  thur: "Thu",
  thurs: "Thu",
  thursday: "Thu",
  fri: "Fri",
  friday: "Fri",
  sat: "Sat",
  saturday: "Sat",
  sun: "Sun",
  sunday: "Sun"
};

function getDayShortLabel(dayLabel) {
  if (!dayLabel) return "";

  const normalized = String(dayLabel).trim().toLowerCase();

  const firstWord = normalized
    .replace(/,/g, " ")
    .split(/\s+/)
    .find(Boolean) || "";

  if (DAY_ALIASES[firstWord]) {
    return DAY_ALIASES[firstWord];
  }

  for (const [key, value] of Object.entries(DAY_ALIASES)) {
    if (normalized.startsWith(key)) {
      return value;
    }
  }

  return "";
}

function getCategoriesForTab(tabLabel) {
  if (!pageData || !Array.isArray(pageData.categories)) return [];
  return pageData.categories.filter((category) => {
    return getDayShortLabel(category.day_label) === tabLabel;
  });
}

async function loadResults() {
  try {
    const response = await fetch("data/results.json?" + Date.now(), { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} loading results.json`);
    }

    pageData = await response.json();

    document.getElementById("eventTitle").textContent = pageData.event || "Results";
    document.getElementById("lastUpdate").textContent =
      `Last updated: ${pageData.last_update || ""}`;

    if (!activeTab) {
      activeTab = DAY_TABS.find((day) => getCategoriesForTab(day).length > 0) || "awards";
    }

    renderTabs();
    renderContent();
  } catch (err) {
    console.error("Failed to load results:", err);

    const content = document.getElementById("content");
    if (content) {
      content.innerHTML = `
        <div class="group-card">
          <h2>Unable to load results</h2>
          <div class="group-subtitle">${escapeHtml(err.message || String(err))}</div>
        </div>
      `;
    }
  }
}

function renderTabs() {
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";

  DAY_TABS.forEach((dayLabel) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (activeTab === dayLabel ? " active" : "");

    if (getCategoriesForTab(dayLabel).length === 0) {
      btn.className += " tab-btn-empty";
    }

    btn.textContent = dayLabel;
    btn.onclick = () => {
      activeTab = dayLabel;
      renderTabs();
      renderContent();
    };

    tabs.appendChild(btn);
  });

  const awardsBtn = document.createElement("button");
  awardsBtn.className = "tab-btn" + (activeTab === "awards" ? " active" : "");
  awardsBtn.textContent = "Awards";
  awardsBtn.onclick = () => {
    activeTab = "awards";
    renderTabs();
    renderContent();
  };
  tabs.appendChild(awardsBtn);
}

function renderContent() {
  const content = document.getElementById("content");
  content.innerHTML = "";

  if (!pageData) {
    const empty = document.createElement("div");
    empty.className = "group-card";
    empty.innerHTML = `<h2>Loading results...</h2>`;
    content.appendChild(empty);
    return;
  }

  if (activeTab === "awards") {
    const awardsCard = document.createElement("div");
    awardsCard.className = "awards-card";
    awardsCard.innerHTML = "<h2>Awards</h2>";

    const awards = pageData.awards || [];
    if (!awards.length) {
      const p = document.createElement("p");
      p.textContent = "No awards posted yet.";
      awardsCard.appendChild(p);
    } else {
      const ul = document.createElement("ul");
      awards.forEach((a) => {
        const li = document.createElement("li");
        li.textContent = `${a.award} — #${a.entry} "${a.title}"`;
        ul.appendChild(li);
      });
      awardsCard.appendChild(ul);
    }

    content.appendChild(awardsCard);
    return;
  }

  const categories = getCategoriesForTab(activeTab);

  if (!categories.length) {
    const empty = document.createElement("div");
    empty.className = "group-card";
    empty.innerHTML = `<h2>No published categories for ${escapeHtml(activeTab)}.</h2>`;
    content.appendChild(empty);
    return;
  }

  categories.forEach((category) => {
    const card = document.createElement("div");
    card.className = "group-card";
    card.id = "cat-" + category.category_id;

    const title = document.createElement("h2");
    title.textContent = category.category_name;
    card.appendChild(title);

    const sub = document.createElement("div");
    sub.className = "group-subtitle";
    sub.textContent = `${category.day_label} • ${category.session_label}`;
    card.appendChild(sub);

    const table = document.createElement("table");
    table.className = "results-table";
    table.innerHTML = `
      <colgroup>
        <col class="col-entry">
        <col class="col-place">
        <col class="col-gem">
        <col class="col-title">
        <col class="col-studio">
      </colgroup>
      <thead>
        <tr>
          <th>Entry</th>
          <th>Place</th>
          <th>Gem</th>
          <th>Title</th>
          <th>Studio</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    const rows = (Array.isArray(category.results) && category.results.length)
      ? category.results
      : (Array.isArray(category.entries) ? category.entries : []).map((e) => ({
          entry: e.entry,
          display_place: "",
          gem: "",
          title: e.title,
          studio: e.studio
        }));

    rows.forEach((r) => {
      const row = document.createElement("tr");
      row.dataset.entry = String(r.entry || "");

      row.innerHTML = `
        <td class="cell-entry">${escapeHtml(r.entry || "")}</td>
        <td class="cell-place">${escapeHtml(r.display_place || "")}</td>
        <td class="cell-gem">${escapeHtml(r.gem || "")}</td>
        <td class="cell-title">${escapeHtml(r.title || "")}</td>
        <td class="cell-studio">${escapeHtml(r.studio || "")}</td>
      `;

      tbody.appendChild(row);
    });

    card.appendChild(table);
    content.appendChild(card);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function searchEntry() {
  const searchValue = document.getElementById("entrySearch").value.trim();
  if (!searchValue || !pageData) return;

  document.querySelectorAll(".highlight").forEach((el) => {
    el.classList.remove("highlight");
  });

  for (const category of (pageData.categories || [])) {
    const searchPool = [
      ...(category.results || []),
      ...(category.entries || [])
    ];

    const found = searchPool.find(
      (r) => String(r.entry) === String(searchValue)
    );

    if (found) {
      activeTab = getDayShortLabel(category.day_label);
      renderTabs();
      renderContent();

      setTimeout(() => {
        const groupCard = document.getElementById("cat-" + category.category_id);
        const row = groupCard?.querySelector(`tr[data-entry="${CSS.escape(String(found.entry))}"]`);

        if (groupCard) {
          groupCard.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        if (row) {
          row.classList.add("highlight");
        }
      }, 50);

      return;
    }
  }

  alert(`Entry ${searchValue} was not found.`);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("searchBtn").addEventListener("click", searchEntry);
  document.getElementById("entrySearch").addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchEntry();
  });

  loadResults();
  setInterval(loadResults, 10000);
});
