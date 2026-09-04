import {FilesetResolver,HandLandmarker,PoseLandmarker,FaceLandmarker} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/vision_bundle.mjs";
const WASM="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";
const HAND_MODEL="https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const POSE_MODEL="https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/2/pose_landmarker_lite.task";
const FACE_MODEL="https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let hand=null,pose=null,face=null,stream=null,raf=0,gameKind=null,round=0,total=0,finished=false;
let hands=[],poseLm=null,faceLm=null,pinchStates=[false,false],dragged=[null,null];
const names={altar:"ภารกิจ ๑ · จัดโต๊ะหมู่บูชา",sort:"ภารกิจ ๒ · นักคัดแยกขยะ",quiz:"ภารกิจ ๓ · ธรรมะท้าประลอง",fill:"ภารกิจ ๔ · เติมคำธรรมะ",moral:"ภารกิจ ๕ · พุทธศาสนิกชนตัวน้อย",tree:"ภารกิจ ๖ · ต้นไม้แห่งความดี"};
const rank=n=>n>=600?"🏆 ทูตวิถีพุทธ":n>=400?"🌟 นักสืบทอดวิถีพุทธ":n>=200?"✨ นักสร้างความดี":"🌱 ผู้เริ่มต้นทำความดี";
function ui(){$("#menuScore").textContent=total;$("#menuRank").textContent=rank(total)}
function add(n){round+=n;total+=n;$("#score").textContent=round;ui()}
function toast(s){const e=$("#feedback");e.textContent=s;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),1200)}
async function initModels(){if(hand&&pose&&face)return;const v=await FilesetResolver.forVisionTasks(WASM);[hand,pose,face]=await Promise.all([
 HandLandmarker.createFromOptions(v,{baseOptions:{modelAssetPath:HAND_MODEL,delegate:"GPU"},runningMode:"VIDEO",numHands:2,minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.55}),
 PoseLandmarker.createFromOptions(v,{baseOptions:{modelAssetPath:POSE_MODEL,delegate:"GPU"},runningMode:"VIDEO",numPoses:1,minPoseDetectionConfidence:.55,minPosePresenceConfidence:.55,minTrackingConfidence:.55}),
 FaceLandmarker.createFromOptions(v,{baseOptions:{modelAssetPath:FACE_MODEL,delegate:"GPU"},runningMode:"VIDEO",numFaces:1,minFaceDetectionConfidence:.55,minFacePresenceConfidence:.55,minTrackingConfidence:.55})
 ])}
async function startCamera(){try{if(!navigator.mediaDevices?.getUserMedia)throw Error("camera unavailable");$("#status").textContent="กำลังเตรียมระบบตรวจจับมือ • ศีรษะ • ไหล่ • ลำตัว…";await initModels();stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:1280},height:{ideal:720}},audio:false});$("#camera").srcObject=stream;await $("#camera").play();$("#status").textContent="กล้องพร้อมแล้ว ✓";loop()}catch(e){console.warn(e);$("#status").textContent="เปิดกล้องไม่ได้ — แตะ/ลากหน้าจอเพื่อทดสอบเกม";loop()}}
function loop(){cancelAnimationFrame(raf);const tick=()=>{const v=$("#camera");if(gameKind&&v.readyState>=2&&hand&&pose&&face){const t=performance.now();try{hands=hand.detectForVideo(v,t).landmarks||[];poseLm=pose.detectForVideo(v,t).landmarks?.[0]||null;faceLm=face.detectForVideo(v,t).faceLandmarks?.[0]||null;trackingUI();gestureFrame(t)}catch(e){console.warn(e)}}raf=requestAnimationFrame(tick)};tick()}
function trackingUI(){const s=$("#trackingStatus"),ok=hands.length||poseLm||faceLm;s.textContent=ok?"● กำลังตรวจจับการเคลื่อนไหว":"● กรุณาอยู่หน้ากล้อง";s.classList.toggle("warn",!ok);if(hands[0]){const p=screenPoint(hands[0][8]);pointer(p.x,p.y,pinchStates[0])}else $("#pointer").style.display="none"}
function screenPoint(l){return{x:(1-l.x)*innerWidth,y:l.y*innerHeight}}
function pointer(x,y,down=false){const p=$("#pointer");p.style.display="block";p.style.left=x-19+"px";p.style.top=y-19+"px";p.classList.toggle("pointerDown",down)}
function info(i){const a=hands[i];if(!a)return null;const d=Math.hypot(a[8].x-a[4].x,a[8].y-a[4].y);const pin=d<.060||pinchStates[i]&&d<.085;const p=screenPoint(a[8]);return{a,p,pin}}
function hit(sel,x,y){return $$(sel).find(e=>{const r=e.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom})}
function move(e,x,y){e.style.position="fixed";e.style.left=x-e.offsetWidth/2+"px";e.style.top=y-e.offsetHeight/2+"px";e.style.zIndex=90}
function reset(e){if(!e)return;e.style.position="";e.style.left="";e.style.top="";e.style.zIndex="";e.classList.remove("dragging")}
function gestureFrame(t){if(gameKind==="altar")altarGesture();else if(gameKind==="sort")sortGesture();else if(gameKind==="quiz")quizGesture(t);else if(gameKind==="fill")fillGesture(t);else if(gameKind==="moral")moralGesture(t);else if(gameKind==="tree")treeGesture()}

