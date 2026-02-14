// ============================
// CONFIG
// ============================
const START_DATE = new Date("2025-02-15T00:00:00"); // <- cámbiala

const PHRASES = [
  "Para el amor de mi vida:",
  "Si pudiera elegir un lugar seguro, sería a tu lado.\nCuanto más tiempo estoy contigo, más te amo.",
  "— Te amo mi amorcito"
];

const HEART_COLORS = ["#d3122f", "#ff2d55", "#ff5c8a", "#ff7aa6", "#ff8fb3", "#c2185b", "#b5179e"];

// rápido
const TRUNK_SECONDS = 1.8;
const HEARTS_SECONDS = 4.5;
const SETTLE_SECONDS = 0.9;

// ============================
// CANVAS
// ============================
const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");

function resize(){
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

// ============================
// UI / AUDIO
// ============================
const intro = document.getElementById("intro");
const startBtn = document.getElementById("startBtn");
const bgm = document.getElementById("bgm");
const textLayer = document.getElementById("textLayer");
const line1 = document.getElementById("line1");
const line2 = document.getElementById("line2");
const line3 = document.getElementById("line3");
const timerValue = document.getElementById("timerValue");

async function startMusic(){
  try{
    bgm.volume = 0.45;
    await bgm.play();
  }catch(e){
    console.warn("Audio bloqueado:", e);
  }
}
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

// ============================
// LAYOUT
// ============================
function layout(){
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;

  const groundY = h * 0.84;

  // Árbol a la derecha (junto al texto)
  const treeX = w * 0.82;
  const treeY = groundY;

  // Copa arriba
  const crownCx = w * 0.82;
  const crownCy = h * 0.34;

  return { w, h, groundY, treeX, treeY, crownCx, crownCy };
}

function drawGround(){
  const { w, groundY } = layout();
  ctx.save();
  ctx.strokeStyle = "rgba(20,10,10,.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.06, groundY);
  ctx.lineTo(w * 0.94, groundY);
  ctx.stroke();
  ctx.restore();
}

// ============================
// TRONCO
// ============================
function drawTrunk(progress){
  const { w, treeX, treeY, crownCy } = layout();
  const maxH = (treeY - crownCy) * 0.95;
  const hh = maxH * progress;

  const baseW = w * 0.030;
  const topW  = w * 0.0125;

  const yTop = treeY - hh;

  ctx.save();
  ctx.fillStyle = "#8a4d2b";
  ctx.beginPath();
  ctx.moveTo(treeX - baseW/2, treeY);
  ctx.lineTo(treeX + baseW/2, treeY);
  ctx.lineTo(treeX + topW/2, yTop);
  ctx.lineTo(treeX - topW/2, yTop);
  ctx.closePath();
  ctx.fill();

  if (progress > 0.6){
    ctx.strokeStyle = "#6f3a1f";
    ctx.lineWidth = 2;
    const k = (progress - 0.6) / 0.4;

    const branches = [
      {dx: -w*0.07, dy: -w*0.02},
      {dx:  w*0.07, dy: -w*0.02},
      {dx: -w*0.05, dy: -w*0.06},
      {dx:  w*0.05, dy: -w*0.06},
    ];
    branches.forEach(b=>{
      ctx.beginPath();
      ctx.moveTo(treeX, yTop + 24);
      ctx.lineTo(treeX + b.dx*k, (yTop + 24) + b.dy*k);
      ctx.stroke();
    });
  }

  ctx.restore();
}

// ============================
// HEART SHAPE: relleno (no solo borde)
// ============================
// Ecuación implícita del corazón: (x^2 + y^2 - 1)^3 - x^2 y^3 <= 0
// Usamos coords normalizadas x,y en [-1.2,1.2]
function insideHeart(nx, ny){
  const a = nx*nx + ny*ny - 1;
  return (a*a*a - nx*nx*ny*ny*ny) <= 0;
}

function generateHeartTargets(cx, cy, size, count){
  // Rejection sampling en una caja, para RELLENAR el corazón.
  const pts = [];
  let guard = 0;
  while (pts.length < count && guard < count * 50){
    guard++;
    const nx = (Math.random()*2.4 - 1.2);
    const ny = (Math.random()*2.4 - 1.2);
    if (insideHeart(nx, ny)){
      pts.push({ x: cx + nx*size, y: cy - ny*size });
    }
  }
  return pts;
}

function generateOutlineTargets(cx, cy, size, count){
  // borde paramétrico para definir mejor la silueta
  const pts = [];
  for (let i=0;i<count;i++){
    const t = (i/count) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t),3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
    pts.push({ x: cx + x*(size*0.09), y: cy - y*(size*0.09) });
  }
  return pts;
}

// ============================
// PARTICULAS
// ============================
const particles = [];
let targets = [];
let outlineTargets = [];
let startHeartsAt = 0;

function rand(min,max){ return min + Math.random()*(max-min); }

