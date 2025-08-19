/***************
 *  GAME DATA  *
 ***************/
const CARDS = [
  { word: "APPLE", taboo: ["FRUIT","RED","TREE","IPHONE","MAC"] },
  { word: "BIRTHDAY", taboo: ["CAKE","CANDLES","PARTY","GIFT","CELEBRATE"] },
  { word: "GUITAR", taboo: ["MUSIC","STRINGS","INSTRUMENT","PLAY","ROCK"] },
  { word: "SUN", taboo: ["DAY","HOT","LIGHT","SKY","SHINE"] },
  { word: "SCHOOL", taboo: ["STUDENTS","TEACHER","CLASS","LEARNING","BOOKS"] },
  { word: "OCEAN", taboo: ["WATER","FISH","BLUE","BEACH","WAVES"] },
  { word: "COFFEE", taboo: ["DRINK","MORNING","HOT","CAFFEINE","BEANS"] },
  { word: "VOLCANO", taboo: ["LAVA","MAGMA","ERUPTION","MOUNTAIN","HOT"] },
  { word: "ELEPHANT", taboo: ["TRUNK","BIG","GREY","AFRICA","JUNGLE"] },
  { word: "PIZZA", taboo: ["CHEESE","SAUCE","DOUGH","ITALY","PEPPERONI"] },
  // add more anytime…
];

/*****************
 *  DOM GRAB     *
 *****************/
const $ = (sel) => document.querySelector(sel);
const mainWordEl   = $("#mainWord");
const tabooWordsEl = $("#tabooWords");
const scoreEl      = $("#score");
const timerEl      = $("#timer");
const themeSelect  = $("#themeSelect");

const micStartBtn  = $("#micStart");
const micStopBtn   = $("#micStop");
const micStatusEl  = $("#micStatus");
const spokenBox    = $("#spokenBox");

const passBtn      = $("#passBtn");
const buzzBtn      = $("#buzzBtn");
const correctBtn   = $("#correctBtn");
const nextBtn      = $("#nextBtn");
const restartBtn   = $("#restartBtn");

const guessBox     = $("#guessBox");
const guessBtn     = $("#guessBtn");
const guessResult  = $("#guessResult");

/*****************
 *  THEME        *
 *****************/
const THEME_KEY = "taboo_theme";
function applyTheme(value) {
  document.body.setAttribute("data-theme", value);
  localStorage.setItem(THEME_KEY, value);
}
themeSelect.addEventListener("change", e => applyTheme(e.target.value));
applyTheme(localStorage.getItem(THEME_KEY) || "classic");
themeSelect.value = localStorage.getItem(THEME_KEY) || "classic";

/*****************
 *  GAME STATE   *
 *****************/
let deck = shuffle([...CARDS]);
let current = null;
let score = 0;

let timer = 60;       // seconds
let timerId = null;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function drawCard() {
  if (deck.length === 0) deck = shuffle([...CARDS]);
  current = deck.pop();
  mainWordEl.textContent = current.word;
  tabooWordsEl.innerHTML = "";
  current.taboo.forEach(t => {
    const div = document.createElement("div");
    div.className = "chip";
    div.textContent = t;
    tabooWordsEl.appendChild(div);
  });
  guessBox.value = "";
  guessResult.textContent = "";
}

function setScore(n) {
  score = Math.max(0, n);
  scoreEl.textContent = String(score);
}

/*****************
 *  TIMER        *
 *****************/
function startTimer() {
  clearInterval(timerId);
  timer = 60;
  timerEl.textContent = timer;
  timerId = setInterval(() => {
    timer--;
    timerEl.textContent = timer;
    if (timer <= 0) {
      clearInterval(timerId);
      // End of round; you can add a modal or just reset
      alert(`Time! Final score: ${score}`);
      startRound();
    }
  }, 1000);
}

function startRound() {
  setScore(0);
  deck = shuffle([...CARDS]);
  drawCard();
  startTimer();
}

/*****************
 *  BUTTONS      *
 *****************/
passBtn.addEventListener("click", () => {
  drawCard();
});
buzzBtn.addEventListener("click", () => {
  setScore(score - 1);
  drawCard();
});
correctBtn.addEventListener("click", () => {
  setScore(score + 1);
  drawCard();
});
nextBtn.addEventListener("click", drawCard);
restartBtn.addEventListener("click", startRound);

/*****************
 *  GUESS CHECK  *
 *****************/
function checkGuess() {
  const g = guessBox.value.trim().toLowerCase();
  if (!g) return;
  const answer = current.word.toLowerCase();
  if (g === answer) {
    guessResult.textContent = "✅ Correct!";
    setScore(score + 1);
    drawCard();
  } else {
    guessResult.textContent = "❌ Try again!";
  }
}
guessBtn.addEventListener("click", checkGuess);
guessBox.addEventListener("keydown", (e)=> {
  if (e.key === "Enter") checkGuess();
});

/*************************
 *  SPEECH RECOGNITION   *
 *************************/
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognizer = null;
let isListening = false;

function setMicStatus(text) { micStatusEl.textContent = text; }
function appendSpoken(text) { spokenBox.textContent = text; }

async function ensureMicPermission() {
  if (!navigator.mediaDevices?.getUserMedia) return;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach(t => t.stop());
}

function initRecognizer() {
  if (!SpeechRecognition) {
    setMicStatus("Mic: unsupported (use Chrome/Edge)");
    micStartBtn.disabled = true;
    return null;
  }
  const rec = new SpeechRecognition();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    isListening = true;
    micStartBtn.disabled = true;
    micStopBtn.disabled = false;
    setMicStatus("Mic: listening…");
  };

  rec.onresult = (ev) => {
    let finalText = "";
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      finalText += ev.results[i][0].transcript;
    }
    finalText = finalText.trim();
    appendSpoken(finalText);

    // Auto-buzz if a TABOO word is spoken (simple contains check)
    if (containsTaboo(finalText)) {
      // brief visual cue
      spokenBox.style.outline = "2px solid var(--warn)";
      setTimeout(()=> spokenBox.style.outline = "none", 400);
      // trigger buzz logic
      setScore(score - 1);
      drawCard();
    }
  };

  rec.onerror = (ev) => {
    console.warn("Speech error:", ev.error);
    setMicStatus("Mic error: " + ev.error);
  };

  rec.onend = () => {
    isListening = false;
    micStartBtn.disabled = false;
    micStopBtn.disabled = true;
    setMicStatus("Mic: stopped");
  };
  return rec;
}

function containsTaboo(text) {
  if (!current || !text) return false;
  const said = text.toLowerCase();
  return current.taboo.some(t => {
    const token = t.toLowerCase();
    // match whole or part (simple heuristic); adjust as you like
    return said.includes(token) || said.split(/\W+/).includes(token);
  });
}

async function startListening() {
  try {
    await ensureMicPermission();
    if (!recognizer) recognizer = initRecognizer();
    if (!recognizer) return;
    if (!isListening) recognizer.start();
  } catch (e) {
    setMicStatus(e.message || "Mic: permission required");
  }
}
function stopListening() {
  if (recognizer && isListening) recognizer.stop();
}

micStartBtn.addEventListener("click", startListening);
micStopBtn.addEventListener("click", stopListening);

/*****************
 *  INIT         *
 *****************/
startRound();
