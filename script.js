const START_DATE = new Date("2025-02-15T00:00:00");

const PHRASES = [
  "Para el amor de mi vida:",
  "Si pudiera elegir un lugar seguro, sería a tu lado.",
  "— I Love You!"
];

const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");

function resize(){
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}
window.addEventListener("resize", resize);
resize();

let phase = "idle";
let trunk = 0;
let particles = [];
let targets = [];

function heartPoints(cx, cy, size, count){
  let pts=[];
  for(let i=0;i<count;i++){
    const t = (i/count)*Math.PI*2;
    const x = 16*Math.pow(Math.sin(t),3);
    const y = 13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);
    pts.push({x:cx+x*size,y:cy-y*size});
  }
  return pts;
}

function spawn(){
  const w=canvas.width,h=canvas.height;
  const side=Math.random()<0.5?-20:w+20;
  const y=h*(0.3+Math.random()*0.4);
  const target=targets[Math.floor(Math.random()*targets.length)];
  particles.push({x:side,y,tx:target.x,ty:target.y});
}

function update(){
  particles.forEach(p=>{
    p.x+=(p.tx-p.x)*0.02;
    p.y+=(p.ty-p.y)*0.02;
  });
}

function drawHeart(x,y,s){
  ctx.fillStyle="#d3122f";
  ctx.beginPath();
  ctx.moveTo(x,y);
  ctx.bezierCurveTo(x-10,y-15,x-30,y+10,x,y+25);
  ctx.bezierCurveTo(x+30,y+10,x+10,y-15,x,y);
  ctx.fill();
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const baseY=canvas.height*0.85;
  const x=canvas.width*0.7;

  ctx.fillStyle="#8a4d2b";
  ctx.fillRect(x-8,baseY-trunk,16,trunk);

  particles.forEach(p=>drawHeart(p.x,p.y,6));
}

function animate(){
  draw();
  if(phase==="grow"){
    trunk+=2;
    if(trunk>canvas.height*0.4){
      phase="hearts";
      targets=heartPoints(canvas.width*0.7,canvas.height*0.35,8,200);
    }
  }
  if(phase==="hearts"){
    if(particles.length<200) spawn();
    update();
    if(particles.length>=200) phase="text";
  }
  requestAnimationFrame(animate);
}
animate();

document.getElementById("startBtn").onclick=async()=>{
  document.getElementById("intro").style.display="none";
  document.getElementById("bgm").play().catch(()=>{});
  phase="grow";
  setTimeout(showText,4000);
};

async function typeWords(el,text){
  el.classList.add("visible");
  el.textContent="";
  const words=text.split(" ");
  for(const w of words){
    el.textContent+=w+" ";
    await new Promise(r=>setTimeout(r,80));
  }
}

function showText(){
  const layer=document.getElementById("textLayer");
  layer.classList.remove("hidden");
  layer.classList.add("show");
  typeWords(document.getElementById("line1"),PHRASES[0]);
  setTimeout(()=>typeWords(document.getElementById("line2"),PHRASES[1]),1000);
  setTimeout(()=>typeWords(document.getElementById("line3"),PHRASES[2]),2000);
  startTimer();
}

function startTimer(){
  const el=document.getElementById("timerValue");
  function tick(){
    const diff=new Date()-START_DATE;
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
