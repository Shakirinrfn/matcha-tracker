const STORAGE_KEY = "matchaBalanceData";
let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const $ = (id) => document.getElementById(id);
const money = (value) => `$${Number(value || 0).toFixed(2)}`;
const nowLocalValue = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

$("intakeTime").value = nowLocalValue();

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  render();
}

function switchTab(tab){
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  $(`tab-${tab}`).classList.add("active");
  document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add("active");
}

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});
document.querySelectorAll("[data-switch]").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.switch));
});

function startOfWeek(date){
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - day);
  return d;
}

function totalBetween(start, end){
  return entries.reduce((sum, entry) => {
    const d = new Date(entry.time);
    return d >= start && d < end ? sum + Number(entry.cost) : sum;
  }, 0);
}

function getLatestEntry(){
  return [...entries].sort((a,b) => new Date(b.time) - new Date(a.time))[0];
}

function getAdvice(level){
  const map = {
    none: { hours: 24, text: "You seem fine. Your next matcha can be tomorrow." },
    mild: { hours: 36, text: "Mild symptoms detected. Wait at least 36 hours before your next matcha." },
    moderate: { hours: 48, text: "Moderate symptoms detected. Wait at least 48 hours and consider a smaller serving." },
    strong: { hours: 72, text: "Strong symptoms detected. Pause for 72 hours and consider reducing caffeine." }
  };
  return map[level || "none"];
}

function formatDate(date){
  return new Intl.DateTimeFormat(undefined, { dateStyle:"medium", timeStyle:"short" }).format(new Date(date));
}

function renderHome(){
  const latest = getLatestEntry();
  if(!latest){
    $("nextAdvice").textContent = "Log your first matcha today.";
    $("nextAdviceDetail").textContent = "After each intake, the app will ask about symptoms 2 hours later and suggest when your next matcha should be.";
    $("checkinTitle").textContent = "No check-in pending";
    $("checkinText").textContent = "Your next symptom check-in will appear after logging a matcha intake.";
    $("startCheckinBtn").classList.add("hidden");
    return;
  }

  const latestTime = new Date(latest.time);
  const checkinDue = new Date(latestTime.getTime() + 2 * 60 * 60 * 1000);
  const now = new Date();

  if(latest.symptomLevel){
    const advice = getAdvice(latest.symptomLevel);
    const next = new Date(latestTime.getTime() + advice.hours * 60 * 60 * 1000);
    $("nextAdvice").textContent = `Next matcha: ${formatDate(next)}`;
    $("nextAdviceDetail").textContent = advice.text;
    $("checkinTitle").textContent = "Latest check-in completed";
    $("checkinText").textContent = `Symptoms: ${latest.symptoms?.length ? latest.symptoms.join(", ") : latest.symptomLevel}.`;
    $("startCheckinBtn").classList.add("hidden");
  } else if(now >= checkinDue){
    $("nextAdvice").textContent = "Check your symptoms first.";
    $("nextAdviceDetail").textContent = "Your 2-hour check-in is due. Complete it to get your next matcha timing.";
    $("checkinTitle").textContent = "Check-in due now";
    $("checkinText").textContent = `For your ${latest.name} logged at ${formatDate(latest.time)}.`;
    $("startCheckinBtn").classList.remove("hidden");
  } else {
    $("nextAdvice").textContent = `Check-in at ${formatDate(checkinDue)}`;
    $("nextAdviceDetail").textContent = "Wait for your 2-hour symptom check before deciding your next matcha.";
    $("checkinTitle").textContent = "Check-in pending";
    $("checkinText").textContent = `Come back after ${formatDate(checkinDue)}.`;
    $("startCheckinBtn").classList.add("hidden");
  }
}

$("startCheckinBtn").addEventListener("click", () => switchTab("checkin"));

$("matchaForm").addEventListener("submit", (event) => {
  event.preventDefault();
  entries.push({
    id: crypto.randomUUID(),
    time: $("intakeTime").value,
    name: $("matchaName").value.trim(),
    cost: Number($("matchaCost").value),
    notes: $("matchaNotes").value.trim(),
    symptomLevel: null,
    symptoms: [],
    symptomNotes: ""
  });
  event.target.reset();
  $("intakeTime").value = nowLocalValue();
  save();
  switchTab("home");
});