function setup(kind){stopCamera();gameKind=kind;round=0;finished=false;pinchStates=[false,false];dragged=[null,null];$("#score").textContent=0;$("#gameName").textContent=names[kind];$("#permissionTitle").textContent=names[kind];$("#menu").classList.add("hidden");$("#result").classList.add("hidden");$("#permission").classList.remove("hidden")}
function startGame(){$("#permission").classList.add("hidden");$("#game").classList.remove("hidden");({altar,sort,quiz,fill,moral,tree}[gameKind])();startCamera()}
function finish(msg){if(finished)return;finished=true;$("#resultTitle").textContent=msg;$("#resultRound").textContent="+"+round;$("#resultTotal").textContent=total;$("#resultRank").textContent=rank(total);$("#game").classList.add("hidden");$("#result").classList.remove("hidden");stopCamera()}
function stopCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}cancelAnimationFrame(raf);$("#camera").srcObject=null;hands=[];poseLm=null;faceLm=null}

function altar(){
 $("#title").innerHTML="<h2>จัดโต๊ะหมู่บูชา</h2><p>จัดโต๊ะหมู่ ๙ และเครื่องบูชาที่กระจัดกระจายให้ถูกต้อง</p>";$("#hint").textContent="🤏 ใช้นิ้วมือจับ • ลาก • ปล่อยโต๊ะและเครื่องบูชา";
 $("#area").innerHTML='<div class="altarBoard"></div><div class="tray"><div class="trayLabel">อุปกรณ์โต๊ะหมู่ ๙</div></div>';
 const b=$(".altarBoard"),tr=$(".tray");
 for(let n=1;n<=9;n++){const s=document.createElement("div");s.className="tierSlot";s.dataset.slot=n;s.textContent="โต๊ะ "+n;s.style.width=(19+(n%3)*3)+"%";s.style.height="14%";s.style.left=(40-(n%3)*9)+"%";s.style.top=(5+Math.floor((n-1)/3)*19)+"%";b.appendChild(s);const p=document.createElement("div");p.className="piece";p.dataset.drag=1;p.dataset.slot=n;p.textContent="โต๊ะ "+n;tr.appendChild(p)}
 [["🪷","พระพุทธรูป"],["🪔","ธูป"],["🕯️","เทียน"],["🌸","พานพุ่ม ๑"],["🌸","พานพุ่ม ๒"]].forEach(([em,label])=>{const p=document.createElement("div");p.className="ritual";p.dataset.drag=1;p.dataset.ritual=label;p.textContent=em;p.title=label;tr.appendChild(p)});
 const r=document.createElement("div");r.className="tierSlot";r.dataset.slot="ritual";r.textContent="🪷 วางเครื่องบูชา";r.style.width="34%";r.style.height="17%";r.style.left="33%";r.style.top="65%";b.appendChild(r)
}
function altarGesture(){const h=info(0);if(!h)return;pointer(h.p.x,h.p.y,h.pin);if(h.pin&&!pinchStates[0]){dragged[0]=hit("#area [data-drag]",h.p.x,h.p.y);dragged[0]?.classList.add("dragging")}if(h.pin&&dragged[0])move(dragged[0],h.p.x,h.p.y);if(!h.pin&&pinchStates[0]&&dragged[0]){const e=dragged[0],slot=hit("#area .tierSlot",h.p.x,h.p.y);if(e.dataset.ritual){if(slot?.dataset.slot==="ritual"){e.remove();slot.textContent="✓ เครื่องบูชา";add(5);toast("วางเครื่องบูชาถูกต้อง +5")}else reset(e)}else if(slot?.dataset.slot===e.dataset.slot){e.remove();slot.textContent="✓ โต๊ะ "+slot.dataset.slot;slot.classList.add("filled");add(5);toast("วางโต๊ะถูกต้อง +5")}else reset(e);dragged[0]=null}pinchStates[0]=h.pin}

