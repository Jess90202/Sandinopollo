// ============================
// CONFIG
// ============================
const START_DATE = new Date("2025-02-15T00:00:00"); // <- cámbiala

const PHRASES = [
  "Para el amor de mi existencia:",
  "Si pudiera elegir un lugar seguro sería a tu lado.\nCuanto más tiempo estoy contigo más te amo."
];

// Multicolor / textura
const HEART_COLORS = [
  "#d3122f","#ff2d55","#ff5c8a","#ff7aa6","#ff8fb3",
  "#c2185b","#b5179e","#ff4d6d","#ff006e","#f72585"
];

// Velocidades
const HEART_BUILD_SECONDS = 1.15;  // forma rápido
const SPEED_TITLE = 170;           // texto palabra a palabra
const SPEED_BODY  = 120;

const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");

const intro = document.getElementById("intro");
const startBtn = document.getElementById("startBtn");
const bgm = document.getElementById("bgm");

const content = document.getElementById("content");
const line1 = document.getElementById("line1");
const line2 = document.getElementById("line2");
const timerValue = document.getElementById("timerValue");

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

function resize(){
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", ()=>{ resize(); if(started){ resetHearts(); } });
resize();

// ============================
// HEART TARGETS (relleno + borde)
// ============================
function insideHeart(nx, ny){
  const a = nx*nx + ny*ny - 1;
  return (a*a*a - nx*nx*ny*ny*ny) <= 0;
}

function makeTargets(cx, cy, size, fillCount, outlineCount){
  const fill = [];
  let guard = 0;
  while (fill.length < fillCount && guard < fillCount * 90){
    guard++;
    const nx = (Math.random()*2.2 - 1.1);
    const ny = (Math.random()*2.2 - 1.1);
    if (insideHeart(nx, ny)){
      fill.push({ x: cx + nx*size, y: cy - ny*size });
    }
  }
  const outline = [];
  for (let i=0;i<outlineCount;i++){
    const t = (i/outlineCount) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t),3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
    outline.push({ x: cx + x*(size*0.085), y: cy - y*(size*0.085) });
  }
  return outline.concat(fill);
}

function easeOutCubic(x){ return 1 - Math.pow(1 - x, 3); }
function rand(min,max){ return min + Math.random()*(max-min); }

// ============================
// Textured heart drawing
// ============================
function heartPath(s){
  ctx.beginPath();
  ctx.moveTo(0, -s*0.25);
  ctx.bezierCurveTo( s*0.55, -s*0.95,  s*1.15, -s*0.05, 0, s);
  ctx.bezierCurveTo(-s*1.15, -s*0.05, -s*0.55, -s*0.95, 0, -s*0.25);
  ctx.closePath();
}