function spawnParticle(){
  const { w, h } = layout();

  // spawnea desde laterales sin invadir tanto el texto (más arriba)
  const fromLeft = Math.random() < 0.65;
  const x = fromLeft ? -30 : w + 30;
  const y = h * rand(0.25, 0.72);

  // 70% relleno, 30% borde para que se vea corazón definido
  const useOutline = Math.random() < 0.30;
  const t = useOutline
    ? outlineTargets[(Math.random()*outlineTargets.length)|0]
    : targets[(Math.random()*targets.length)|0];

  const s = rand(7, 12);
  const c = HEART_COLORS[(Math.random()*HEART_COLORS.length)|0];

  particles.push({
    x, y,
    vx: fromLeft ? rand(1.6, 2.6) : rand(-2.6, -1.6),
    vy: rand(-0.7, 0.7),
    rot: rand(0, Math.PI*2),
    vr: rand(-0.06, 0.06),
    s, c,
    tx: t.x + rand(-8,8),
    ty: t.y + rand(-8,8),
    settled: false
  });
}

function updateParticles(dt, strength){
  for (const p of particles){
    const ax = (p.tx - p.x) * strength;
    const ay = (p.ty - p.y) * strength;

    p.vx = p.vx * 0.90 + ax * dt;
    p.vy = p.vy * 0.90 + ay * dt;

    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.rot += p.vr;

    const dx = p.tx - p.x, dy = p.ty - p.y;
    if (!p.settled && (dx*dx + dy*dy) < 70){
      p.settled = true;
      p.vx *= 0.18; p.vy *= 0.18; p.vr *= 0.18;
    }
  }
}

function heartPath(ctx, s){
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

  const g = ctx.createRadialGradient(-s*0.25, -s*0.35, s*0.3, 0, 0, s*1.2);
  g.addColorStop(0, "#ffe6ef");
  g.addColorStop(0.22, color);
  g.addColorStop(1, "#7a0a1e");

  heartPath(ctx, s);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.ellipse(-s*0.25, -s*0.25, s*0.35, s*0.22, -0.6, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(0,0,0,.06)";
  ctx.lineWidth = 1;
  heartPath(ctx, s);
  ctx.stroke();

  ctx.restore();
}

function drawParticles(){
  for (const p of particles){
    drawTexturedHeart(p.x, p.y, p.s, p.c, p.rot);
  }
}

// ============================
// TEXTO
// ============================
async function typeWords(el, text, speedMs){
  el.classList.add("visible");
  el.textContent = "";
  const parts = text.split(/(\s+)/);
  for (const part of parts){
    el.textContent += part;
    await sleep(speedMs);
  }
}
function showTextLayer(){
  textLayer.classList.remove("hidden");
  void textLayer.offsetWidth;
  textLayer.classList.add("show");
}
async function revealText(){
  showTextLayer();
  await typeWords(line1, PHRASES[0], 70);
  await sleep(160);
  await typeWords(line2, PHRASES[1], 45);
  await sleep(160);
  await typeWords(line3, PHRASES[2], 55);
  startTimer();
}
function startTimer(){
  function tick(){
    const now = new Date();
    const diff = now - START_DATE;
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
// TIMELINE
// ============================
let started = false;
let tStart = 0;

function render(ts){
  if (!started) return;

  const { w, h, crownCx, crownCy } = layout();
  ctx.clearRect(0,0,w,h);

  drawGround();

  const t = (ts - tStart) / 1000;

  // 1) tronco
  const trunkP = Math.min(t / TRUNK_SECONDS, 1);
  drawTrunk(trunkP);

  // preparar targets al empezar corazones
  if (t >= TRUNK_SECONDS && outlineTargets.length === 0){
    const size = w * 0.14;           // tamaño real del corazón relleno
    targets = generateHeartTargets(crownCx, crownCy, size, 320);
    outlineTargets = generateOutlineTargets(crownCx, crownCy, size, 180);
    startHeartsAt = ts;
  }

  // 2) corazones vuelan durante HEARTS_SECONDS
  if (t >= TRUNK_SECONDS){
    const heartsT = (ts - startHeartsAt) / 1000;
    const heartsP = Math.min(heartsT / HEARTS_SECONDS, 1);

    // cantidad moderada para que no tarde
    const targetCount = 260;
    const spawnPerFrame = 4; // rápido
    if (particles.length < Math.floor(targetCount * heartsP)){
      for (let i=0;i<spawnPerFrame;i++){
        if (particles.length < Math.floor(targetCount * heartsP)) spawnParticle();
      }
    }

    // fuerza más alta para que se acomoden rápido
    updateParticles(1/60, 0.0022);
    drawParticles();

    // 3) settle corto y mostrar texto
    if (heartsP >= 1){
      const settleT = heartsT - HEARTS_SECONDS;
      if (settleT < SETTLE_SECONDS){
        updateParticles(1/60, 0.0030);
      } else {
        if (!textLayer.classList.contains("show")) revealText();
      }
    }
  }

  requestAnimationFrame(render);
}

// START
startBtn.addEventListener("click", async ()=>{
  intro.style.transition = "opacity 280ms ease";
  intro.style.opacity = "0";
  await sleep(260);
  intro.style.display = "none";

  await startMusic();

  started = true;
  tStart = performance.now();
  requestAnimationFrame(render);
});
