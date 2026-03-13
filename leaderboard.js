let resultsData = null;
let currentType = "solo";

async function loadResults() {

    const res = await fetch("data/results.json?" + Date.now());
    resultsData = await res.json();

    if (resultsData.last_update) {
        document.getElementById("lastUpdate").innerText =
            "Last Update: " + resultsData.last_update;
    }

    renderBoards();
}


function routineType(cat) {

    const c = cat.toLowerCase();

    if (c.includes("solo")) return "solo";
    if (c.includes("duo") || c.includes("trio")) return "duotrio";
    return "group";
}


function levelType(cat) {

    const c = cat.toLowerCase();

    if (c.includes("beginner")) return "beginner";
    if (c.includes("novice")) return "novice";
    return "competitive";
}


function renderBoards() {

    document.getElementById("beginnerBoard").innerHTML = "";
    document.getElementById("noviceBoard").innerHTML = "";
    document.getElementById("competitiveBoard").innerHTML = "";

    const beginner = [];
    const novice = [];
    const competitive = [];

    resultsData.categories.forEach(cat => {

        if (routineType(cat.category) !== currentType) return;

        cat.results.forEach(r => {

            if (!r.place) return;
            if (r.place > 3) return;

            const level = levelType(cat.category);

            const entry = {

                place: r.place,
                text: `${r.title} — ${r.studio}`

            };

            if (level === "beginner") beginner.push(entry);
            else if (level === "novice") novice.push(entry);
            else competitive.push(entry);

        });

    });

    beginner.sort((a,b)=>a.place-b.place);
    novice.sort((a,b)=>a.place-b.place);
    competitive.sort((a,b)=>a.place-b.place);

    drawBoard("beginnerBoard", beginner);
    drawBoard("noviceBoard", novice);
    drawBoard("competitiveBoard", competitive);
}


function drawBoard(id, data) {

    const board = document.getElementById(id);

    data.forEach(r => {

        const row = document.createElement("div");
        row.className = "place-row";

        const place = document.createElement("div");
        place.className = "place-num";
        place.innerText = r.place + "st".replace("1st","1st").replace("2st","2nd").replace("3st","3rd");

        const val = document.createElement("div");
        val.className = "place-val";
        val.innerText = r.text;

        row.appendChild(place);
        row.appendChild(val);

        board.appendChild(row);

    });

}


document.querySelectorAll(".tab-btn").forEach(btn => {

    btn.onclick = () => {

        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        currentType = btn.dataset.type;

        const title = currentType === "solo"
            ? "Solo Leaderboard"
            : currentType === "duotrio"
            ? "Duo/Trio Leaderboard"
            : "Group Leaderboard";

        document.getElementById("boardTitle").innerText = title;

        renderBoards();

    };

});


loadResults();

setInterval(loadResults, 15000);