function drawTexturedHeart(x,y,s,color,rot){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(rot);

  const g = ctx.createRadialGradient(-s*0.25, -s*0.35, s*0.3, 0, 0, s*1.25);
  g.addColorStop(0, "#ffe6ef");
  g.addColorStop(0.20, color);
  g.addColorStop(1, "#6a0618");

  heartPath(s);
  ctx.fillStyle = g;
  ctx.fill();

  // highlight
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.ellipse(-s*0.25, -s*0.28, s*0.40, s*0.24, -0.55, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // subtle outline
  ctx.strokeStyle = "rgba(0,0,0,.06)";
  ctx.lineWidth = 1;
  heartPath(s);
  ctx.stroke();

  ctx.restore();
}


function drawHeartSilhouette(cx, cy, size){
  ctx.save();
  ctx.translate(cx, cy);
  const s = size * 0.33;
  ctx.beginPath();
  ctx.moveTo(0, -s*0.25);
  ctx.bezierCurveTo( s*0.55, -s*0.95,  s*1.15, -s*0.05, 0, s);
  ctx.bezierCurveTo(-s*1.15, -s*0.05, -s*0.55, -s*0.95, 0, -s*0.25);
  ctx.closePath();
  const g = ctx.createRadialGradient(-s*0.3, -s*0.4, s*0.2, 0, 0, s*1.35);
  g.addColorStop(0, "rgba(255, 220, 235, 0.95)");
  g.addColorStop(0.45, "rgba(255, 120, 165, 0.55)");
  g.addColorStop(1, "rgba(198, 31, 58, 0.22)");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

// ============================
// HEART PARTICLES
// ============================
let particles = [];
let targets = [];
let started = false;
let t0 = 0;
let textStarted = false;

function layout(){
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;
  const cx = w * 0.5;
  const cy = h * 0.53;         // centro visual de la tarjeta
  const size = Math.min(w, h) * 0.30;
  return { w, h, cx, cy, size };
}

function resetHearts(){
  const { w, h, cx, cy, size } = layout();
  targets = makeTargets(cx, cy, size, 1600, 360);

  const N = (layout().w < 520 ? 850 : 1100);
  particles = [];
  for (let i=0;i<N;i++){
    const t = targets[i % targets.length];

    // Entradas desde alrededor (más bonito que solo derecha)
    const side = Math.random();
    let x0, y0;
    if (side < 0.34){
      x0 = -40; y0 = h * rand(0.2, 0.85);
    } else if (side < 0.67){
      x0 = w + 40; y0 = h * rand(0.2, 0.85);
    } else {
      x0 = w * rand(0.2, 0.8); y0 = h + 40;
    }

    particles.push({
      x0, y0,
      x: x0, y: y0,
      tx: t.x + rand(-4,4),
      ty: t.y + rand(-4,4),
      s: rand(8, 14),
      c: HEART_COLORS[(Math.random()*HEART_COLORS.length)|0],
      rot: rand(0, Math.PI*2),
      vr: rand(-0.05, 0.05)
    });
  }
}

function drawScene(progress){
  const { w, h } = layout();
  ctx.clearRect(0,0,w,h);

  // base del corazón para que NO se vea el fondo
  drawHeartSilhouette(w*0.5, h*0.53, Math.min(w,h)*0.30);


  const p = easeOutCubic(progress);
  for (const a of particles){
    a.x = a.x0 + (a.tx - a.x0) * p;
    a.y = a.y0 + (a.ty - a.y0) * p;
    a.rot += a.vr;

    const flutter = (1 - p) * Math.sin((a.x0 + a.y0) * 0.02 + progress*14) * 2.0;
    drawTexturedHeart(a.x, a.y + flutter, a.s, a.c, a.rot);
  }
}

// ============================
// TEXT (palabra a palabra, sin guiones)
// ============================
let textStarted = false;

async function typeWords(el, text, speedMs){
  el.classList.add("visible");
  el.textContent = "";
  const parts = text.split(/(\s+)/);
  for (const part of parts){
    el.textContent += part;
    await sleep(speedMs);
  }
}

function showContent(){
  content.classList.remove("hidden");
  void content.offsetWidth;
  content.classList.add("show");
}

async function revealText(){
  if (textStarted) return;
  textStarted = true;

  showContent();
  await typeWords(line1, PHRASES[0], SPEED_TITLE);
  await sleep(650);
  await typeWords(line2, PHRASES[1], SPEED_BODY);
  await sleep(450);
  startTimer();
}

function startTimer(){
  function tick(){
    const diff = new Date() - START_DATE;
    const total = Math.floor(diff/1000);
    const days = Math.floor(total/86400);
    const hours = Math.floor((total%86400)/3600);
    const minutes = Math.floor((total%3600)/60);
    const seconds = total%60;
    timerValue.textContent = `${days} días ${hours} horas ${minutes} minutos ${seconds} segundos`;
  }
  tick();
  setInterval(tick, 1000);
}

// ============================
// ANIMATION LOOP
// ============================
function frame(ts){
  if (!started) return;
  const t = (ts - t0) / 1000;
  const heartP = Math.min(t / HEART_BUILD_SECONDS, 1);

  drawScene(heartP);

  if (heartP >= 1){
    revealText();
  }
  requestAnimationFrame(frame);
}

// ============================
// START
// ============================
async function startMusic(){
  try{ bgm.volume = 0.45; await bgm.play(); }catch(e){}
}

startBtn.addEventListener("click", async ()=>{
  intro.style.transition = "opacity 260ms ease";
  intro.style.opacity = "0";
  await sleep(240);
  intro.style.display = "none";

  await startMusic();

  resetHearts();
  started = true;
  t0 = performance.now();
  requestAnimationFrame(frame);
});
