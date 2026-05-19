let capture;
let hands;
let handResults = null;
let cameraError = false;

const STATE_START = 0;
const STATE_COUNTDOWN = 1;
const STATE_RESULT = 2;
const STATE_MENU = 3;
const STATE_EXIT = 4;

let gameState = STATE_START;
let timer = 0;
let userChoice = "";
let computerChoice = "";
let resultMsg = "";
let userScore = 0;
let computerScore = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 初始化攝像頭
  capture = createCapture(VIDEO);
  capture.size(640, 480);
  capture.hide();

  // 初始化 MediaPipe 手勢辨識
  hands = new Hands({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });

  hands.onResults((results) => {
    handResults = results;
  });

  // 使用 MediaPipe 相機工具流式傳輸畫面給模型
  const camera = new Camera(capture.elt, {
    onFrame: async () => {
      await hands.send({ image: capture.elt });
    },
    width: 640,
    height: 480
  });

  camera.start().catch(err => {
    console.error("攝影機啟動失敗:", err);
    cameraError = true;
  });

  textSize(32);
  textAlign(CENTER, CENTER);
}

// 當瀏覽器視窗大小改變時，自動調整畫布大小
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  if (cameraError) {
    background(50);
    fill(255);
    text("找不到攝影機或權限被拒絕。\n請檢查設定並重新整理。", width / 2, height / 2);
    return;
  }

  // 繪製鏡像畫面
  push();
  translate(width, 0);
  scale(-1, 1);
  image(capture, 0, 0, width, height);
  pop();

  let currentGesture = "none";
  if (handResults && handResults.multiHandLandmarks && handResults.multiHandLandmarks.length > 0) {
    const landmarks = handResults.multiHandLandmarks[0];
    drawHandMarkers(landmarks);
    currentGesture = detectGesture(landmarks);
  }

  // 處理遊戲邏輯
  handleGame(currentGesture);

  // 繪製計分板
  push();
  fill(255, 242, 0); // 黃色文字
  stroke(0);
  strokeWeight(4);
  textSize(28);
  textAlign(LEFT, TOP);
  text(`🏆 得分 - 你: ${userScore} | 電腦: ${computerScore}`, 20, 20);
  pop();
}

function detectGesture(landmarks) {
  // 檢查手指是否伸直 (y 座標越小代表位置越高)
  const indexUp = landmarks[8].y < landmarks[6].y;
  const middleUp = landmarks[12].y < landmarks[10].y;
  const ringUp = landmarks[16].y < landmarks[14].y;
  const pinkyUp = landmarks[20].y < landmarks[18].y;

  // 布：全部伸直
  if (indexUp && middleUp && ringUp && pinkyUp) return "paper";
  // 剪刀：食指與中指伸直
  if (indexUp && middleUp && !ringUp && !pinkyUp) return "scissors";
  // 石頭：全部彎曲
  if (!indexUp && !middleUp && !ringUp && !pinkyUp) return "rock";
  // 繼續手勢：僅食指伸直
  if (indexUp && !middleUp && !ringUp && !pinkyUp) return "continue";
  
  return "none";
}

function drawHandMarkers(landmarks) {
  fill(0, 255, 0);
  noStroke();
  for (let lm of landmarks) {
    ellipse((1 - lm.x) * width, lm.y * height, 10, 10);
  }
}

function handleGame(gesture) {
  fill(0, 0, 0, 150);
  rect(width / 2 - 200, 10, 400, 60, 10);
  fill(255);

  switch (gameState) {
    case STATE_START:
      text("請對鏡頭舉手開始遊戲", width / 2, height / 2);
      if (gesture !== "none") { gameState = STATE_COUNTDOWN; timer = millis(); }
      break;

    case STATE_COUNTDOWN:
      let count = 3 - floor((millis() - timer) / 1000);
      if (count > 0) {
        text("倒數：" + count, width / 2, height / 2);
      } else {
        userChoice = (gesture === "none" || gesture === "continue") ? "rock" : gesture;
        computerChoice = random(["rock", "paper", "scissors"]);
        resultMsg = getJudge(userChoice, computerChoice);

        // 更新分數
        if (resultMsg === "你贏了！") userScore++;
        else if (resultMsg === "電腦贏了！") computerScore++;

        gameState = STATE_RESULT;
        timer = millis();
      }
      break;

    case STATE_RESULT:
      text(`你：${tc(userChoice)}  電腦：${tc(computerChoice)}`, width / 2, 45);
      text(resultMsg, width / 2, height / 2);
      if (millis() - timer > 2500) gameState = STATE_MENU;
      break;

    case STATE_MENU:
      background(0, 180);
      text("遊戲結束，請出手勢選擇：", width / 2, 100);
      fill(100, 255, 100);
      text("☝️ 伸出「食指」：繼續", width / 2, 200);
      fill(255, 100, 100);
      text("✌️ 伸出「剪刀」：結束", width / 2, 300);
      
      if (gesture === "continue") { 
        gameState = STATE_COUNTDOWN; 
        timer = millis(); 
      }
      else if (gesture === "scissors") {
        gameState = STATE_EXIT;
        timer = millis(); // 記錄進入結束畫面的時間點
      }
      break;

    case STATE_EXIT:
      background(0);
      text("謝謝遊玩！\n即將自動重新整理並開始新遊戲...", width / 2, height / 2);
      if (millis() - timer > 2000) {
        window.location.reload(); // 執行瀏覽器重新整理，頁面會恢復到初始狀態
      }
      break;
  }
}

function getJudge(u, c) {
  if (u === c) return "平手！";
  const win = (u === "rock" && c === "scissors") || (u === "scissors" && c === "paper") || (u === "paper" && c === "rock");
  return win ? "你贏了！" : "電腦贏了！";
}

function tc(g) {
  return { rock: "石頭", paper: "布", scissors: "剪刀" }[g] || g;
}