function sort(){
 $("#title").innerHTML="<h2>นักคัดแยกขยะ</h2><p>ใช้มือซ้ายและขวาปัดขยะลงถังให้ถูกประเภท</p>";$("#hint").textContent="🖐 ใช้มือซ้าย–ขวาหยิบหรือปัดขยะเข้าถังที่ถูกต้อง";
 $("#area").innerHTML='<div class="swipeBin bin-green">🟢<br>ขยะทั่วไป</div><div class="swipeBin bin-blue">🔵<br>รีไซเคิล</div><div class="swipeBin bin-yellow">🟡<br>กระดาษ</div><div class="swipeBin bin-red">🔴<br>อันตราย</div>';
 const ws=[["🍌","green"],["🍎","green"],["🍂","green"],["🥤","blue"],["🥫","blue"],["📦","blue"],["📰","yellow"],["📄","yellow"],["🔋","red"],["🧴","red"]];ws.forEach((w,i)=>{const d=document.createElement("div");d.className="waste";d.textContent=w[0];d.dataset.drag=1;d.dataset.type=w[1];d.style.left=8+(i%5)*18+"%";d.style.top=10+Math.floor(i/5)*26+"%";$("#area").appendChild(d)})
}
function sortGesture(){for(let i=0;i<Math.min(2,hands.length);i++){const h=info(i);if(!h)continue;pointer(h.p.x,h.p.y,h.pin);if(h.pin&&!pinchStates[i]&&!dragged[i]){dragged[i]=hit("#area .waste",h.p.x,h.p.y);dragged[i]?.classList.add("dragging")}if(dragged[i]){move(dragged[i],h.p.x,h.p.y);if(!h.pin){const e=dragged[i],bin=hit("#area .swipeBin",h.p.x,h.p.y),type=bin&&["green","blue","yellow","red"].find(c=>bin.classList.contains("bin-"+c));if(type===e.dataset.type){e.remove();add(10);toast("แยกถูกต้อง +10");if(!$("#area .waste"))finish("แยกขยะครบทุกประเภทแล้ว 🎉")}else{reset(e);toast("ลองปัดไปถังที่ถูกประเภท 💡")}dragged[i]=null}}pinchStates[i]=h.pin}}

const qs=[
 ["อริยสัจ ๔ ข้อใดหมายถึงสภาพปัญหาหรือความทุกข์?","ทุกข์","มรรค"],
 ["สาเหตุของทุกข์ในอริยสัจ ๔ เรียกว่าอะไร?","นิโรธ","สมุทัย"],
 ["ไตรสิกขาประกอบด้วยข้อใด?","ศีล สมาธิ ปัญญา","ทาน เมตตา กรุณา"],
 ["ศีลข้อที่ ๕ สอนให้เราหลีกเลี่ยงสิ่งใด?","การพูดความจริง","ของมึนเมา"],
 ["ข้อใดคือ 'มรรค' ในอริยสัจ ๔?","หนทางปฏิบัติเพื่อดับทุกข์","ความอยากที่ทำให้เกิดทุกข์"]
];
function quiz(){quiz.q=0;quiz.side=null;$("#title").innerHTML="<h2>ธรรมะท้าประลอง</h2><p>เอียงศีรษะซ้าย–ขวาเพื่อเลือกคำตอบ</p>";$("#hint").textContent="🙂 เอียงหัวซ้าย = A • เอียงหัวขวา = B • กลับมาตรงกลางเพื่อยืนยัน";drawQuiz()}
function drawQuiz(){$("#area").innerHTML=`<div class="card"><div class="question">${qs[quiz.q][0]}</div><div class="answers"><div class="answer" data-side="left">A · ${qs[quiz.q][1]}</div><div class="answer" data-side="right">B · ${qs[quiz.q][2]}</div></div><p class="progress">ข้อ ${quiz.q+1}/${qs.length}</p></div>`}
function quizGesture(){if(!faceLm)return;const le=faceLm[33],re=faceLm[263];if(!le||!re)return;const tilt=re.y-le.y;let side=null;if(tilt>.018)side="left";else if(tilt<-.018)side="right";$$('#area .answer').forEach(e=>e.classList.toggle('target',e.dataset.side===side));if(side&&quiz.side!==side){quiz.side=side;clearTimeout(quiz.timer);quiz.timer=setTimeout(()=>quizAnswer(side),650)}if(!side){quiz.side=null;clearTimeout(quiz.timer)}}
function quizAnswer(side){const correct=["left","right","left","right","left"][quiz.q];if(side===correct){add(10);toast("ตอบถูกต้อง +10");quiz.q++;quiz.side=null;if(quiz.q>=qs.length)finish("เก่งมาก! ผ่านธรรมะท้าประลองครบ ๕ ข้อ 🎉");else drawQuiz()}else{toast("ยังไม่ใช่ ลองเอียงอีกด้าน 💡");quiz.side=null}}

