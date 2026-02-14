const START_DATE = new Date("2025-02-15T00:00:00");

const PHRASES = [
  "Para el amor de mi existencia:",
  "Si pudiera elegir un lugar seguro sería a tu lado. Cuanto más tiempo estoy contigo más te amo."
];

const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const intro = document.getElementById("intro");
const textLayer = document.getElementById("textLayer");
const line1 = document.getElementById("line1");
const line2 = document.getElementById("line2");
const timerValue = document.getElementById("timerValue");
const bgm = document.getElementById("bgm");

function resize(){
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
window.addEventListener("resize", resize);
resize();

// ---------- CORAZÓN GRANDE ----------
let hearts = [];

function createHearts(){
  hearts = [];
  const cx = canvas.width*0.78;
  const cy = canvas.height*0.4;
  const size = canvas.width*0.15;

  for(let i=0;i<350;i++){
    const t = Math.random()*Math.PI*2;
    const r = Math.random();
    const x = 16*Math.pow(Math.sin(t),3);
    const y = 13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);

    hearts.push({
      tx: cx + x*size*0.08*r,
      ty: cy - y*size*0.08*r,
      x: canvas.width + Math.random()*200,
      y: canvas.height*Math.random(),
      progress:0
    });
  }
}

function drawHeart(x,y,s){
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x+6, y-8, x+12, y+4, x, y+12);
  ctx.bezierCurveTo(x-12, y+4, x-6, y-8, x, y);
  ctx.fillStyle = "crimson";
  ctx.fill();
}

function animateHearts(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  hearts.forEach(h=>{
    h.progress += 0.02;
    if(h.progress>1) h.progress=1;
    h.x += (h.tx - h.x)*0.08;
    h.y += (h.ty - h.y)*0.08;
    drawHeart(h.x,h.y,8);
  });

  if(hearts[0].progress < 1){
    requestAnimationFrame(animateHearts);
  } else {
    showText();
  }
}

// ---------- TEXTO ----------
async function typeText(el,text,speed){
  el.textContent="";
  for(let i=0;i<text.length;i++){
    el.textContent += text[i];
    await new Promise(r=>setTimeout(r,speed));
  }
}

async function showText(){
  textLayer.classList.remove("hidden");
  textLayer.classList.add("show");
  await typeText(line1, PHRASES[0], 60);
  await typeText(line2, PHRASES[1], 40);
  startTimer();
}

function startTimer(){
  function tick(){
    const diff = new Date()-START_DATE;
    const days = Math.floor(diff/86400000);
    const hours = Math.floor((diff%86400000)/3600000);
    timerValue.textContent = `${days} días ${hours} horas`;
  }
  tick();
  setInterval(tick,1000);
}

// ---------- START ----------
startBtn.addEventListener("click", ()=>{
  intro.style.display="none";
  bgm.play().catch(()=>{});
  createHearts();
  animateHearts();
});
