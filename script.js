const START_DATE = new Date("2025-02-15T00:00:00");

const PHRASES = [
  "Para el amor de mi vida:",
  "Si pudiera elegir un lugar seguro, sería a tu lado.",
  "— I Love You!"
];

const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener("resize", resize);
resize();

let phase = "idle";
let trunkHeight = 0;

function drawTrunk(){
  const baseY = canvas.height * 0.85;
  const centerX = canvas.width * 0.7;
  ctx.fillStyle="#8a4d2b";
  ctx.fillRect(centerX-10, baseY-trunkHeight, 20, trunkHeight);
}

function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(phase==="grow"){
    trunkHeight += 2;
    drawTrunk();
    if(trunkHeight > canvas.height*0.4){
      phase="done";
      showText();
    }
  }
  requestAnimationFrame(animate);
}
animate();

document.getElementById("startBtn").onclick = ()=>{
  document.getElementById("intro").style.display="none";
  document.getElementById("bgm").play().catch(()=>{});
  phase="grow";
};

async function typeWords(el,text){
  el.textContent="";
  const words=text.split(" ");
  for(const w of words){
    el.textContent+=w+" ";
    await new Promise(r=>setTimeout(r,120));
  }
}

async function showText(){
  const layer=document.getElementById("textLayer");
  layer.classList.remove("hidden");
  await typeWords(document.getElementById("line1"),PHRASES[0]);
  await typeWords(document.getElementById("line2"),PHRASES[1]);
  await typeWords(document.getElementById("line3"),PHRASES[2]);
  startTimer();
}

function startTimer(){
  const el=document.getElementById("timerValue");
  function tick(){
    const now=new Date();
    const diff=now-START_DATE;
    const s=Math.floor(diff/1000);
    const d=Math.floor(s/86400);
    const h=Math.floor((s%86400)/3600);
    const m=Math.floor((s%3600)/60);
    const sec=s%60;
    el.textContent=`${d} días ${h} horas ${m} minutos ${sec} segundos`;
  }
  tick();
  setInterval(tick,1000);
}
