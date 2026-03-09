let pageData = null;
let activeTab = null;

const DAY_TABS = ["Wed", "Thu", "Fri", "Sat", "Sun"];

function getDayShortLabel(dayLabel) {
  if (!dayLabel) return "";
  const short = String(dayLabel).split(",")[0].trim();
  return short;
}

function getCategoriesForTab(tabLabel) {
  if (!pageData || !pageData.categories) return [];

  return pageData.categories.filter((category) => {
    return getDayShortLabel(category.day_label) === tabLabel;
  });
}

async function loadResults() {
  try {
    const response = await fetch("data/results.json?" + Date.now());
    pageData = await response.json();

    document.getElementById("eventTitle").textContent = pageData.event || "Results";
    document.getElementById("lastUpdate").textContent =
      `Last updated: ${pageData.last_update || ""}`;

    if (!activeTab) {
      const firstAvailable =
        DAY_TABS.find((day) => getCategoriesForTab(day).length > 0) || "Wed";
      activeTab = firstAvailable;
    }

    renderTabs();
    renderContent();
  } catch (err) {
    console.error("Failed to load results:", err);
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
    empty.innerHTML = `<h2>No published categories for ${activeTab}.</h2>`;
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
        <col class="col-place">
        <col class="col-entry">
        <col class="col-title">
        <col class="col-studio">
      </colgroup>
      <thead>
        <tr>
          <th>Place</th>
          <th>Entry</th>
          <th>Title</th>
          <th>Studio</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    const rows = (category.results && category.results.length)
      ? category.results
      : (category.entries || []).map(e => ({
          display_place: "",
          entry: e.entry,
          title: e.title,
          studio: e.studio
        }));

    rows.forEach((r) => {
      const row = document.createElement("tr");
      row.dataset.entry = r.entry;
      row.innerHTML = `
        <td>${r.display_place || ""}</td>
        <td>${r.entry || ""}</td>
        <td>${r.title || ""}</td>
        <td>${r.studio || ""}</td>
      `;
      tbody.appendChild(row);
    });

    card.appendChild(table);
    content.appendChild(card);
  });
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
        const row = groupCard?.querySelector(`tr[data-entry="${found.entry}"]`);

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