const fs=[
 ["นักเรียนที่ดีควร ______ ตรงต่อเวลา","มีวินัย","ละเลย","โกหก","ประมาท"],
 ["เมื่อเห็นเพื่อนเดือดร้อน เราควร ______","มีน้ำใจ","เพิกเฉย","ล้อเลียน","เอาเปรียบ"],
 ["การพูดความจริงแสดงถึงคุณธรรมด้าน ______","ซื่อสัตย์","ประมาท","เห็นแก่ตัว","โกหก"],
 ["เมื่อได้รับมอบหมายงาน เราควร ______ ทำให้สำเร็จ","รับผิดชอบ","หนีงาน","ผัดวัน","ละเลย"],
 ["การช่วยเหลือผู้อื่นด้วยความตั้งใจดี แสดงถึง ______","เมตตา","ริษยา","โลภ","โกรธ"]
];
function fill(){fill.q=0;fill.hold=null;$("#title").innerHTML="<h2>เติมคำธรรมะ</h2><p>เลือกคำให้ถูกต้อง แล้วขยับตัวให้ตรงช่องค้างไว้ ๓ วินาที</p>";$("#hint").textContent="🧍 ขยับลำตัว/ไหล่ซ้าย–ขวาให้ตรงกับช่องคำตอบ • ค้าง ๓ วินาที";drawFill()}
function drawFill(){$("#area").innerHTML=`<div class="card"><div class="question">${fs[fill.q][0].replace("______","<span style='color:#ffd66b'>________</span>")}</div><div class="fillGrid">${fs[fill.q].slice(1).map((w,i)=>`<div class="fillCell" data-index="${i}" data-word="${w}">${w}</div>`).join("")}</div><p class="progress">ข้อ ${fill.q+1}/${fs.length}</p></div>`}
function fillGesture(t){if(!poseLm)return;const ls=poseLm[11],rs=poseLm[12];if(!ls||!rs)return;const x=1-(ls.x+rs.x)/2;const y=(ls.y+rs.y)/2;const col=x<.5?0:1;const row=y<.52?0:1;const idx=row*2+col;const cells=$$("#area .fillCell");cells.forEach((c,i)=>c.classList.toggle("active",i===idx));const cell=cells[idx];if(!cell){fill.hold=null;return}if(!fill.hold||fill.hold.idx!==idx)fill.hold={idx,start:t};const elapsed=t-fill.hold.start;cell.style.setProperty("--hold",Math.min(100,elapsed/30)+"%");if(elapsed>=3000){const correct=cell.dataset.word===fs[fill.q][1];fill.hold=null;if(correct){add(10);toast("เติมคำถูกต้อง +10");fill.q++;if(fill.q>=fs.length)finish("ยอดเยี่ยม! เติมคำธรรมะครบ ๕ ข้อแล้ว 🎉");else drawFill()}else toast("คำนี้ยังไม่ใช่ ลองขยับตัวไปช่องอื่น 💡")}}