$("symptomForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const latestUnchecked = [...entries]
    .filter(entry => !entry.symptomLevel)
    .sort((a,b) => new Date(b.time) - new Date(a.time))[0];

  if(!latestUnchecked){
    $("latestResult").innerHTML = `<h3>No unchecked matcha found</h3><p>Log a matcha first, then complete the check-in after 2 hours.</p>`;
    return;
  }

  const symptoms = [...document.querySelectorAll(".chip-grid input:checked")].map(input => input.value);
  latestUnchecked.symptomLevel = $("symptomLevel").value;
  latestUnchecked.symptoms = symptoms;
  latestUnchecked.symptomNotes = $("symptomNotes").value.trim();
  latestUnchecked.checkedAt = new Date().toISOString();

  const advice = getAdvice(latestUnchecked.symptomLevel);
  $("latestResult").innerHTML = `<h3>Recommendation Saved</h3><p>${advice.text}</p>`;
  event.target.reset();
  save();
});

function renderInsights(){
  const now = new Date();
  const weekStart = startOfWeek(now);
  const nextWeek = new Date(weekStart); nextWeek.setDate(nextWeek.getDate() + 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const weekTotal = totalBetween(weekStart, nextWeek);
  const monthTotal = totalBetween(monthStart, nextMonth);
  const total = entries.reduce((sum, entry) => sum + Number(entry.cost), 0);
  const avg = entries.length ? total / entries.length : 0;

  $("weekSpend").textContent = money(weekTotal);
  $("monthSpend").textContent = money(monthTotal);
  $("totalSpend").textContent = money(total);
  $("totalCups").textContent = entries.length;
  $("avgCost").textContent = money(avg);

  const checked = entries.filter(e => e.symptomLevel);
  const symptomCount = checked.filter(e => e.symptomLevel !== "none").length;
  $("symptomPattern").textContent = checked.length ? `${symptomCount}/${checked.length}` : "None";

  drawWeekChart(weekStart);
  drawMonthChart(now);
}

function drawBarChart(canvas, labels, values){
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0,0,w,h);
  const max = Math.max(...values, 1);
  const barW = (w - 34) / values.length;

  ctx.fillStyle = "#758078";
  ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
  values.forEach((value, i) => {
    const x = 18 + i * barW;
    const barH = (value / max) * 105;
    const y = 130 - barH;
    const gradient = ctx.createLinearGradient(0, y, 0, 130);
    gradient.addColorStop(0, "#d95f94");
    gradient.addColorStop(1, "#4f9d69");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x + 4, y, barW - 10, barH, 8);
    ctx.fill();
    ctx.fillStyle = "#758078";
    ctx.fillText(labels[i], x + 5, 160);
  });
}

function drawWeekChart(weekStart){
  const labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const values = labels.map((_, i) => {
    const start = new Date(weekStart); start.setDate(start.getDate() + i);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return totalBetween(start, end);
  });
  drawBarChart($("weekChart"), labels, values);
}

function drawMonthChart(now){
  const year = now.getFullYear();
  const month = now.getMonth();
  const labels = ["W1","W2","W3","W4","W5"];
  const values = labels.map((_, i) => {
    const start = new Date(year, month, 1 + i * 7);
    const end = new Date(year, month, 1 + (i + 1) * 7);
    return totalBetween(start, end);
  });
  drawBarChart($("monthChart"), labels, values);
}

function renderHistory(){
  const list = $("historyList");
  if(!entries.length){
    list.innerHTML = `<div class="empty-state">No matcha logged yet.</div>`;
    return;
  }
  list.innerHTML = [...entries]
    .sort((a,b) => new Date(b.time) - new Date(a.time))
    .map(entry => {
      const advice = entry.symptomLevel ? getAdvice(entry.symptomLevel) : null;
      return `<article class="history-item">
        <div class="history-top"><span>${entry.name}</span><span>${money(entry.cost)}</span></div>
        <div class="history-meta">${formatDate(entry.time)}${entry.notes ? `<br>${entry.notes}` : ""}</div>
        <div class="history-meta">Check-in: ${entry.symptomLevel || "Pending"}${entry.symptoms?.length ? ` · ${entry.symptoms.join(", ")}` : ""}</div>
        ${advice ? `<span class="advice-pill">${advice.text}</span>` : `<span class="advice-pill">Check symptoms after 2 hours</span>`}
      </article>`;
    }).join("");
}

$("clearDataBtn").addEventListener("click", () => {
  if(confirm("Clear all matcha history?")){
    entries = [];
    save();
  }
});

function render(){
  renderHome();
  renderInsights();
  renderHistory();
}

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}

setInterval(render, 60 * 1000);
render();
