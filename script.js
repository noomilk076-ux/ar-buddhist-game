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
async function initModels(){
  if(hand&&pose&&face)return;
  const v=await FilesetResolver.forVisionTasks(WASM);
  if(!hand){try{hand=await HandLandmarker.createFromOptions(v,{baseOptions:{modelAssetPath:HAND_MODEL,delegate:"GPU"},runningMode:"VIDEO",numHands:2,minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.55})}catch(e){console.warn("Hand model failed",e)}}
  if(!pose){try{pose=await PoseLandmarker.createFromOptions(v,{baseOptions:{modelAssetPath:POSE_MODEL,delegate:"GPU"},runningMode:"VIDEO",numPoses:1,minPoseDetectionConfidence:.55,minPosePresenceConfidence:.55,minTrackingConfidence:.55})}catch(e){console.warn("Pose model failed",e)}}
  if(!face){try{face=await FaceLandmarker.createFromOptions(v,{baseOptions:{modelAssetPath:FACE_MODEL,delegate:"GPU"},runningMode:"VIDEO",numFaces:1,minFaceDetectionConfidence:.55,minFacePresenceConfidence:.55,minTrackingConfidence:.55})}catch(e){console.warn("Face model failed",e)}}
  if(!hand&&!pose&&!face)throw Error("No AI model loaded");
}
async function startCamera(){
  try{
    if(!navigator.mediaDevices?.getUserMedia) throw Error("camera unavailable");
    const v=$("#camera");
    $("#status").textContent="กำลังเปิดกล้อง… กรุณาอนุญาตการใช้กล้อง";
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"user"},width:{ideal:1280},height:{ideal:720}},audio:false});
    v.srcObject=stream;
    await v.play();
    $("#status").textContent="กล้องพร้อมแล้ว ✓ กำลังเตรียมระบบตรวจจับ";
    loop();
    initModels().then(()=>{
      $("#status").textContent="กล้องพร้อมแล้ว ✓ ตรวจจับมือ • ศีรษะ • ไหล่ • ลำตัว";
    }).catch(e=>{
      console.warn("AI model init failed",e);
      $("#status").textContent="กล้องพร้อม ✓ แต่ระบบตรวจจับ AI ยังไม่พร้อม";
      $("#trackingStatus").textContent="● กล้องพร้อม • AI กำลังโหลด/ไม่พร้อม";
      $("#trackingStatus").classList.add("warn");
    });
  }catch(e){
    console.warn(e);
    $("#status").textContent="เปิดกล้องไม่ได้ • ตรวจสอบการอนุญาตกล้องของ Safari แล้วลองอีกครั้ง";
    loop();
  }
}
function loop(){cancelAnimationFrame(raf);const tick=()=>{const v=$("#camera");if(gameKind&&v.readyState>=2){const t=performance.now();try{hands=hand?(hand.detectForVideo(v,t).landmarks||[]):[];poseLm=pose?(pose.detectForVideo(v,t).landmarks?.[0]||null):null;faceLm=face?(face.detectForVideo(v,t).faceLandmarks?.[0]||null):null;trackingUI();gestureFrame(t)}catch(e){console.warn(e)}}raf=requestAnimationFrame(tick)};tick()}
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
 ["ชาวพุทธที่ดีควร ______ ทำความดีและละเว้นความชั่ว",["ตั้งใจ","ละเลย","หลีกหนี"]],
 ["นักเรียนที่ดีควรมี ______ และทำหน้าที่ของตนให้สำเร็จ",["ความรับผิดชอบ","ความประมาท","ความเห็นแก่ตัว"]],
 ["เมื่อเพื่อนเดือดร้อน เราควร ______ และช่วยเหลือเพื่อน",["มีน้ำใจ","เพิกเฉย","ล้อเลียน"]],
 ["การพูดความจริงและไม่โกหกแสดงถึงคุณธรรมด้าน ______",["ความซื่อสัตย์","ความเกียจคร้าน","ความประมาท"]],
 ["นักเรียนควร ______ กฎระเบียบของโรงเรียนและสังคม",["มีวินัย","ละเมิด","เพิกเฉย"]]
];
function fill(){
  fill.q=0;fill.drag=null;fill.grabbed=false;
  $("#title").innerHTML="<h2>เติมคำธรรมะ</h2><p>ใช้มือทั้ง ๕ นิ้วกำจับคำ • ลาก • ปล่อยลงช่องเติมคำ</p>";
  $("#hint").textContent="🖐️ กางมือเหนือคำ → กำมือทั้ง ๕ นิ้วเพื่อจับ → ลาก → กางมือเพื่อปล่อย";
  drawFill();
}
function drawFill(){
 const [q,words]=fs[fill.q];
 $("#area").innerHTML=`<div class="card fillCard"><div class="modeBadge">🖐️ ๕-FINGER GRAB MODE</div><div class="question">${q.replace("______","<span class='blank'>________</span>")}</div>
 <div class="dropBlank" data-drop="blank">⬇️ ปล่อยคำที่เลือกลงในช่องนี้</div>
 <div class="fillGrid threeCols">${words.map((w,i)=>`<div class="fillCell wordDrag" data-drag="1" data-word="${w}" data-index="${i}"><span>${w}</span><small>กางมือ → กำ ๕ นิ้ว</small></div>`).join("")}</div>
 <div class="holdGuide"><span>🖐️ <b>กำครบ ๕ นิ้ว</b> เพื่อจับ</span><b>ลากด้วยปลายนิ้วชี้ • กางมือเพื่อปล่อย</b></div><p class="progress">ข้อ ${fill.q+1}/${fs.length}</p></div>`;
}
function fingerDistance(a,i,j){return Math.hypot(a[i].x-a[j].x,a[i].y-a[j].y)}
function grabPose(a){
 if(!a)return false;
 const wrist=a[0];
 // Four long fingers: fingertip must be closer to wrist than its PIP joint.
 const curled=[
   fingerDistance(a,8,0)<fingerDistance(a,6,0)*1.08,
   fingerDistance(a,12,0)<fingerDistance(a,10,0)*1.08,
   fingerDistance(a,16,0)<fingerDistance(a,14,0)*1.08,
   fingerDistance(a,20,0)<fingerDistance(a,18,0)*1.08
 ];
 const curledLong=curled.filter(Boolean).length;
 // Thumb is considered curled when the thumb tip is close to the index MCP/palm area.
 const thumbCurled=fingerDistance(a,4,5)<.11 || fingerDistance(a,4,2)<.14;
 return curledLong>=3 && thumbCurled;
}
function openHandPose(a){
 if(!a)return false;
 const extended=[8,12,16,20].filter((tip,i)=>fingerDistance(a,tip,0)>fingerDistance(a,[6,10,14,18][i],0)*1.12).length;
 return extended>=3;
}
function fillGesture(){
 const h=info(0); if(!h)return;
 const p=h.p, grabbing=grabPose(h.a), open=openHandPose(h.a);
 if(!fill.drag && !grabbing){
   const hover=hit("#area .wordDrag",p.x,p.y);
   $$("#area .wordDrag").forEach(e=>e.classList.toggle("active",e===hover));
 }
 if(grabbing && !fill.drag){
   fill.drag=hit("#area .wordDrag",p.x,p.y);
   if(fill.drag){fill.drag.classList.add("dragging");move(fill.drag,p.x,p.y);fill.grabbed=true;toast("🖐️ กำ ๕ นิ้วแล้ว — ลากคำได้เลย")}
 }
 if(grabbing && fill.drag) move(fill.drag,p.x,p.y);
 if(fill.drag && open && fill.grabbed){
   const e=fill.drag,drop=hit("#area .dropBlank",p.x,p.y);
   if(drop){
     const correct=e.dataset.word===fs[fill.q][1][0];
     if(correct){e.remove();add(10);drop.innerHTML=`<b>✓ ${e.dataset.word}</b>`;drop.classList.add("correct");toast("เติมคำถูกต้อง +10");fill.drag=null;fill.grabbed=false;fill.q++;
       if(fill.q>=fs.length)setTimeout(()=>finish("ยอดเยี่ยม! เติมคำธรรมะครบ ๕ ข้อแล้ว 🌸"),500);else setTimeout(drawFill,650);
     }else{reset(e);fill.drag=null;fill.grabbed=false;toast("คำนี้ยังไม่ใช่ ลองใหม่ 💡")}
   }else{reset(e);fill.drag=null;fill.grabbed=false}
 }
}
const ms=[
 ["หลังทำกิจกรรม ห้องเรียนมีขยะเต็มพื้น ควรช่วยกันเก็บและทิ้งให้ถูกถังหรือไม่?","👍 ควรทำ","👎 ไม่ควรทำ",1],
 ["พบของที่ไม่ใช่ของตนเอง ควรนำส่งครูหรือหาเจ้าของหรือไม่?","👍 ควรทำ","👎 ไม่ควรทำ",1],
 ["เมื่อครูมอบหมายงานกลุ่ม ควรปล่อยให้เพื่อนทำทั้งหมดหรือไม่?","👍 ควรทำ","👎 ไม่ควรทำ",0],
 ["เพื่อนทำผิดแล้วมาขอโทษ เราควรให้อภัยและแนะนำด้วยเมตตาหรือไม่?","👍 ควรทำ","👎 ไม่ควรทำ",1],
 ["เมื่อเข้าร่วมกิจกรรมทางพระพุทธศาสนา ควรสำรวมกาย วาจา และตั้งใจร่วมกิจกรรมหรือไม่?","👍 ควรทำ","👎 ไม่ควรทำ",1]
];
function moral(){moral.q=0;moral.lastChoice=null;moral.armed=true;$("#title").innerHTML="<h2>พุทธศาสนิกชนตัวน้อย</h2><p>ใช้ท่ามือ 👍 หรือ 👎 เลือกว่าการกระทำนั้นควรทำหรือไม่</p>";$("#hint").textContent="👍 ชูนิ้วโป้ง = ควรทำ  •  👎 คว่ำนิ้วโป้ง = ไม่ควรทำ  •  เลือกแล้วปล่อยมือเพื่อเริ่มข้อถัดไป";drawMoral()}
function drawMoral(){const m=ms[moral.q];$("#area").innerHTML=`<div class="card moralCard moralThumbCard"><div class="question">${m[0]}</div><div class="choices thumbChoices"><div class="choice thumbAnswer" data-ok="1"><span class="thumbIcon">👍</span><b>${m[1]}</b></div><div class="choice thumbAnswer" data-ok="0"><span class="thumbIcon">👎</span><b>${m[2]}</b></div></div><div class="thumbGuide">🖐️ <b>ยกมือให้กล้องเห็นชัด</b> → ใช้นิ้วโป้งเลือกคำตอบ</div><p class="progress">สถานการณ์ ${moral.q+1}/${ms.length}</p></div>`}
function thumbPose(a){
 if(!a)return 0;
 const thumb=a[4],thumbIp=a[3],thumbMcp=a[2],index=a[8],middle=a[12],ring=a[16],pinky=a[20];
 const curled=[index,middle,ring,pinky].filter((p,i)=>{const pip=[a[6],a[10],a[14],a[18]][i];return Math.hypot(p.x-a[0].x,p.y-a[0].y)<Math.hypot(pip.x-a[0].x,pip.y-a[0].y)*1.08}).length;
 if(curled<3)return 0;
 const up=thumb.y<Math.min(thumbIp.y,thumbMcp.y)-0.045;
 const down=thumb.y>Math.max(thumbIp.y,thumbMcp.y)+0.045;
 return up?1:(down?-1:0);
}
function moralGesture(){
 const h=info(0);
 if(!h){moral.lastChoice=null;return}
 const choice=thumbPose(h.a);
 const up=$("#area .thumbAnswer[data-ok='1']"),down=$("#area .thumbAnswer[data-ok='0']");
 up?.classList.toggle("target",choice===1);down?.classList.toggle("target",choice===-1);
 $("#area .thumbGuide")?.classList.toggle("active",choice!==0);
 if(choice===0){moral.armed=true;moral.lastChoice=null;return}
 if(!moral.armed||choice===moral.lastChoice)return;
 moral.lastChoice=choice;moral.armed=false;
 const selected=choice===1?up:down;
 if(!selected)return;
 if(Number(selected.dataset.ok)===choice){add(10);toast("🌟 เยี่ยมมาก! ตอบถูก +10");moral.q++;
   if(moral.q>=ms.length){finish("ยอดเยี่ยม! คุณคือพุทธศาสนิกชนตัวน้อยที่มีคุณธรรม 🌸");}
   else setTimeout(()=>drawMoral(),450);
 }else{toast("💡 ลองคิดอีกครั้งว่า สิ่งนี้ควรทำหรือไม่");}
}

