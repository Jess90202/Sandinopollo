// ============================
// CONFIG
// ============================
const START_DATE = new Date("2025-02-15T00:00:00"); // <- cámbiala

const PHRASES = [
  "Para el amor de mi vida:",
  "Si pudiera elegir un lugar seguro, sería a tu lado.\nCuanto más tiempo estoy contigo, más te amo.",
  "— Te amo mi amorcito"
];

// Paleta variada (rojos, rosas, coral, lila)
const HEART_COLORS = ["#d3122f", "#ff2d55", "#ff5c8a", "#ff7aa6", "#ff8fb3", "#c2185b", "#b5179e"];

// ============================
// CANVAS SETUP
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

// ============================
// LAYOUT
// ============================
function layout(){
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;

  const groundY = h * 0.84;

  // Árbol a la derecha (deja espacio al texto)
  const treeX = w * 0.74;
  const treeY = groundY;

  // Copa (corazón) arriba del tronco
  const crownCx = w * 0.74;
  const crownCy = h * 0.38;

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
// TRUNK (crece)
// ============================
let phase = "idle"; // idle -> trunk -> hearts -> settle -> text
let trunkProgress = 0;

function drawTrunk(progress){
  const { w, treeX, treeY, crownCy } = layout();
  const maxH = (treeY - crownCy) * 0.90;
  const h = maxH * progress;

  const baseW = w * 0.030;
  const topW  = w * 0.013;

  const yTop = treeY - h;

  ctx.save();
  ctx.fillStyle = "#8a4d2b";
  ctx.beginPath();
  ctx.moveTo(treeX - baseW/2, treeY);
  ctx.lineTo(treeX + baseW/2, treeY);
  ctx.lineTo(treeX + topW/2, yTop);
  ctx.lineTo(treeX - topW/2, yTop);
  ctx.closePath();
  ctx.fill();

  // ramitas suaves
  if (progress > 0.6){
    ctx.strokeStyle = "#6f3a1f";
    ctx.lineWidth = 2;
    const k = (progress - 0.6) / 0.4;

    const branches = [
      {dx: -w*0.08, dy: -w*0.03},
      {dx:  w*0.08, dy: -w*0.03},
      {dx: -w*0.05, dy: -w*0.07},
      {dx:  w*0.05, dy: -w*0.07},
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
// HEART TARGETS (copa en forma de corazón)
// ============================
function heartCurvePoints(cx, cy, size, n){
  const pts = [];
  for (let i=0;i<n;i++){
    const t = (i/n) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t),3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
    pts.push({ x: cx + x*size, y: cy - y*size });
  }
  return pts;
}

// ============================
// HEART PARTICLES (vuelo + asentado)
// ============================
const particles = [];
let targets = [];
let spawnCount = 0;
let settleStartedAt = 0;

function rand(min,max){ return min + Math.random()*(max-min); }

function spawnParticle(){
  const { w, h, crownCx, crownCy } = layout();

  // Spawn desde zonas laterales para que "vuelen" hacia el árbol sin tapar el texto
  const fromLeft = Math.random() < 0.65;
  const x = fromLeft ? -30 : w + 30;
  const y = h * rand(0.25, 0.75);

  const t = targets[spawnCount % targets.length];
  spawnCount++;

  const size = rand(7, 12);
  const color = HEART_COLORS[(Math.random() * HEART_COLORS.length) | 0];

  particles.push({
    x, y,
    vx: fromLeft ? rand(1.2, 2.2) : rand(-2.2, -1.2),
    vy: rand(-0.6, 0.6),
    rot: rand(0, Math.PI*2),
    vr: rand(-0.05, 0.05),
    s: size,
    c: color,
    tx: t.x + rand(-10,10),
    ty: t.y + rand(-10,10),
    settled: false
  });
}

function updateParticles(dt, strength){
  for (const p of particles){
    const ax = (p.tx - p.x) * strength;
    const ay = (p.ty - p.y) * strength;

    p.vx = p.vx * 0.92 + ax * dt;
    p.vy = p.vy * 0.92 + ay * dt;

    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;

    p.rot += p.vr;

    const dx = p.tx - p.x, dy = p.ty - p.y;
    if (!p.settled && (dx*dx + dy*dy) < 80){
      p.settled = true;
      p.vx *= 0.2; p.vy *= 0.2; p.vr *= 0.2;
    }
  }
}

function heartPath(ctx, s){
  // Heart centered at (0,0)
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

  // "Textura": degradado + highlight
  const g = ctx.createRadialGradient(-s*0.25, -s*0.35, s*0.3, 0, 0, s*1.2);
  g.addColorStop(0, "#ffe6ef");
  g.addColorStop(0.22, color);
  g.addColorStop(1, "#7a0a1e");

  heartPath(ctx, s);
  ctx.fillStyle = g;
  ctx.fill();

  // brillo suave
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.ellipse(-s*0.25, -s*0.25, s*0.35, s*0.22, -0.6, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // borde tenue
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
// TEXT (palabra por palabra + fade-in)
// ============================
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

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
  await typeWords(line1, PHRASES[0], 80);
  await sleep(220);
  await typeWords(line2, PHRASES[1], 55);
  await sleep(220);
  await typeWords(line3, PHRASES[2], 70);
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
// MAIN LOOP
// ============================
let last = 0;
function frame(ts){
  if (!last) last = ts;
  const dt = Math.min((ts-last)/1000, 0.033);
  last = ts;

  const { w, h, crownCx, crownCy } = layout();

  // clear
  ctx.clearRect(0,0,w,h);

  // background elements (ground)
  drawGround();

  if (phase === "trunk"){
    trunkProgress = Math.min(trunkProgress + dt*0.55, 1);
    drawTrunk(trunkProgress);

    if (trunkProgress >= 1){
      // prepara targets de copa (más puntos para forma limpia)
      targets = heartCurvePoints(crownCx, crownCy, w*0.0105, 340);
      phase = "hearts";
    }
  } else if (phase === "hearts" || phase === "settle" || phase === "text"){
    drawTrunk(1);

    if (phase === "hearts"){
      // spawnea hasta llenar (sin invadir texto: la mayoría se irá al lado derecho)
      if (particles.length < 260 && Math.random() < 0.9) spawnParticle();
      updateParticles(dt, 0.0010);
      drawParticles();

      if (particles.length >= 260){
        phase = "settle";
        settleStartedAt = ts;
      }
    } else if (phase === "settle"){
      updateParticles(dt, 0.0017);
      drawParticles();

      const settled = particles.filter(p=>p.settled).length;
      // cuando ya está formado y pasó un poco de tiempo, mostrar texto
      if (settled > particles.length*0.82 && (ts - settleStartedAt) > 650){
        phase = "text";
        revealText();
      }
    } else {
      updateParticles(dt, 0.0017);
      drawParticles();
    }
  } else {
    drawTrunk(0);
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ============================
// START
// ============================
startBtn.addEventListener("click", async ()=>{
  intro.style.transition = "opacity 300ms ease";
  intro.style.opacity = "0";
  await sleep(280);
  intro.style.display = "none";

  await startMusic();
  phase = "trunk";
});
