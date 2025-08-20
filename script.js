/* CPU vs Human Taboo
   - Loads 200-card deck from cards_200.json (fallback to small local deck).
   - CPU speaks 2–3 hints per card. You guess by voice (Web Speech API) or by typing.
   - Themes add animated background sprites at 50% opacity.
   - No paid services; everything is in-browser APIs only.
*/

const wordEl   = document.getElementById("word");
const tabooEl  = document.getElementById("taboo");
const scoreEl  = document.getElementById("score");
const logEl    = document.getElementById("log");
const listenBtn= document.getElementById("listen");
const micState = document.getElementById("mic-state");
const guessIn  = document.getElementById("guess");
const guessBtn = document.getElementById("submit-guess");
const passBtn  = document.getElementById("pass");
const buzzBtn  = document.getElementById("buzz");
const nextBtn  = document.getElementById("next");
const correctBtn=document.getElementById("correct");
const cpuBtn   = document.getElementById("cpu-enact");
const cpuState = document.getElementById("cpu-status");
const timerEl  = document.getElementById("timer");
const themeSel = document.getElementById("theme");
const fxLayer  = document.getElementById("fx-layer");

let deck = [];
let idx = -1;
let score = +localStorage.getItem("taboo_score") || 0;
let current = null;
let recognizer = null;
let listening = false;
let cpuInterval = null;
let roundTimer = null;
let timeLeft = 60;

scoreEl.textContent = score;

/* ---------- Utility ---------- */
const normalize = s => (s || "").toLowerCase().replace(/[^a-z0-9 ]/g,"").trim();
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const sleep = ms => new Promise(r=>setTimeout(r,ms));

function log(msg){
  logEl.textContent = (msg ? msg + "\n" : "") + logEl.textContent;
}