const ms=[
 ["หลังทำกิจกรรม ห้องเรียนมีขยะเต็มพื้น ควรทำอย่างไร?","ช่วยกันเก็บและทิ้งให้ถูกถัง","เดินผ่านแล้วไม่สนใจ"],
 ["พบของที่ไม่ใช่ของตนเอง ควรทำอย่างไร?","นำส่งครูหรือหาเจ้าของ","เก็บไว้เป็นของตนเอง"],
 ["เมื่อครูมอบหมายงานกลุ่ม เราควรทำอย่างไร?","รับผิดชอบหน้าที่ของตน","ปล่อยให้เพื่อนทำทั้งหมด"],
 ["เพื่อนทำผิดแล้วมาขอโทษ เราควรทำอย่างไร?","ให้อภัยและแนะนำด้วยเมตตา","ล้อเลียนซ้ำ"],
 ["เมื่อเข้าร่วมกิจกรรมทางพระพุทธศาสนา นักเรียนควรปฏิบัติอย่างไร?","สำรวมกาย วาจา และตั้งใจร่วมกิจกรรม","เล่นและรบกวนผู้อื่น"]
];
function moral(){moral.q=0;moral.last=null;$("#title").innerHTML="<h2>พุทธศาสนิกชนตัวน้อย</h2><p>ทำท่าเล็งนิ้วชี้แบบปืนเพื่อยิงเป้าคำตอบ</p>";$("#hint").textContent="☝️ เหยียดนิ้วชี้เล็งไปที่คำตอบ • ค้างเล็งเพื่อยิง";drawMoral()}
function drawMoral(){$("#area").innerHTML=`<div class="card"><div class="question">${ms[moral.q][0]}</div><div class="choices"><div class="choice" data-ok="1">A · ${ms[moral.q][1]}</div><div class="choice" data-ok="0">B · ${ms[moral.q][2]}</div></div><p class="progress">สถานการณ์ ${moral.q+1}/${ms.length}</p></div>`}
function indexPointing(a){const w=a[0];return Math.hypot(a[8].x-w.x,a[8].y-w.y)>Math.hypot(a[6].x-w.x,a[6].y-w.y)*1.12&&Math.hypot(a[12].x-w.x,a[12].y-w.y)<Math.hypot(a[10].x-w.x,a[10].y-w.y)*1.2}
function moralGesture(){const h=info(0);if(!h||!indexPointing(h.a))return;const c=hit("#area .choice",h.p.x,h.p.y);$$('#area .choice').forEach(e=>e.classList.toggle('target',e===c));if(c&&moral.last!==c){moral.last=c;clearTimeout(moral.timer);moral.timer=setTimeout(()=>{if(c.dataset.ok==='1'){add(10);toast("ตอบถูกต้อง +10");moral.q++;moral.last=null;if(moral.q>=ms.length)finish("ยอดเยี่ยม! เป็นพุทธศาสนิกชนตัวน้อยที่น่าชื่นชม 🌸");else drawMoral()}else{toast("ลองเล็งคำตอบที่สะท้อนคุณธรรม 💡");moral.last=null}},650)}}

