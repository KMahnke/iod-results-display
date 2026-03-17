document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("awardsContainer");

  // Detect mode based on page
  const isPublishedPage = window.location.pathname.includes("awards.html");

  const dataFile = isPublishedPage
    ? "data/published_awards.json"
    : "data/awards.json";

  fetch(dataFile)
    .then((res) => res.json())
    .then((data) => {
      renderList(container, data);
    })
    .catch((err) => {
      console.error("Error loading awards:", err);
      container.innerHTML = "<p>Error loading awards</p>";
    });
});

function renderList(container, data) {
  container.innerHTML = "";

  // Handle both structures safely
  let items = [];

  if (Array.isArray(data)) {
    items = data;
  } else if (data.awards) {
    items = data.awards;
  } else if (data.items) {
    items = data.items;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "award-card";

    card.innerHTML = `
      <div class="award-title">${item.award || item.title || ""}</div>
      <div class="award-meta">
        ${item.level || ""} ${item.style || ""} ${item.type || ""}
      </div>
    `;

    container.appendChild(card);
  });
}