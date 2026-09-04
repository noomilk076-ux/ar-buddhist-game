import{FilesetResolver,HandLandmarker}from"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/vision_bundle.mjs";
const WASM="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm",MODEL="https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let lm=null,stream=null,raf=0,gameKind=null,round=0,total=0,grab=null,pinch=false,finished=false;
const names={altar:"ภารกิจ ๑ · จัดโต๊ะหมู่บูชา",sort:"ภารกิจ ๒ · นักคัดแยกขยะ",quiz:"ภารกิจ ๓ · ธรรมะท้าประลอง",fill:"ภารกิจ ๔ · เติมคำธรรมะ",moral:"ภารกิจ ๕ · พุทธศาสนิกชนตัวน้อย",tree:"ภารกิจ ๖ · ต้นไม้แห่งความดี"};
const rank=n=>n>=600?"🏆 ทูตวิถีพุทธ":n>=400?"🌟 นักสืบทอดวิถีพุทธ":n>=200?"✨ นักสร้างความดี":"🌱 ผู้เริ่มต้นทำความดี";
const ui=()=>{$("#menuScore").textContent=total;$("#menuRank").textContent=rank(total)};
const add=n=>{round+=n;total+=n;$("#score").textContent=round;ui()};
function toast(s){$("#feedback").textContent=s;$("#feedback").classList.add("show");clearTimeout(toast.x);toast.x=setTimeout(()=>$("#feedback").classList.remove("show"),1100)}
async function initHand(){if(lm)return;const v=await FilesetResolver.forVisionTasks(WASM);lm=await HandLandmarker.createFromOptions(v,{baseOptions:{modelAssetPath:MODEL,delegate:"GPU"},runningMode:"VIDEO",numHands:1,minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.55})}
async function camera(){try{await initHand();stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:1280},height:{ideal:720}},audio:false});$("#camera").srcObject=stream;await $("#camera").play();$("#status").textContent="กล้องพร้อมแล้ว ✓";loop()}catch(e){console.warn(e);$("#status").textContent="เปิดกล้องไม่ได้ — สามารถแตะหน้าจอเพื่อทดสอบได้";loop()}}
function loop(){cancelAnimationFrame(raf);const f=()=>{const v=$("#camera");if(lm&&v.readyState>=2&&gameKind){const r=lm.detectForVideo(v,performance.now());if(r.landmarks?.[0]){const a=r.landmarks[0],x=(1-a[8].x)*innerWidth,y=a[8].y*innerHeight,d=Math.hypot(a[8].x-a[4].x,a[8].y-a[4].y),p=d<.062||pinch&&d<.085;pointer(x,y);if(p&&!pinch)grab=hit(x,y);if(p&&grab)move(grab,x,y);if(!p&&pinch&&grab){release(grab,x,y);grab=null}pinch=p}else $("#pointer").style.display="none"}raf=requestAnimationFrame(f)};f()}
function pointer(x,y){const p=$("#pointer");p.style.display="block";p.style.left=x-19+"px";p.style.top=y-19+"px";p.classList.toggle("pointerDown",pinch)}
function hit(x,y){return $$("#area [data-drag],#area .answer,#area .choice,#area .virtue").find(e=>{const r=e.getBoundingClientRect();return x>r.left&&x<r.right&&y>r.top&&y<r.bottom})}
function move(e,x,y){e.style.position="fixed";e.style.left=x-e.offsetWidth/2+"px";e.style.top=y-e.offsetHeight/2+"px";e.style.zIndex=90}
function release(e,x,y){if(gameKind==="altar")altarRelease(e,x,y);else if(gameKind==="sort")sortRelease(e,x,y);else if(gameKind==="fill")checkFill(e);else if(gameKind==="tree")treeRelease(e,x,y);else if(gameKind==="quiz"||gameKind==="moral")e.click()}
function setup(kind){gameKind=kind;round=0;finished=false;grab=null;pinch=false;$("#score").textContent=0;$("#gameName").textContent=names[kind];$("#permissionTitle").textContent=names[kind];$("#menu").classList.add("hidden");$("#result").classList.add("hidden");$("#permission").classList.remove("hidden")}
function startGame(){$("#permission").classList.add("hidden");$("#game").classList.remove("hidden");({altar,sort,quiz,fill,moral,tree}[gameKind])()}
function finish(msg){if(finished)return;finished=true;$("#resultTitle").textContent=msg;$("#resultRound").textContent="+"+round;$("#resultTotal").textContent=total;$("#resultRank").textContent=rank(total);$("#game").classList.add("hidden");$("#result").classList.remove("hidden")}
function stopCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}cancelAnimationFrame(raf)}
function resetDrag(e){e.style.position="";e.style.left="";e.style.top="";e.style.zIndex=""}