function tree(){
 tree.planted=0;tree.drag=null;tree.used=new Set();tree.lastDropAt=0;
 const seeds=[["ซื่อสัตย์","ความจริง"],["กตัญญู","รู้คุณ"],["มีน้ำใจ","ช่วยเหลือ"],["มีวินัย","ทำตามกติกา"],["เมตตา","ปรารถนาดี"],["รับผิดชอบ","ทำหน้าที่"]];
 $("#title").innerHTML="<h2>ต้นไม้แห่งความดี</h2><p>ใช้นิ้วชี้จีบต้นกล้า • ลาก • ปล่อยบนต้นไม้ให้ครบ ๓ ต้น</p>";
 $("#hint").textContent="☝️ นิ้วชี้แตะต้นกล้า → 🤏 จีบเพื่อจับ → ลากไปบนต้นไม้ → ✋ ปล่อย";
 $("#area").innerHTML='<div class="treeStage"><div class="treeDropTarget"><div class="treeBefore">🌳</div><div class="treeDropText">🌳 วางต้นกล้าที่นี่</div></div><div class="flowerCanopy"></div><div class="fallFlowers"></div></div><div class="treeCounter">ปลูกแล้ว <b id="treeCount">0</b> / 3</div><div class="seedTray"></div>';
 const tray=$("#area .seedTray");
 seeds.forEach((s,i)=>{const d=document.createElement("div");d.className="seedling";d.dataset.virtue=s[0];d.innerHTML=`<span>🌱</span><b>${s[0]}</b><small>${s[1]}</small><em>🤏 จีบเพื่อจับ</em>`;d.style.left=(6+(i%3)*31)+"%";d.style.top=(4+Math.floor(i/3)*50)+"%";tray.appendChild(d)});
}
function treeGesture(){
 const h=info(0);if(!h){tree.drag=null;return} const p=h.p;
 if(tree.drag){
   if(h.pin){move(tree.drag,p.x,p.y);tree.drag.classList.add("dragging");$("#area .treeDropTarget")?.classList.toggle("target",!!hit("#area .treeDropTarget",p.x,p.y));}
   else{const e=tree.drag,target=hit("#area .treeDropTarget",p.x,p.y);if(target&&performance.now()-tree.lastDropAt>450){tree.lastDropAt=performance.now();e.remove();tree.used.add(e.dataset.virtue);completeTree(e.dataset.virtue)}else{reset(e);toast("🌱 ลองลากต้นกล้าไปวางบนต้นไม้")}$("#area .treeDropTarget")?.classList.remove("target");tree.drag=null;}
   pinchStates[0]=h.pin;return;
 }
 if(h.pin&&!pinchStates[0]){const seed=hit("#area .seedling:not(.plantedSeed)",p.x,p.y);if(seed){tree.drag=seed;seed.classList.add("dragging");move(seed,p.x,p.y);toast("🤏 จับต้นกล้าแล้ว • ลากไปบนต้นไม้")}}
 pinchStates[0]=h.pin;
}
function completeTree(virtue){
 if(tree.planted>=3)return;tree.planted++;$("#treeCount").textContent=tree.planted;add(15);toast(`🌱 ปลูก ${virtue} สำเร็จ ${tree.planted}/3 • +15`);
 if(tree.planted>=3){
   const target=$("#area .treeDropTarget");target?.classList.add("grown");const canopy=$("#area .flowerCanopy");const flowers=["🌸","🤍","🌹","🌼"];
   for(let i=0;i<70;i++){const f=document.createElement("span");f.className="pinkFlower bloom";f.textContent=flowers[i%flowers.length];f.style.left=(7+Math.random()*86)+"%";f.style.top=(2+Math.random()*72)+"%";f.style.animationDelay=(Math.random()*.9)+"s";canopy.appendChild(f)}
   for(let i=0;i<65;i++){const f=document.createElement("span");f.className="fallFlower";f.textContent=i%2?"🌸":"🤍";f.style.left=(1+Math.random()*98)+"%";f.style.animationDelay=(Math.random()*1.1)+"s";f.style.animationDuration=(2.2+Math.random()*2.5)+"s";$("#area .fallFlowers").appendChild(f)}
   $("#area .treeDropText").textContent="🌸 ต้นไม้แห่งความดีผลิบาน! 🤍";setTimeout(()=>finish("ภารกิจสำเร็จ! ต้นไม้แห่งความดีออกดอกสีขาวและแดงเต็มต้น 🌸🤍🌹"),3800);
 }
}
$$('[data-game]').forEach(b=>b.addEventListener('click',()=>setup(b.dataset.game)));
$("#start").addEventListener('click',startGame);
$("#cancelStart").addEventListener('click',()=>{$("#permission").classList.add('hidden');$("#menu").classList.remove('hidden')});
$("#home").addEventListener('click',()=>{stopCamera();gameKind=null;$("#game").classList.add('hidden');$("#menu").classList.remove('hidden');ui()});
$("#resultHome").addEventListener('click',()=>{$("#result").classList.add('hidden');gameKind=null;$("#menu").classList.remove('hidden');ui()});
$("#again").addEventListener('click',()=>{stopCamera();$("#result").classList.add('hidden');$("#permission").classList.remove('hidden')});
// Mouse/touch fallback for desktop testing when camera is unavailable.
let fallbackEl=null;document.addEventListener('pointerdown',e=>{if(!gameKind)return;const x=e.clientX,y=e.clientY;fallbackEl=hit("#area [data-drag],#area .seedling",x,y);if(fallbackEl)move(fallbackEl,x,y)});document.addEventListener('pointermove',e=>{if(fallbackEl)move(fallbackEl,e.clientX,e.clientY)});document.addEventListener('pointerup',e=>{if(!fallbackEl)return;const x=e.clientX,y=e.clientY;if(gameKind==='altar')altarGestureFallback(fallbackEl,x,y);else if(gameKind==='sort')sortFallback(fallbackEl,x,y);else if(gameKind==='tree'){const soil=hit('#area .soil',x,y);if(soil){fallbackEl.remove();completeTree()}}reset(fallbackEl);fallbackEl=null});
function altarGestureFallback(e,x,y){const slot=hit('#area .tierSlot',x,y);if(e.dataset.ritual&&slot?.dataset.slot==='ritual'){e.remove();add(5);toast('วางเครื่องบูชาถูกต้อง +5')}else if(slot?.dataset.slot===e.dataset.slot){e.remove();add(5);toast('วางโต๊ะถูกต้อง +5')}checkFallbackComplete()}
function sortFallback(e,x,y){const bin=hit('#area .swipeBin',x,y);const type=bin&&['green','blue','yellow','red'].find(c=>bin.classList.contains('bin-'+c));if(type===e.dataset.type){e.remove();add(10);toast('แยกถูกต้อง +10');if(!$('#area .waste'))finish('แยกขยะครบทุกประเภทแล้ว 🎉')}}
function checkFallbackComplete(){if(!$('#area [data-drag]'))finish('จัดโต๊ะหมู่บูชาครบถ้วนแล้ว 🪷')}
ui();
