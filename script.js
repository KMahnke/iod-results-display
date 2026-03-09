let pageData = null;
let activeTab = null;

async function loadResults() {
  try {
    const response = await fetch("data/results.json?" + Date.now());
    pageData = await response.json();

    document.getElementById("eventTitle").textContent = pageData.event || "Results";
    document.getElementById("lastUpdate").textContent =
      `Last updated: ${pageData.last_update || ""}`;

    const dayLabels = [...new Set((pageData.categories || []).map(c => c.day_label))];

    if (!activeTab) {
      activeTab = dayLabels[0] || "awards";
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

  const dayLabels = [...new Set((pageData.categories || []).map(c => c.day_label))];

  dayLabels.forEach((dayLabel) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (activeTab === dayLabel ? " active" : "");
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

  const categories = (pageData.categories || []).filter(
    (c) => c.day_label === activeTab
  );

  if (!categories.length) {
    const empty = document.createElement("div");
    empty.className = "group-card";
    empty.innerHTML = "<h2>No categories found for this day.</h2>";
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
    sub.textContent = `${category.session_label}`;
    card.appendChild(sub);

    const table = document.createElement("table");
    table.innerHTML = `
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
      activeTab = category.day_label;
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