const altarPieces=Array.from({length:9},(_,i)=>i+1);
function altar(){
$("#title").innerHTML="<h2>จัดโต๊ะหมู่บูชา</h2><p>ประกอบโต๊ะหมู่ ๙ และจัดเครื่องบูชาให้ครบ</p>";
$("#hint").textContent="🤏 หยิบโต๊ะและเครื่องบูชาไปวางตามตำแหน่งที่เหมาะสม";
$("#area").innerHTML='<div class="altarBoard"></div><div class="tray"><div class="trayLabel">โต๊ะหมู่ ๙</div></div>';
const board=$("#area .altarBoard"),tray=$("#area .tray");
altarPieces.forEach((n,i)=>{let s=document.createElement("div");s.className="tierSlot";s.dataset.slot=n;s.textContent="โต๊ะ "+n;s.style.width=(18+i%3*4)+"%";s.style.height="15%";s.style.left=(41-i%3*10)+"%";s.style.top=(8+Math.floor(i/3)*19)+"%";board.appendChild(s);
let p=document.createElement("div");p.className="piece";p.dataset.drag="1";p.dataset.slot=n;p.textContent="โต๊ะ "+n;tray.appendChild(p)});
[["🪷","buddha"],["🪔","incense"],["🕯️","candle"],["🌸","flower"],["💐","phaan"]].forEach(([em,type])=>{let p=document.createElement("div");p.className="ritual";p.dataset.drag="1";p.dataset.ritual=type;p.textContent=em;tray.appendChild(p)});
}
function altarRelease(e,x,y){
const slot=$$("#area .tierSlot").find(s=>{let r=s.getBoundingClientRect();return x>r.left&&x<r.right&&y>r.top&&y<r.bottom});
if(e.dataset.ritual){if(slot){e.remove();add(5);toast("จัดเครื่องบูชาแล้ว +5")}else resetDrag(e)}
else if(slot&&slot.dataset.slot===e.dataset.slot){e.remove();slot.textContent="✓ โต๊ะ "+slot.dataset.slot;slot.style.borderStyle="solid";slot.style.background="#ffd36e30";add(5);toast("วางโต๊ะถูกตำแหน่ง +5")}
else resetDrag(e);
const pieces=$$("#area .piece"),rituals=$$("#area .ritual");
if(!pieces.length&&!rituals.length)finish("จัดโต๊ะหมู่บูชาครบถ้วนแล้ว 🪷");
}

function sort(){
let ws=[["🍌","green"],["🥤","blue"],["📦","blue"],["🔋","red"],["🍎","green"],["🧴","red"],["📰","yellow"],["💡","red"]];
$("#title").innerHTML="<h2>นักคัดแยกขยะ</h2><p>แยกให้ถูกถัง รักษ์โรงเรียน รักษ์โลก</p>";$("#hint").textContent="🤏 หยิบขยะแล้วลากลงถังให้ถูกประเภท";
$("#area").innerHTML='<div class="bins"><div class="bin green">🟢<br>ทั่วไป</div><div class="bin blue">🔵<br>รีไซเคิล</div><div class="bin yellow">🟡<br>กระดาษ</div><div class="bin red">🔴<br>อันตราย</div></div>';
ws.forEach((w,i)=>{let d=document.createElement("div");d.className="waste";d.textContent=w[0];d.dataset.drag=1;d.dataset.type=w[1];d.style.left=8+(i%4)*23+"%";d.style.top=10+Math.floor(i/4)*30+"%";$("#area").appendChild(d)})
}
function sortRelease(e,x,y){let b=$$("#area .bin").find(q=>{let r=q.getBoundingClientRect();return x>r.left&&x<r.right&&y>r.top&&y<r.bottom}),c=b&&["green","blue","yellow","red"].find(k=>b.classList.contains(k));if(c===e.dataset.type){e.remove();add(10);toast("แยกถูกต้อง +10");if(!$("#area .waste"))finish("แยกขยะครบแล้ว 🎉")}else{resetDrag(e);toast("ลองใหม่อีกครั้ง 💡")}}

