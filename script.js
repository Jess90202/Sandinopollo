const startBtn = document.getElementById("startBtn");
const intro = document.getElementById("intro");
const content = document.getElementById("content");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const text1 = document.getElementById("text1");
const text2 = document.getElementById("text2");
const timer = document.getElementById("timer");

const START_DATE = new Date("2025-02-15T00:00:00"); // cámbiala si quieres

const TEXT_1 = "Para el amor de mi existencia:";
const TEXT_2 = "Si pudiera elegir un lugar seguro sería a tu lado. Cuanto más tiempo estoy contigo más te amo.";

function resize(){
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
window.addEventListener("resize", resize);
resize();

// -------- CORAZÓN RELLENO --------
function insideHeart(x,y){
  const a = x*x + y*y - 1;
  return (a*a*a - x*x*y*y*y) <= 0;
}

let particles = [];

function createHeart(){
  particles = [];
  const cx = canvas.width/2;
  const cy = canvas.height/2;
  const size = Math.min(canvas.width,canvas.height)*0.22;

  for(let i=0;i<900;i++){
    let x,y;
    do{
      x = Math.random()*2-1;
      y = Math.random()*2-1;
    }while(!insideHeart(x,y));

    particles.push({
      x: cx + x*size,
      y: cy - y*size,
      size: 4 + Math.random()*5,
      color: `hsl(${340+Math.random()*20},70%,${50+Math.random()*20}%)`
    });
  }
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  particles.forEach(p=>{
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
    ctx.fillStyle = p.color;
    ctx.fill();
  });
}

function animateHeart(){
  createHeart();
  draw();
  showText();
}

// -------- TEXTO --------
async function typeText(el,text,speed){
  el.textContent="";
  for(let i=0;i<text.length;i++){
    el.textContent+=text[i];
    await new Promise(r=>setTimeout(r,speed));
  }
}

async function showText(){
  content.classList.remove("hidden");
  await typeText(text1,TEXT_1,40);
  await typeText(text2,TEXT_2,25);
  startTimer();
}

// -------- TIMER --------
function startTimer(){
  function update(){
    const diff = new Date()-START_DATE;
    const total = Math.floor(diff/1000);
    const days = Math.floor(total/86400);
    const hours = Math.floor((total%86400)/3600);
    const minutes = Math.floor((total%3600)/60);
    const seconds = total%60;
    timer.textContent = `${days} días ${hours} horas ${minutes} minutos ${seconds} segundos`;
  }
  update();
  setInterval(update,1000);
}

// -------- START --------
startBtn.addEventListener("click",()=>{
  intro.style.display="none";
  animateHeart();
});
