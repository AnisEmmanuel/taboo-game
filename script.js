/* ---------------- CARDS ---------------- */
const cards = [
  { word: "Birthday", taboo: ["Cake","Party","Gift","Candles","Celebrate"] },
  { word: "Pizza", taboo: ["Cheese","Slice","Sauce","Italy","Toppings"] },
  { word: "Laptop", taboo: ["Computer","Keyboard","Screen","Portable","Work"] },
  { word: "Doctor", taboo: ["Hospital","Medicine","Patient","Nurse","Treatment"] },
  { word: "Cricket", taboo: ["Bat","Ball","Wicket","India","Sport"] },
  { word: "Guitar", taboo: ["Music","Strings","Instrument","Play","Rock"] },
  { word: "Coffee", taboo: ["Caffeine","Morning","Beans","Cup","Latte"] },
  { word: "Airplane", taboo: ["Fly","Pilot","Airport","Wings","Jet"] },
  { word: "Library", taboo: ["Books","Read","Borrow","Quiet","Shelf"] },
  { word: "Dinosaur", taboo: ["Fossil","Jurassic","Extinct","Reptile","T-Rex"] },
  { word: "Robot", taboo: ["AI","Metal","Machine","Program","Automation"] },
  { word: "Camera", taboo: ["Photo","Lens","Click","Zoom","Picture"] },
  { word: "Beach", taboo: ["Sand","Sea","Waves","Sun","Shell"] },
  { word: "Football", taboo: ["Goal","Kick","Team","Stadium","Referee"] },
  { word: "Chocolate", taboo: ["Sweet","Cocoa","Candy","Brown","Bar"] },
];

/* ---------------- STATE ---------------- */
let score = 0, sec = 60, timerId = null;
let deck = [], idx = -1;
let autoCorrectEnabled = false;

/* ---------------- UI ---------------- */
const setupEl = document.getElementById("setup");
const gameEl  = document.getElementById("game");
const overEl  = document.getElementById("over");

const roundInput   = document.getElementById("roundSeconds");
const shuffleInput = document.getElementById("shuffle");
const autoCorrect  = document.getElementById("autoCorrect");
const startBtn     = document.getElementById("startBtn");

const scoreEl = document.getElementById("score");
const timerEl = document.getElementById("timer");
const finalScoreEl = document.getElementById("finalScore");

const wordEl = document.getElementById("mainWord");
const listEl = document.getElementById("tabooList");
const passBtn = document.getElementById("passBtn");
const buzzBtn = document.getElementById("buzzBtn");
const correctBtn = document.getElementById("correctBtn");
const nextBtn = document.getElementById("nextBtn");
const playAgainBtn = document.getElementById("playAgainBtn");

const themeSelect = document.getElementById("themeSelect");

const micBtn = document.getElementById("micBtn");
const micStatus = document.getElementById("micStatus");
const transcriptEl = document.getElementById("transcript");

/* ---------------- HELPERS ---------------- */
const shuffleArray = a => a.map(v=>[Math.random(), v]).sort((x,y)=>x[0]-y[0]).map(p=>p[1]);
const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function drawCard() {
  if (idx + 1 >= deck.length) { deck = shuffleArray(deck); idx = -1; }
  const card = deck[++idx];
  wordEl.textContent = card.word.toUpperCase();
  listEl.innerHTML = "";
  card.taboo.forEach(w => {
    const li = document.createElement("li");
    li.textContent = w.toUpperCase();
    listEl.appendChild(li);
  });
}

function startTimer() {
  clearInterval(timerId);
  timerEl.classList.remove("low");
  sec = Number(roundInput.value) || 60;
  timerEl.textContent = sec;
  timerId = setInterval(() => {
    sec--;
    timerEl.textContent = sec;
    if (sec <= 10) timerEl.classList.add("low");
    if (sec <= 0) { clearInterval(timerId); endGame(); }
  }, 1000);
}

/* ---------------- FLOW ---------------- */
function startGame() {
  score = 0; scoreEl.textContent = score;
  autoCorrectEnabled = !!autoCorrect.checked;
  deck = [...cards];
  if (shuffleInput.checked) deck = shuffleArray(deck);

  setupEl.classList.add("hidden");
  overEl.classList.add("hidden");
  gameEl.classList.remove("hidden");

  transcriptEl.textContent = "";
  startTimer();
  drawCard();
}