const qs=[
["ข้อใดเป็นความจริงของอริยสัจ ๔?","ทุกข์ คือ สภาวะที่ทนได้ยาก","ทุกข์ คือ การมีความสุขตลอดเวลา"],
["ข้อใดคือสมุทัยในอริยสัจ ๔?","ตัณหา ความอยาก","ความสงบ"],
["ไตรสิกขา หมายถึงการฝึก ๓ ด้านใด?","ศีล สมาธิ ปัญญา","ทาน ศีล ภาวนา"],
["ศีลข้อที่ ๔ สอนให้เราอย่างไร?","งดเว้นจากการพูดเท็จ","งดเว้นจากการกินอาหาร"],
["ศีลข้อที่ ๕ เกี่ยวข้องกับเรื่องใด?","งดเว้นจากของมึนเมา","งดเว้นจากการทำการบ้าน"]
];
function quiz(){let q=0;$("#title").innerHTML="<h2>ธรรมะท้าประลอง</h2><p>อริยสัจ ๔ • ไตรสิกขา • ศีล ๕</p>";$("#hint").textContent="☝️ ชี้หรือแตะคำตอบที่ถูกต้อง";const draw=()=>{$("#area").innerHTML=`<div class="card"><div class="question">${qs[q][0]}</div><div class="answers"><button class="answer" data-ok="1">A · ${qs[q][1]}</button><button class="answer" data-ok="0">B · ${qs[q][2]}</button></div><p class="progress">ข้อ ${q+1}/${qs.length}</p></div>`};draw();$("#area").onclick=e=>{let a=e.target.closest(".answer");if(!a)return;if(a.dataset.ok==="1"){add(10);q++;toast("ถูกต้อง +10");q===qs.length?finish("เก่งมาก! ผ่านธรรมะท้าประลองครบ ๕ ข้อ 🎉"):draw()}else toast("ยังไม่ใช่ ลองคิดอีกครั้ง 💡")}}
const fs=[
["นักเรียนที่ดีควร ______ ตรงต่อเวลา","มีวินัย"],
["เมื่อเห็นเพื่อนเดือดร้อน เราควร ______","มีน้ำใจ"],
["การพูดความจริงแสดงถึงคุณธรรมด้าน ______","ความซื่อสัตย์"],
["เมื่อได้รับมอบหมายงาน เราควร ______ ทำให้สำเร็จ","รับผิดชอบ"],
["การช่วยเหลือผู้อื่นด้วยความตั้งใจดี แสดงถึง ______","เมตตา"]
];
function fill(){let q=0;$("#title").innerHTML="<h2>เติมคำธรรมะ</h2><p>คุณธรรมพื้นฐานของนักเรียน</p>";$("#hint").textContent="🤏 จีบเพื่อเลือกคำ หรือแตะคำตอบ";const draw=()=>{$("#area").innerHTML=`<div class="card"><div class="question">${fs[q][0].replace("______","<span style='color:#ffd36e'>______</span>")}</div><div class="words">${[fs[q][1],"ละเลย","โกหก","ประมาท"].sort(()=>Math.random()-.5).map(w=>`<button class="word" data-w="${w}" data-drag>${w}</button>`).join("")}</div><p>ข้อ ${q+1}/${fs.length}</p></div>`};draw();$("#area").onclick=e=>{let w=e.target.closest(".word");if(w)checkFill(w)}}
function checkFill(w){if(!w)return;const qtxt=$("#area .question").textContent;let q=fs.findIndex(x=>qtxt.includes(x[0].replace("______","")));let target=fs[q]?.[1];if(w.dataset.w===target){add(10);toast("ถูกต้อง +10");q++;q>=fs.length?finish("เติมคำธรรมะครบ ๕ ข้อแล้ว 🎉"):$("#area").innerHTML=`<div class="card"><div class="question">${fs[q][0].replace("______","<span style='color:#ffd36e'>______</span>")}</div><div class="words">${[fs[q][1],"ละเลย","โกหก","ประมาท"].sort(()=>Math.random()-.5).map(w=>`<button class="word" data-w="${w}" data-drag>${w}</button>`).join("")}</div><p>ข้อ ${q+1}/${fs.length}</p></div>`}else toast("คำนี้ยังไม่เหมาะ ลองใหม่ 💡")}

