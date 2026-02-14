const START_DATE = new Date("2025-02-15T00:00:00"); // <- cámbiala

const PHRASES = [
  "Para el amor de mi vida:",
  "Si pudiera elegir un lugar seguro, sería a tu lado.\nCuanto más tiempo estoy contigo, más te amo.",
  "— Te amo mi amorcito"
];

const HEART_COLORS = ["#d3122f", "#ff2d55", "#ff5c8a", "#ff7aa6", "#ff8fb3", "#c2185b", "#b5179e"];

// Duración rápida
const TRUNK_SECONDS  = 1.6;
const HEARTS_SECONDS = 2.3;
const SETTLE_SECONDS = 0.6;

// Letras más lentas
const SPEED_TITLE = 120;
const SPEED_BODY  = 85;
const SPEED_SIGN  = 110;

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

const intro = document.getElementById("intro");
const startBtn = document.getElementById("startBtn");
const bgm = document.getElementById("bgm");
const textLayer = document.getElementById("textLayer");
const line1 = document.getElementById("line1");
const line2 = document.getElementById("line2");
const line3 = document.getElementById("line3");
const timerValue = document.getElementById("timerValue");

async function startMusic(){
  try{ bgm.volume = 0.45; await bgm.play(); } catch(e){}
}
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

function layout(){
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;
  const groundY = h * 0.84;

  const treeX = w * 0.86;
  const treeY = groundY;
  const crownCx = w * 0.86;
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

function drawTrunk(progress){
  const { w, treeX, treeY, crownCy } = layout();
  const maxH = (treeY - crownCy) * 0.95;
  const hh = maxH * progress;

  const baseW = w * 0.028;
  const topW  = w * 0.012;

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
      {dx: -w*0.06, dy: -w*0.02},
      {dx:  w*0.06, dy: -w*0.02},
      {dx: -w*0.045, dy: -w*0.055},
      {dx:  w*0.045, dy: -w*0.055},
    ];
    branches.forEach(b=>{
      ctx.beginPath();
      ctx.moveTo(treeX, yTop + 22);
      ctx.lineTo(treeX + b.dx*k, (yTop + 22) + b.dy*k);
      ctx.stroke();
    });
  }
  ctx.restore();
}

// ===== Heart targets (filled) =====
function insideHeart(nx, ny){
  const a = nx*nx + ny*ny - 1;
  return (a*a*a - nx*nx*ny*ny*ny) <= 0;
}
function generateHeartTargets(cx, cy, size, count){
  const pts = [];
  let guard = 0;
  while (pts.length < count && guard < count * 60){
    guard++;
    const nx = (Math.random()*2.2 - 1.1);
    const ny = (Math.random()*2.2 - 1.1);
    if (insideHeart(nx, ny)){
      pts.push({ x: cx + nx*size, y: cy - ny*size });
    }
  }
  return pts;
}
function generateOutlineTargets(cx, cy, size, count){
  const pts = [];
  for (let i=0;i<count;i++){
    const t = (i/count) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t),3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
    pts.push({ x: cx + x*(size*0.085), y: cy - y*(size*0.085) });
  }
  return pts;
}

const particles = [];
let targets = [];
let outlineTargets = [];
let startHeartsAt = 0;

function rand(min,max){ return min + Math.random()*(max-min); }

function spawnParticle(){
  const { w, h } = layout();
  // solo lado derecho (no tapa texto)
  const x = w + 30;
  const y = h * rand(0.22, 0.78);

  const useOutline = Math.random() < 0.32;
  const t = useOutline
    ? outlineTargets[(Math.random()*outlineTargets.length)|0]
    : targets[(Math.random()*targets.length)|0];

  const s = rand(7, 12);
  const c = HEART_COLORS[(Math.random()*HEART_COLORS.length)|0];

  particles.push({
    x, y,
    vx: rand(-3.3, -1.8),
    vy: rand(-0.7, 0.7),
    rot: rand(0, Math.PI*2),
    vr: rand(-0.06, 0.06),
    s, c,
    tx: t.x + rand(-6,6),
    ty: t.y + rand(-6,6),
    settled: false
  });
}

function updateParticles(dt, strength){
  for (const p of particles){
    const ax = (p.tx - p.x) * strength;
    const ay = (p.ty - p.y) * strength;

    p.vx = p.vx * 0.88 + ax * dt;
    p.vy = p.vy * 0.88 + ay * dt;

    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.rot += p.vr;

    const dx = p.tx - p.x, dy = p.ty - p.y;
    if (!p.settled && (dx*dx + dy*dy) < 55){
      p.settled = true;
      p.vx *= 0.12; p.vy *= 0.12; p.vr *= 0.12;
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

// ===== Text =====
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
function showTextLayer(){
  textLayer.classList.remove("hidden");
  void textLayer.offsetWidth;
  textLayer.classList.add("show");
}
async function revealText(){
  if (textStarted) return;
  textStarted = true;

  showTextLayer();
  await typeWords(line1, PHRASES[0], SPEED_TITLE);
  await sleep(600);
  await typeWords(line2, PHRASES[1], SPEED_BODY);
  await sleep(650);
  await typeWords(line3, PHRASES[2], SPEED_SIGN);
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

// ===== Timeline =====
let started = false;
let tStart = 0;

function render(ts){
  if (!started) return;

  const { w, h, crownCx, crownCy } = layout();
  ctx.clearRect(0,0,w,h);
  drawGround();

  const t = (ts - tStart) / 1000;

  const trunkP = Math.min(t / TRUNK_SECONDS, 1);
  drawTrunk(trunkP);

  if (t >= TRUNK_SECONDS && outlineTargets.length === 0){
    const size = w * 0.15;
    targets = generateHeartTargets(crownCx, crownCy, size, 380);
    outlineTargets = generateOutlineTargets(crownCx, crownCy, size, 220);
    startHeartsAt = ts;

    for (let i=0;i<30;i++) spawnParticle();
  }

  if (t >= TRUNK_SECONDS){
    const heartsT = (ts - startHeartsAt) / 1000;
    const heartsP = Math.min(heartsT / HEARTS_SECONDS, 1);

    const targetCount = 260;
    const shouldHave = Math.floor(targetCount * heartsP);

    while (particles.length < shouldHave){
      spawnParticle();
    }

    updateParticles(1/60, 0.0036);
    drawParticles();

    if (heartsP >= 1){
      const settleT = heartsT - HEARTS_SECONDS;
      if (settleT < SETTLE_SECONDS){
        updateParticles(1/60, 0.0045);
      } else {
        revealText();
      }
    }
  }

  requestAnimationFrame(render);
}

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