function endGame() {
  stopListening();
  gameEl.classList.add("hidden");
  overEl.classList.remove("hidden");
  finalScoreEl.textContent = score;
}

function playAgain() {
  setupEl.classList.remove("hidden");
  overEl.classList.add("hidden");
}

/* ---------------- BUTTONS ---------------- */
startBtn.addEventListener("click", startGame);
nextBtn.addEventListener("click", drawCard);
passBtn.addEventListener("click", drawCard);
buzzBtn.addEventListener("click", () => { score = Math.max(0, score - 1); scoreEl.textContent = score; drawCard(); });
correctBtn.addEventListener("click", () => { score++; scoreEl.textContent = score; drawCard(); });
playAgainBtn.addEventListener("click", playAgain);

/* ---------------- THEME ---------------- */
function applyTheme(value) {
  const map = {
    default: "theme-default", harry: "theme-harry", batman: "theme-batman",
    superman: "theme-superman", avatar: "theme-avatar", marvel: "theme-marvel",
  };
  const body = document.body;
  body.className = Object.values(map).reduce((acc, t) => acc.replace(t, ""), body.className).trim();
  body.classList.add(map[value]);
  localStorage.setItem("taboo_theme", value);
}
themeSelect.addEventListener("change", (e) => applyTheme(e.target.value));
(function initTheme(){ const saved = localStorage.getItem("taboo_theme") || "default"; themeSelect.value = saved; applyTheme(saved); })();

/* ---------------- SPEECH RECOGNITION ---------------- */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false, lastFinal = "";

function initRecognizer() {
  if (!SpeechRecognition) { // unsupported
    micBtn.disabled = true;
    micBtn.textContent = "🎤 Not supported";
    micStatus.textContent = "Mic: not available (use Chrome)";
    return;
  }
  rec = new SpeechRecognition();
  rec.lang = "en-US";
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onstart = () => { listening = true; micBtn.textContent = "⏹️ Stop Listening"; micStatus.textContent = "Mic: on"; };
  rec.onend   = () => { listening = false; micBtn.textContent = "🎤 Start Listening"; micStatus.textContent = "Mic: off"; };

  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      const text = res[0].transcript.trim();
      if (res.isFinal) {
        lastFinal += " " + text;
        checkSpeech(text, true);
      } else {
        interim += " " + text;
        checkSpeech(text, false); // early catch
      }
    }
    transcriptEl.textContent = (lastFinal + " " + interim).trim();
  };

  rec.onerror = () => { /* ignore transient errors */ };
}

function startListening() { if (rec && !listening) try { rec.start(); } catch{} }
function stopListening()  { if (rec && listening) try { rec.stop(); } catch{} }

micBtn.addEventListener("click", () => {
  if (!rec) return;
  if (listening) stopListening(); else startListening();
});
initRecognizer();

/* ----- speech rules ----- */
function checkSpeech(spoken, fromFinalChunk) {
  const current = deck[idx];
  if (!current) return;

  const text = spoken.toLowerCase();

  // 1) Auto-buzz for taboo words
  for (const t of current.taboo) {
    const pattern = new RegExp("\\b" + escapeRegExp(t.toLowerCase()) + "\\b", "i");
    if (pattern.test(text)) {
      flashBuzz(t);
      score = Math.max(0, score - 1);
      scoreEl.textContent = score;
      drawCard();
      return;
    }
  }

  // 2) Optional auto-correct if main word is spoken
  if (autoCorrectEnabled) {
    const patMain = new RegExp("\\b" + escapeRegExp(current.word.toLowerCase()) + "\\b", "i");
    if (patMain.test(text)) {
      flashCorrect();
      score++;
      scoreEl.textContent = score;
      drawCard();
    }
  }
}

/* UI flashes for feedback */
function flashBuzz(wordMatched) {
  transcriptEl.style.borderColor = "var(--bad)";
  transcriptEl.style.color = "var(--bad)";
  transcriptEl.insertAdjacentHTML("beforeend", `  [BUZZ: ${wordMatched.toUpperCase()}]`);
  setTimeout(() => { transcriptEl.style.borderColor = "var(--border)"; transcriptEl.style.color = "var(--muted)"; }, 700);
}
function flashCorrect() {
  transcriptEl.style.borderColor = "var(--ok)";
  setTimeout(() => { transcriptEl.style.borderColor = "var(--border)"; }, 700);
}