const ms=[
["ห้องเรียนมีขยะเต็มพื้น","ช่วยกันเก็บและทิ้งให้ถูกถัง","เดินผ่านแล้วไม่สนใจ"],
["เพื่อนลืมอุปกรณ์การเรียน","แบ่งปันหรือช่วยหาให้เพื่อน","หัวเราะเยาะเพื่อน"],
["พบของที่ไม่ใช่ของตนเอง","นำส่งครูหรือถามหาเจ้าของ","เก็บไว้เป็นของตน"]
];
function moral(){let q=0;$("#title").innerHTML="<h2>พุทธศาสนิกชนตัวน้อย</h2><p>เลือกการกระทำที่สะท้อนความดี</p>";$("#hint").textContent="☝️ ชี้หรือแตะสิ่งที่ดีต่อผู้อื่น";const draw=()=>{$("#area").innerHTML=`<div class="card"><div class="question">${ms[q][0]}</div><div class="choices"><button class="choice" data-ok="1">${ms[q][1]}</button><button class="choice" data-ok="0">${ms[q][2]}</button></div><p>สถานการณ์ ${q+1}/${ms.length}</p></div>`};draw();$("#area").onclick=e=>{let a=e.target.closest(".choice");if(!a)return;if(a.dataset.ok==="1"){add(10);q++;toast("เลือกความดีได้ดีมาก +10");q===ms.length?finish("ยอดเยี่ยม! เป็นพุทธศาสนิกชนตัวน้อยที่น่าชื่นชม 🌸"):draw()}else toast("ลองคิดว่าการกระทำใดช่วยผู้อื่นได้ดีที่สุด 💡")}}

const virtues=["ซื่อสัตย์","กตัญญู","มีน้ำใจ","ขยัน","มีวินัย","เมตตา","อดทน","รับผิดชอบ","ประหยัด","ช่วยเหลือผู้อื่น"];
function tree(){
$("#title").innerHTML="<h2>ต้นไม้แห่งความดี</h2><p>เลือกความดีที่อยากทำให้ได้ ๕ ข้อ</p>";$("#hint").textContent="🤏 จีบหรือแตะความดีที่เลือกให้ครบ ๕ ข้อ";$("#area").innerHTML='<div class="tree">🌳</div><div class="leaves"></div><div class="treeCounter">เลือกแล้ว <b id="treeCount">0</b> / 5</div><div class="virtues"></div>';
const box=$("#area .virtues");virtues.forEach((v,i)=>{let b=document.createElement("button");b.className="virtue";b.textContent=v;b.dataset.virtue=v;b.dataset.drag=1;b.onclick=()=>chooseVirtue(b);box.appendChild(b)})
}
function chooseVirtue(b){if(b.classList.contains("selected"))return;if($$("#area .virtue.selected").length>=5){toast("เลือกครบ ๕ ข้อแล้ว 🌳");return}b.classList.add("selected");$("#treeCount").textContent=$$("#area .virtue.selected").length;let leaf=document.createElement("div");leaf.className="leaf";leaf.textContent="🍃";leaf.style.left=(35+Math.random()*30)+"%";leaf.style.top=(15+Math.random()*55)+"%";$("#area .leaves").appendChild(leaf);add(10);toast("เลือกความดีแล้ว +10");if($$("#area .virtue.selected").length===5)finish("ต้นไม้แห่งความดีเติบโตแล้ว 🌳✨")}
function treeRelease(e){if(e.classList.contains("virtue"))chooseVirtue(e)}

$$("[data-game]").forEach(b=>b.addEventListener("click",()=>setup(b.dataset.game)));
$("#start").addEventListener("click",startGame);$("#start").addEventListener("click",camera);
$("#cancelStart").addEventListener("click",()=>{$("#permission").classList.add("hidden");$("#menu").classList.remove("hidden")});
$("#home").addEventListener("click",()=>{stopCamera();$("#game").classList.add("hidden");$("#menu").classList.remove("hidden");ui()});
$("#resultHome").addEventListener("click",()=>{$("#result").classList.add("hidden");$("#menu").classList.remove("hidden");ui()});
$("#again").addEventListener("click",()=>{stopCamera();$("#result").classList.add("hidden");$("#permission").classList.remove("hidden")});
ui();