/* ---------- Deck loading (200 cards) ---------- */
async function loadDeck(){
  try{
    const res = await fetch("cards_200.json", {cache:"no-store"});
    if(!res.ok) throw new Error("not found");
    deck = await res.json();
  }catch(e){
    // Small fallback deck
    deck = [
      { word:"APPLE", taboo:["FRUIT","RED","TREE","IPHONE","MAC"] },
      { word:"GUITAR", taboo:["MUSIC","STRINGS","INSTRUMENT","PLAY","ROCK"] },
      { word:"BIRTHDAY", taboo:["CAKE","PARTY","GIFT","CANDLES","CELEBRATE"] },
      { word:"SUN", taboo:["DAY","HOT","LIGHT","SKY","SHINE"] },
      { word:"COMPUTER", taboo:["SCREEN","KEYBOARD","MOUSE","TECH","INTERNET"] },
      { word:"SCHOOL", taboo:["STUDENTS","TEACHER","CLASS","LEARN","BOOKS"] },
    ];
  }
  // Shuffle once
  for (let i=deck.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}
function showCard(i){
  current = deck[i];
  if(!current){ wordEl.textContent = "Done"; tabooEl.innerHTML = ""; return; }
  wordEl.textContent = current.word;
  tabooEl.innerHTML = "";
  current.taboo.forEach(t=>{
    const div = document.createElement("div");
    div.className = "chip";
    div.textContent = t;
    tabooEl.appendChild(div);
  });
  logEl.textContent = "";
}

/* ---------- Round timer ---------- */
function startTimer(){
  clearInterval(roundTimer);
  timeLeft = 60;
  timerEl.textContent = timeLeft;
  roundTimer = setInterval(()=>{
    timeLeft--;
    timerEl.textContent = timeLeft;
    if(timeLeft<=0){
      clearInterval(roundTimer);
      stopCPU();
      stopListening();
      log("⏰ Time up!");
    }
  },1000);
}

/* ---------- CPU Enact (text + speech synthesis) ---------- */
const cpuBanks = {
  genericStarts: ["Think of","Related to","Something about","I’m describing"],
  connectors: ["without saying","but not using","avoid words like","excluding"],
  closers: ["What is it?","Name it!","Guess the word!","Got it?"]
};
function makeHint(card){
  // Build 2-3 short hints that avoid taboo words (rough filter).
  const avoid = new Set([card.word, ...card.taboo].map(normalize));
  const baseHints = [
    `It’s common in daily life`,
    `You might see it at home`,
    `Often found outside`,
    `Used by many people`,
    `You can touch it`,
    `A simple thing we talk about`,
    `Connected to ${["time","travel","work","play","nature"][Math.floor(Math.random()*5)]}`
  ];
  // filter any hint that inadvertently includes taboo
  const hints = baseHints.filter(h => ![...avoid].some(a => h.toLowerCase().includes(a)));
  const picked = [pick(hints)];
  if(Math.random()>0.4) picked.push(pick(hints));
  return picked;
}
function speak(text){
  try{
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
    speechSynthesis.speak(u);
  }catch(_){}
}
function startCPU(){
  stopCPU();
  if(!current) return;
  cpuState.textContent = "Speaking…";
  // Do a burst of 3 lines over ~10s
  let n = 0;
  const doSpeak = ()=>{
    if(!current) return;
    const hints = makeHint(current);
    const line = `${pick(cpuBanks.genericStarts)} it ${pick(cpuBanks.connectors)} ${current.taboo.slice(0,3).join(", ").toLowerCase()}. ${hints.join(". ")}. ${pick(cpuBanks.closers)}`;
    log(`🤖 CPU: ${line}`);
    speak(line);
    if(++n>=3){ stopCPU(); }
  };
  doSpeak();
  cpuInterval = setInterval(doSpeak, 3500);
}
function stopCPU(){
  if(cpuInterval){ clearInterval(cpuInterval); cpuInterval=null; cpuState.textContent="Idle"; }
}

/* ---------- Speech Recognition (human guesses) ---------- */
function getRecognizer(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const rec = new SR();
  rec.lang = "en-US";
  rec.continuous = true;
  rec.interimResults = true;
  return rec;
}
function startListening(){
  if(listening) return;
  recognizer = getRecognizer();
  if(!recognizer){
    log("⚠️ Speech recognition not available in this browser. Use the text box to guess.");
    return;
  }
  listening = true;
  micState.textContent = "Mic: on";
  listenBtn.textContent = "🛑 Stop Listening";
  recognizer.onresult = (ev)=>{
    let said = "";
    for(let i=ev.resultIndex;i<ev.results.length;i++){
      said += ev.results[i][0].transcript + " ";
    }
    const normalized = normalize(said);
    // Auto-buzz if any taboo word spoken
    if(current && current.taboo.some(t => normalized.includes(normalize(t)))){
      log(`🔔 You said a taboo word! → ${said.trim()}`);
    }
    // Auto-correct if word detected
    if(current && normalized.includes(normalize(current.word))){
      correct();
    }
  };
  recognizer.onend = ()=>{ listening=false; micState.textContent="Mic: off"; listenBtn.textContent="🎙️ Start Listening"; };
  recognizer.start();
}
function stopListening(){
  if(recognizer){ try{ recognizer.stop(); }catch(_){ } }
  recognizer=null; listening=false; micState.textContent="Mic: off"; listenBtn.textContent="🎙️ Start Listening";
}

/* ---------- Game actions ---------- */
function next(){
  stopCPU(); stopListening();
  if(++idx >= deck.length) idx = 0;
  showCard(idx);
  startTimer();
}
function pass(){
  log("⏭️ You passed.");
  next();
}
function buzz(){
  score = Math.max(0, score-1);
  scoreEl.textContent = score;
  localStorage.setItem("taboo_score", score);
  log("❌ Buzz! -1 point.");
  next();
}
function correct(){
  score += 1;
  scoreEl.textContent = score;
  localStorage.setItem("taboo_score", score);
  log("✅ Correct! +1 point.");
  next();
}
function submitGuess(){
  const g = normalize(guessIn.value);
  if(!g) return;
  if(normalize(current.word) === g){ correct(); }
  else if(current.taboo.some(t => g.includes(normalize(t)))){
    log("⚠️ Your guess contains a taboo word.");
  } else {
    log(`You guessed: ${guessIn.value}`);
  }
  guessIn.value = "";
}

/* ---------- Theme visuals (50% opacity sprites) ---------- */
const emojiPacks = {
  classic: ["✨","🎈","⭐️","🎯"],
  harry:   ["🎃","🪄","🧙‍♂️","🧹","🦉","🎩"],
  batman:  ["🦇","🦇","🦇","🦇","🦇"],
  avatar:  ["🐉","🦕","🦖","🐬","🦋"],
  marvel:  ["🛡️","⚡","🕷️","🪙","🦸‍♂️","🦸‍♀️"],
  superman:["🦸‍♂️","🟥","🟦","🟨","💫"]
};
function spawnSprite(emoji){
  const span = document.createElement("span");
  span.className = "fx-sprite";
  span.textContent = emoji;
  span.style.setProperty("--y", `${Math.random()*80-10}vh`);
  span.style.setProperty("--yd", `${Math.random()*30-15}vh`);
  span.style.setProperty("--s", (0.8 + Math.random()*0.8).toFixed(2));
  span.style.fontSize = `${24 + Math.random()*42}px`;
  span.style.animationDuration = `${10 + Math.random()*12}s`;
  fxLayer.appendChild(span);
  span.addEventListener("animationend", ()=>span.remove());
}
let fxLoop = null;
function setTheme(value){
  document.body.classList.remove(...Array.from(document.body.classList).filter(c=>c.startsWith("theme-")));
  const key = (value || "classic").toLowerCase();
  document.body.classList.add(`theme-${key}`);
  localStorage.setItem("taboo_theme", key);
  // FX loop
  if(fxLoop) clearInterval(fxLoop);
  fxLoop = setInterval(()=> spawnSprite(pick(emojiPacks[key] || emojiPacks.classic)), 900);
}

/* ---------- Wire UI ---------- */
listenBtn.addEventListener("click", ()=> listening ? stopListening() : startListening());
guessBtn.addEventListener("click", submitGuess);
guessIn.addEventListener("keydown", (e)=>{ if(e.key==="Enter") submitGuess(); });
nextBtn.addEventListener("click", next);
passBtn.addEventListener("click", pass);
buzzBtn.addEventListener("click", buzz);
correctBtn.addEventListener("click", correct);
cpuBtn.addEventListener("click", startCPU);
themeSel.addEventListener("change", e=> setTheme(e.target.value));

/* ---------- Boot ---------- */
(async function init(){
  // Theme restore
  const savedTheme = localStorage.getItem("taboo_theme") || "classic";
  themeSel.value = savedTheme;
  setTheme(savedTheme);

  await loadDeck();
  next(); // starts timer & shows first card
})();
