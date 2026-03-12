let pageData = null;
let activeTab = null;

const DAY_TABS = ["Wed","Thu","Fri","Sat","Sun"];

const DAY_ALIASES = {
wed:"Wed",
wednesday:"Wed",
thu:"Thu",
thur:"Thu",
thurs:"Thu",
thursday:"Thu",
fri:"Fri",
friday:"Fri",
sat:"Sat",
saturday:"Sat",
sun:"Sun",
sunday:"Sun"
};

function getDayShortLabel(dayLabel) {
  if (!dayLabel) return "";

  const raw = String(dayLabel).trim();
  const firstPart = raw.split(",")[0].trim();
  const firstWord = firstPart.split(/\s+/)[0].toLowerCase();

  const map = {
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
    wed: "Wed",
    thu: "Thu",
    thur: "Thu",
    thurs: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun"
  };

  return map[firstWord] || firstPart;
}

function getCategoriesForTab(tab){
if(!pageData || !Array.isArray(pageData.categories)) return [];

return pageData.categories.filter(c=>{
return getDayShortLabel(c.day_label) === tab;
});
}

async function loadResults(){

try{

```
const response = await fetch("data/results.json?"+Date.now(),{cache:"no-store"});
pageData = await response.json();

document.getElementById("eventTitle").textContent =
  pageData.event || "Results";

document.getElementById("lastUpdate").textContent =
  "Last updated: "+(pageData.last_update || "");

if(!activeTab){

  activeTab = DAY_TABS.find(d=>{
    return getCategoriesForTab(d).length > 0;
  }) || "Wed";

}

renderTabs();
renderContent();
```

}catch(err){

```
console.error(err);

const content=document.getElementById("content");

content.innerHTML=
  "<div class='group-card'><h2>Unable to load results</h2></div>";
```

}

}

function renderTabs(){

const tabs=document.getElementById("tabs");
tabs.innerHTML="";

DAY_TABS.forEach(day=>{

```
const btn=document.createElement("button");

btn.className="tab-btn"+(activeTab===day?" active":"");

if(getCategoriesForTab(day).length===0){
  btn.className+=" tab-btn-empty";
}

btn.textContent=day;

btn.onclick=()=>{
  activeTab=day;
  renderTabs();
  renderContent();
};

tabs.appendChild(btn);
```

});

}

function renderContent(){

const content=document.getElementById("content");
content.innerHTML="";

const categories=getCategoriesForTab(activeTab);

if(!categories.length){

```
const empty=document.createElement("div");
empty.className="group-card";
empty.innerHTML="<h2>No results yet</h2>";

content.appendChild(empty);

return;
```

}

categories.forEach(category=>{

```
const card=document.createElement("div");
card.className="group-card";
card.id="cat-"+category.category_id;

const title=document.createElement("h2");
title.textContent=category.category_name;

const subtitle=document.createElement("div");
subtitle.className="group-subtitle";
subtitle.textContent=category.day_label+" • "+category.session_label;

card.appendChild(title);
card.appendChild(subtitle);

const table=document.createElement("table");
table.className="results-table";

table.innerHTML=
```

`

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

```
const tbody=table.querySelector("tbody");

let rows=[];

if(Array.isArray(category.entries)){

  rows=category.entries.map(e=>({
    entry:e.entry,
    display_place:"",
    gem:"",
    title:e.title,
    studio:e.studio
  }));

}

if(Array.isArray(category.results)){

  category.results.forEach(r=>{

    const row=rows.find(x=>String(x.entry)===String(r.entry));

    if(row){
      row.display_place=r.display_place || "";
      row.gem=r.gem || "";
    }

  });

}

rows.forEach(r=>{

  const tr=document.createElement("tr");

  tr.dataset.entry=r.entry;

  tr.innerHTML=
```

`

<td class="cell-entry">${escapeHtml(r.entry)}</td>
<td class="cell-place">${escapeHtml(r.display_place)}</td>
<td class="cell-gem">${escapeHtml(r.gem)}</td>
<td class="cell-title">${escapeHtml(r.title)}</td>
<td class="cell-studio">${escapeHtml(r.studio)}</td>
`;

```
  tbody.appendChild(tr);

});

card.appendChild(table);

content.appendChild(card);
```

});

}

function escapeHtml(text){

return String(text)
.replaceAll("&","&")
.replaceAll("<","<")
.replaceAll(">",">")
.replaceAll('"',""")
.replaceAll("'","'");

}

function searchEntry(){

const value=document.getElementById("entrySearch").value.trim();

if(!value || !pageData) return;

document.querySelectorAll(".highlight").forEach(el=>{
el.classList.remove("highlight");
});

for(const category of pageData.categories){

```
const pool=[
  ...(category.results||[]),
  ...(category.entries||[])
];

const found=pool.find(r=>String(r.entry)===value);

if(found){

  activeTab=getDayShortLabel(category.day_label);

  renderTabs();
  renderContent();

  setTimeout(()=>{

    const card=document.getElementById("cat-"+category.category_id);

    const row=card?.querySelector(
      `tr[data-entry="${CSS.escape(String(found.entry))}"]`
    );

    if(card) card.scrollIntoView({behavior:"smooth",block:"start"});

    if(row) row.classList.add("highlight");

  },50);

  return;

}
```

}

alert("Entry "+value+" not found");

}

document.addEventListener("DOMContentLoaded",()=>{

document.getElementById("searchBtn")
.addEventListener("click",searchEntry);

document.getElementById("entrySearch")
.addEventListener("keypress",e=>{
if(e.key==="Enter") searchEntry();
});

loadResults();

setInterval(loadResults,10000);

});
