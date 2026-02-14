// ============================
// CONFIG
// ============================
const START_DATE = new Date("2025-02-15T00:00:00"); // <- cámbiala

const PHRASES = [
  "Para el amor de mi existencia:",
  "Si pudiera elegir un lugar seguro sería a tu lado.
Cuanto más tiempo estoy contigo más te amo."
];

const HEART_COLORS = ["#d3122f", "#ff2d55", "#ff5c8a", "#ff7aa6", "#ff8fb3", "#c2185b", "#b5179e"];

// Timeline (rápido y controlado)
const TRUNK_SECONDS  = 1.2;
const HEARTS_SECONDS = 1.15;
const SETTLE_SECONDS = 0.25;

// Letras (más lento y legible)
const SPEED_TITLE = 170;
const SPEED_BODY  = 120;
const SPEED_SIGN  = 160;

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
window.addEventListener("resize", () => {
  resize();
  if (started){ resetHearts(); resetAmbient(); } // reacomoda en rotación/cambio tamaño
});
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
  try{ bgm.volume = 0.45; await bgm.play(); }catch(e){}
}
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

// ============================
// LAYOUT: desktop vs mobile
// ============================
function isMobile(){
  return canvas.getBoundingClientRect().width < 620;
}

function layout(){
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;
  const groundY = h * 0.84;

  if (isMobile()){
    // Móvil: árbol visible a la derecha (estilo video)
    const treeX = w * 0.82;
    const treeY = groundY;
    const crownCx = treeX;
    const crownCy = h * 0.47;
    const heartSize = w * 0.19;
    return { w, h, groundY, treeX, treeY, crownCx, crownCy, heartSize };
  } else {
    const treeX = w * 0.84;
    const treeY = groundY;
    const crownCx = treeX;
    const crownCy = h * 0.34;
    const heartSize = w * 0.17;
    return { w, h, groundY, treeX, treeY, crownCx, crownCy, heartSize };
  }
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
  const maxH = (treeY - crownCy) * 0.98;
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

  if (progress > 0.55){
    ctx.strokeStyle = "#6f3a1f";
    ctx.lineWidth = 2;
    const k = (progress - 0.55) / 0.45;

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

// ============================
// HEART TARGETS: RELLENO + BORDE
// ============================
function insideHeart(nx, ny){
  const a = nx*nx + ny*ny - 1;
  return (a*a*a - nx*nx*ny*ny*ny) <= 0;
}

function makeTargets(cx, cy, size, fillCount, outlineCount){
  const fill = [];
  let guard = 0;
  while (fill.length < fillCount && guard < fillCount * 80){
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

// ============================
// PARTICULAS: pre-creadas + easing (ULTRA RÁPIDO)
// ============================
const particles = [];
let targets = [];

function rand(min,max){ return min + Math.random()*(max-min); }

function resetHearts(){
  particles.length = 0;

  const { w, h, crownCx, crownCy, heartSize } = layout();
  targets = makeTargets(crownCx, crownCy, heartSize, 360, 240);

  const N = 360; // pétalos totales
  for (let i=0;i<N;i++){
    const t = targets[i % targets.length];

    const x0 = w + rand(20, 160);
    const y0 = h * rand(0.24, 0.80);

    particles.push({
      x0, y0, x: x0, y: y0,
      tx: t.x + rand(-4,4),
      ty: t.y + rand(-4,4),
      s: rand(7, 12),
      c: HEART_COLORS[(Math.random()*HEART_COLORS.length)|0],
      rot: rand(0, Math.PI*2),
      vr: rand(-0.05, 0.05)
    });
  }
}

function easeOutCubic(x){ return 1 - Math.pow(1 - x, 3); }

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

  const g = ctx.createRadialGradient(-s*0.25, -s*0.35, s*0.3, 0, 0, s*1.2);
  g.addColorStop(0, "#ffe6ef");
  g.addColorStop(0.22, color);
  g.addColorStop(1, "#7a0a1e");

  heartPath(s);
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
  heartPath(s);
  ctx.stroke();

  ctx.restore();
}

function drawHearts(progress){
  const p = easeOutCubic(progress);
  for (const h of particles){
    h.x = h.x0 + (h.tx - h.x0) * p;
    h.y = h.y0 + (h.ty - h.y0) * p;
    h.rot += h.vr;

    const flutter = (1 - p) * Math.sin((h.x0 + h.y0) * 0.02 + progress*14) * 2.0;
    drawTexturedHeart(h.x, h.y + flutter, h.s, h.c, h.rot);
  }
}

// ============================
// AMBIENT HEARTS (suaves, como en el video)
// ============================
const ambient = [];
function resetAmbient(){
  ambient.length = 0;
  const { w, h } = layout();
  const count = isMobile() ? 12 : 18;
  for (let i=0;i<count;i++){
    ambient.push({
      x: w * (0.15 + Math.random()*0.55),
      y: h * (0.58 + Math.random()*0.22),
      vx: -0.10 - Math.random()*0.25,
      vy: -0.15 - Math.random()*0.35,
      s: 5 + Math.random()*6,
      c: HEART_COLORS[(Math.random()*HEART_COLORS.length)|0],
      rot: Math.random()*Math.PI*2,
      vr: (-0.03 + Math.random()*0.06)
    });
  }
}
function stepAmbient(){
  const { w, h } = layout();
  for (const a of ambient){
    a.x += a.vx * 2.0;
    a.y += a.vy * 2.0;
    a.rot += a.vr;
    if (a.y < h*0.34 || a.x < -40){
      a.x = w * (0.62 + Math.random()*0.25);
      a.y = h * (0.78 + Math.random()*0.10);
    }
    drawTexturedHeart(a.x, a.y, a.s, a.c, a.rot);
  }
}

// ============================
// TEXTO (más parecido al video: palabra a palabra + cursor)
// ============================
let textStarted = false;

function withCursor(s){ return s + " _"; }

async function typeWords(el, text, speedMs){
  el.classList.add("visible");
  el.textContent = "";
  const parts = text.split(/(\s+)/);
  for (const part of parts){
    el.textContent += part;
    el.textContent = withCursor(el.textContent.replace(/\s_$/,""));
    await sleep(speedMs);
  }
  el.textContent = el.textContent.replace(/\s_$/,"");
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
// TIMELINE
// ============================
let started = false;
let tStart = 0;

function render(ts){
  if (!started) return;

  const { w, h } = layout();
  ctx.clearRect(0,0,w,h);
  drawGround();

  const t = (ts - tStart) / 1000;

  // 1) tronco
  const trunkP = Math.min(t / TRUNK_SECONDS, 1);
  drawTrunk(trunkP);

  // 2) corazones
  if (t >= TRUNK_SECONDS){
    const ht = t - TRUNK_SECONDS;
    const heartsP = Math.min(ht / HEARTS_SECONDS, 1);

    drawTrunk(1);
    drawHearts(heartsP);
    stepAmbient();

    if (heartsP >= 1){
      const settleT = ht - HEARTS_SECONDS;
      if (settleT >= SETTLE_SECONDS){
        revealText();
      }
    }
  }

  requestAnimationFrame(render);
}

// ============================
// START
// ============================
startBtn.addEventListener("click", async ()=>{
  intro.style.transition = "opacity 260ms ease";
  intro.style.opacity = "0";
  await sleep(240);
  intro.style.display = "none";

  await startMusic();

  resetHearts();
  resetAmbient();
  started = true;
  tStart = performance.now();
  requestAnimationFrame(render);
});
