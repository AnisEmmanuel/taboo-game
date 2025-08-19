/* ====== CARDS (add more anytime) ====== */
const cards = [
  { word: "Pizza", taboo: ["Cheese", "Slice", "Sauce", "Italy", "Toppings"] },
  { word: "Laptop", taboo: ["Computer", "Keyboard", "Screen", "Portable", "Work"] },
  { word: "Doctor", taboo: ["Hospital", "Medicine", "Patient", "Nurse", "Treatment"] },
  { word: "Cricket", taboo: ["Bat", "Ball", "Wicket", "India", "Sport"] },
  { word: "Birthday", taboo: ["Cake", "Party", "Gift", "Candles", "Celebrate"] },
  { word: "Guitar", taboo: ["Music", "Strings", "Instrument", "Play", "Rock"] },
  { word: "Sun", taboo: ["Day", "Hot", "Light", "Sky", "Shine"] },
  { word: "Coffee", taboo: ["Caffeine", "Morning", "Beans", "Cup", "Latte"] },
  { word: "Airplane", taboo: ["Fly", "Pilot", "Airport", "Wings", "Jet"] },
  { word: "Library", taboo: ["Books", "Read", "Borrow", "Quiet", "Shelf"] },
  { word: "Dinosaur", taboo: ["Fossil", "Jurassic", "Extinct", "Reptile", "T-Rex"] },
  { word: "Robot", taboo: ["AI", "Metal", "Machine", "Program", "Automation"] },
  { word: "Camera", taboo: ["Photo", "Lens", "Click", "Zoom", "Picture"] },
  { word: "Beach", taboo: ["Sand", "Sea", "Waves", "Sun", "Shell"] },
  { word: "Football", taboo: ["Goal", "Kick", "Team", "Stadium", "Referee"] },
  { word: "Ice Cream", taboo: ["Cold", "Sweet", "Scoop", "Cone", "Dessert"] },
  { word: "Wallet", taboo: ["Money", "Cards", "Cash", "Leather", "Pocket"] },
  { word: "Rocket", taboo: ["Space", "Launch", "Astronaut", "Moon", "Fuel"] },
  { word: "Taxi", taboo: ["Cab", "Driver", "Meter", "Ride", "Yellow"] },
  { word: "Chocolate", taboo: ["Sweet", "Cocoa", "Candy", "Brown", "Bar"] }
];

/* ====== STATE ====== */
let score = 0;
let sec = 60;
let timerId = null;
let deck = [];
let idx = -1;

/* ====== UI HOOKS ====== */
const setupEl = document.getElementById("setup");
const gameEl  = document.getElementById("game");
const overEl  = document.getElementById("over");

const roundInput = document.getElementById("roundSeconds");
const shuffleInput = document.getElementById("shuffle");
const startBtn = document.getElementById("startBtn");

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

/* ====== HELPERS ====== */
const shuffleArray = a => a.map(v=>[Math.random(), v]).sort((x,y)=>x[0]-y[0]).map(p=>p[1]);

function drawCard() {
  if (idx + 1 >= deck.length) {
    // re-shuffle if we ran out
    deck = shuffleArray(deck);
    idx = -1;
  }
  const card = deck[++idx];
  wordEl.textContent = card.word.toUpperCase();
  listEl.innerHTML = "";
  card.taboo.forEach(w => {
    const li = document.createElement("li");
    li.textContent = w.toUpperCase();
    listEl.appendChild(li);
  });
}

/* ====== TIMER ====== */
function startTimer() {
  clearInterval(timerId);
  timerEl.classList.remove("low");
  sec = Number(roundInput.value) || 60;
  timerEl.textContent = sec;
  timerId = setInterval(() => {
    sec--;
    timerEl.textContent = sec;
    if (sec <= 10) timerEl.classList.add("low");
    if (sec <= 0) {
      clearInterval(timerId);
      endGame();
    }
  }, 1000);
}

/* ====== FLOW ====== */
function startGame() {
  score = 0; scoreEl.textContent = score;
  deck = [...cards];
  if (shuffleInput.checked) deck = shuffleArray(deck);

  setupEl.classList.add("hidden");
  overEl.classList.add("hidden");
  gameEl.classList.remove("hidden");

  startTimer();
  drawCard();
}

function endGame() {
  gameEl.classList.add("hidden");
  overEl.classList.remove("hidden");
  finalScoreEl.textContent = score;
}

function playAgain() {
  setupEl.classList.remove("hidden");
  overEl.classList.add("hidden");
}

/* ====== EVENTS ====== */
startBtn.addEventListener("click", startGame);
nextBtn.addEventListener("click", drawCard);
passBtn.addEventListener("click", drawCard);
buzzBtn.addEventListener("click", () => { score = Math.max(0, score - 1); scoreEl.textContent = score; drawCard(); });
correctBtn.addEventListener("click", () => { score++; scoreEl.textContent = score; drawCard(); });
playAgainBtn.addEventListener("click", playAgain);

/* ====== THEME HANDLING ====== */
function applyTheme(value) {
  const map = {
    default: "theme-default",
    harry: "theme-harry",
    batman: "theme-batman",
    superman: "theme-superman",
    avatar: "theme-avatar",
    marvel: "theme-marvel",
  };
  const body = document.body;
  // remove existing theme- classes
  body.className = Object.values(map).reduce((acc, t) => acc.replace(t, ""), body.className).trim();
  body.classList.add(map[value]);
  localStorage.setItem("taboo_theme", value);
}
themeSelect.addEventListener("change", (e) => applyTheme(e.target.value));

// restore saved theme
(function initTheme(){
  const saved = localStorage.getItem("taboo_theme") || "default";
  themeSelect.value = saved; applyTheme(saved);
})();