function tree(){tree.grab=null;$("#title").innerHTML="<h2>ต้นไม้แห่งความดี</h2><p>เลือกต้นกล้าคุณธรรม ๓ ต้น แล้วใช้ ๒ มือจับพร้อมกันลากไปปลูกในดิน</p>";$("#hint").textContent="👐 จีบมือซ้ายและขวาพร้อมกัน • จับต้นกล้า • ลากไปยังดิน";const seeds=[["🌱","ซื่อสัตย์"],["🌿","กตัญญู"],["🌱","มีน้ำใจ"],["🌿","มีวินัย"],["🌱","เมตตา"],["🌿","รับผิดชอบ"]];$("#area").innerHTML='<div class="tree">🌳</div><div class="leaves"></div><div class="soil"></div><div class="treeCounter">ปลูกแล้ว <b id="treeCount">0</b> / 3</div><div class="seedTray"></div>';const tray=$("#area .seedTray");seeds.forEach((s,i)=>{const d=document.createElement("div");d.className="seedling";d.dataset.virtue=s[1];d.innerHTML=`<span>${s[0]}</span><small>${s[1]}</small>`;d.style.left=(5+(i%3)*31)+"%";d.style.top=(43+Math.floor(i/3)*19)+"%";tray.appendChild(d)})}
tree.grab=null;
function treeGesture(){if(hands.length<2){if(tree.grab){reset(tree.grab);tree.grab=null}return}const a=info(0),b=info(1);if(!a?.pin||!b?.pin){if(tree.grab){reset(tree.grab);tree.grab=null}return}const cx=(a.p.x+b.p.x)/2,cy=(a.p.y+b.p.y)/2;pointer(cx,cy,true);if(!tree.grab){tree.grab=hit("#area .seedling",cx,cy);tree.grab?.classList.add("dragging")}if(tree.grab){move(tree.grab,cx,cy);const soil=hit("#area .soil",cx,cy);if(soil&&Math.hypot(a.p.x-b.p.x,a.p.y-b.p.y)<innerWidth*.4){const seed=tree.grab;seed.remove();const planted=3-$$('#area .seedling').length;$('#treeCount').textContent=planted;const leaf=document.createElement('div');leaf.className='leaf';leaf.textContent='🍃 '+seed.dataset.virtue;leaf.style.left=(25+Math.random()*50)+'%';leaf.style.top=(14+Math.random()*55)+'%';$('#area .leaves').appendChild(leaf);add(15);toast('ปลูก '+seed.dataset.virtue+' +15');tree.grab=null;if(planted>=3)finish('ต้นไม้แห่งความดีเติบโตงดงามแล้ว 🌳✨')}}}

$$('[data-game]').forEach(b=>b.addEventListener('click',()=>setup(b.dataset.game)));
$("#start").addEventListener('click',startGame);
$("#cancelStart").addEventListener('click',()=>{$("#permission").classList.add('hidden');$("#menu").classList.remove('hidden')});
$("#home").addEventListener('click',()=>{stopCamera();gameKind=null;$("#game").classList.add('hidden');$("#menu").classList.remove('hidden');ui()});
$("#resultHome").addEventListener('click',()=>{$("#result").classList.add('hidden');gameKind=null;$("#menu").classList.remove('hidden');ui()});
$("#again").addEventListener('click',()=>{stopCamera();$("#result").classList.add('hidden');$("#permission").classList.remove('hidden')});
// Mouse/touch fallback for desktop testing when camera is unavailable.
let fallbackEl=null;document.addEventListener('pointerdown',e=>{if(!gameKind)return;const x=e.clientX,y=e.clientY;fallbackEl=hit("#area [data-drag],#area .seedling",x,y);if(fallbackEl)move(fallbackEl,x,y)});document.addEventListener('pointermove',e=>{if(fallbackEl)move(fallbackEl,e.clientX,e.clientY)});document.addEventListener('pointerup',e=>{if(!fallbackEl)return;const x=e.clientX,y=e.clientY;if(gameKind==='altar')altarGestureFallback(fallbackEl,x,y);else if(gameKind==='sort')sortFallback(fallbackEl,x,y);else if(gameKind==='tree'){const soil=hit('#area .soil',x,y);if(soil){fallbackEl.remove();const planted=3-$$('#area .seedling').length;$('#treeCount').textContent=planted;add(15);toast('ปลูกต้นกล้า +15');if(planted>=3)finish('ต้นไม้แห่งความดีเติบโตงดงามแล้ว 🌳✨')}}reset(fallbackEl);fallbackEl=null});
function altarGestureFallback(e,x,y){const slot=hit('#area .tierSlot',x,y);if(e.dataset.ritual&&slot?.dataset.slot==='ritual'){e.remove();add(5);toast('วางเครื่องบูชาถูกต้อง +5')}else if(slot?.dataset.slot===e.dataset.slot){e.remove();add(5);toast('วางโต๊ะถูกต้อง +5')}checkFallbackComplete()}
function sortFallback(e,x,y){const bin=hit('#area .swipeBin',x,y);const type=bin&&['green','blue','yellow','red'].find(c=>bin.classList.contains('bin-'+c));if(type===e.dataset.type){e.remove();add(10);toast('แยกถูกต้อง +10');if(!$('#area .waste'))finish('แยกขยะครบทุกประเภทแล้ว 🎉')}}
function checkFallbackComplete(){if(!$('#area [data-drag]'))finish('จัดโต๊ะหมู่บูชาครบถ้วนแล้ว 🪷')}
ui();
