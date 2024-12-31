let player1, player2;
let player1Sprites = {};
let player2Sprites = {};
let logoAlpha = 0;
let logoScale = 0.8;
let platforms = [];

// 預加載圖片
function preload() {
  // 玩家1的精靈圖
  player1Sprites = {
    run: loadImage('run1.png'),
    jump: loadImage('jump1.png'),
    attack: loadImage('attack1.png')
  };

  // 玩家2的精靈圖
  player2Sprites = {
    run: loadImage('run2.png'),
    jump: loadImage('jump2.png'),
    attack: loadImage('attack2.png')
  };
}

class Platform {
  constructor(x, y, width) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = 15;
    this.color = color(60, 60, 80);
    this.glowIntensity = 0;
    this.glowDirection = 1;
  }

  draw() {
    push();
    // 更新發光效果
    this.glowIntensity += 0.02 * this.glowDirection;
    if (this.glowIntensity > 1 || this.glowIntensity < 0) {
      this.glowDirection *= -1;
    }
    
    // 繪製發光效果
    const glowColor = color(80, 80, 100, 50 * this.glowIntensity);
    fill(glowColor);
    noStroke();
    rect(this.x - 2, this.y - 2, this.width + 4, this.height + 4, 6);
    
    // 繪製主平台
    fill(this.color);
    rect(this.x, this.y, this.width, this.height, 5);
    
    // 平台上的裝飾
    fill(80, 80, 100);
    rect(this.x, this.y, this.width, 2, 2);
    pop();
  }
}

function generatePlatforms() {
  platforms = [];
  
  // 計算最大跳躍高度
  const maxJumpHeight = 180;
  
  // 增加平台數量到5-7個
  const platformCount = floor(random(5, 8));
  
  // 計算平台之間的垂直間距
  const verticalSpacing = maxJumpHeight / (platformCount - 1);
  
  // 生成主要平台
  for (let i = 0; i < platformCount; i++) {
    // 計算平台的基本高度
    const baseY = height - 150 - i * verticalSpacing;
    
    // 平台寬度範圍
    const minWidth = 250;
    const maxWidth = 350;
    const platformWidth = random(minWidth, maxWidth);
    
    // 水平位置（使用三分法分布）
    let x;
    const section = i % 3; // 0: 左側, 1: 中間, 2: 右側
    
    if (section === 0) {
      // 左側平台
      x = random(30, width/3 - platformWidth - 30);
    } else if (section === 1) {
      // 中間平台
      x = random(width/3 + 30, 2*width/3 - platformWidth - 30);
    } else {
      // 右側平台
      x = random(2*width/3 + 30, width - platformWidth - 30);
    }
    
    // 添加一些隨機偏移，但確保在可跳躍範圍內
    const y = baseY + random(-15, 15);
    
    // 檢查與其他平台的距離
    let tooClose = false;
    for (let platform of platforms) {
      const xDist = Math.abs((x + platformWidth/2) - (platform.x + platform.width/2));
      const yDist = Math.abs(y - platform.y);
      if (xDist < 80 && yDist < 50) {
        tooClose = true;
        break;
      }
    }
    
    // 如果位置合適，添加平台
    if (!tooClose) {
      platforms.push(new Platform(x, y, platformWidth));
    }
  }
  
  // 添加額外的小平台
  const extraPlatforms = floor(random(2, 4)); // 增加2-3個額外的小平台
  for (let i = 0; i < extraPlatforms; i++) {
    const width = random(150, 250); // 較小的平台寬度
    const x = random(30, width - width - 30);
    const y = random(height - 400, height - 150);
    
    let tooClose = false;
    for (let platform of platforms) {
      const xDist = Math.abs((x + width/2) - (platform.x + platform.width/2));
      const yDist = Math.abs(y - platform.y);
      if (xDist < 80 && yDist < 50) {
        tooClose = true;
        break;
      }
    }
    
    if (!tooClose) {
      platforms.push(new Platform(x, y, width));
    }
  }
  
  // 確保至少有最小數量的平台
  while (platforms.length < 5) {
    const width = random(200, 300);
    const x = random(30, width - width - 30);
    const y = random(height - 400, height - 150);
    
    let tooClose = false;
    for (let platform of platforms) {
      const xDist = Math.abs((x + width/2) - (platform.x + platform.width/2));
      const yDist = Math.abs(y - platform.y);
      if (xDist < 80 && yDist < 50) {
        tooClose = true;
        break;
      }
    }
    
    if (!tooClose) {
      platforms.push(new Platform(x, y, width));
    }
  }
}

class Player {
  constructor(x, y, sprites, controls, animations, isFlipped = false, name = "") {
    this.x = x;
    this.y = y;
    this.vy = 0;
    this.width = 50;
    this.height = 80;
    this.speed = 5;
    this.isJumping = false;
    this.isAttacking = false;
    this.isFlipped = isFlipped;
    this.controls = controls;
    
    // 動畫相關屬性
    this.sprites = sprites;
    this.currentFrame = 0;
    this.frameCount = 0;
    this.state = 'run';
    
    // 使用傳入的動畫設定
    this.animations = animations;
    this.name = name;
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.isHit = false;
    this.hitCooldown = 0;
    this.jumpForce = -15; // 降低跳躍力度（原本是 -20）
    this.doubleJump = true;
  }

  // 新增受傷方法
  takeDamage(damage) {
    if (!this.isHit && !this.hitCooldown) {
      this.health = max(0, this.health - damage);
      this.isHit = true;
      this.hitCooldown = 60; // 1秒無敵時間
    }
  }

  update() {
    // 修改重力效果
    this.vy += 0.6; // 降低重力加速度使跳躍更輕盈
    this.y += this.vy;
    
    // 限制下落速度
    this.vy = constrain(this.vy, this.jumpForce, 15);

    // 檢查與平台的碰撞
    let onPlatform = false;
    for (let platform of platforms) {
      if (this.vy >= 0 && // 只在下落時檢查
          this.y + this.height >= platform.y && 
          this.y + this.height <= platform.y + platform.height + 10 &&
          this.x + this.width > platform.x && 
          this.x < platform.x + platform.width) {
        
        this.y = platform.y - this.height;
        this.vy = 0;
        this.isJumping = false;
        onPlatform = true;
        break;
      }
    }

    // 地板碰撞檢測
    if (!onPlatform && this.y > height - this.height - 50) { // 50是地板高度
      this.y = height - this.height - 50;
      this.vy = 0;
      this.isJumping = false;
    }

    // 移動控制
    let isMoving = false;
    if (keyIsDown(this.controls.left)) {
      this.x -= this.speed;
      this.isFlipped = true;
      isMoving = true;
    }
    if (keyIsDown(this.controls.right)) {
      this.x += this.speed;
      this.isFlipped = false;
      isMoving = true;
    }

    // 修改狀態更新邏輯
    if (this.isAttacking) {
      this.state = 'attack';
    } else if (this.isJumping) {
      this.state = 'jump';
    } else {
      this.state = 'run'; // 始終使用 run 動畫
    }

    // 只有在移動時才更新動畫幀
    if (keyIsDown(this.controls.left) || keyIsDown(this.controls.right) || 
        this.state === 'attack' || this.state === 'jump') {
      this.frameCount++;
      if (this.frameCount >= this.animations[this.state].frameDelay) {
        this.currentFrame = (this.currentFrame + 1) % this.animations[this.state].frames;
        this.frameCount = 0;
      }
    }

    // 確保角色不會超出畫面
    this.x = constrain(this.x, 0, width - this.width);

    // 更新無敵時間
    if (this.hitCooldown > 0) {
      this.hitCooldown--;
    }
    if (this.hitCooldown === 0) {
      this.isHit = false;
    }

    // 檢查攻擊碰撞
    if (this.isAttacking) {
      let opponent = this === player1 ? player2 : player1;
      let attackBox = this.getAttackBox();
      let opponentBox = opponent.getHitBox();
      
      if (this.checkCollision(attackBox, opponentBox)) {
        opponent.takeDamage(10);
      }
    }
  }

  jump() {
    if (!this.isJumping) {
      this.vy = this.jumpForce;
      this.isJumping = true;
      this.doubleJump = true;
    } else if (this.doubleJump) {
      // 二段跳
      this.vy = this.jumpForce * 0.8; // 二段跳力度略小
      this.doubleJump = false;
    }
  }

  attack() {
    if (!this.isAttacking) {
      this.isAttacking = true;
      this.currentFrame = 0; // 重置動畫幀
      setTimeout(() => {
        this.isAttacking = false;
      }, 500);
    }
  }

  // 獲取攻擊碰撞箱
  getAttackBox() {
    const attackWidth = 50;
    return {
      x: this.isFlipped ? this.x - attackWidth : this.x + this.width,
      y: this.y + 20,
      width: attackWidth,
      height: 40
    };
  }

  // 獲取受傷碰撞箱
  getHitBox() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  // 碰撞檢測
  checkCollision(box1, box2) {
    return box1.x < box2.x + box2.width &&
           box1.x + box1.width > box2.x &&
           box1.y < box2.y + box2.height &&
           box1.y + box1.height > box2.y;
  }

  // 繪製血量條
  drawHealthBar() {
    const barWidth = 80;
    const barHeight = 8;
    const padding = 2;
    const nameOffset = 15;
    
    // 計算血量條的中心位置
    const centerX = this.x + this.width / 2;
    const topY = this.y - 25;
    
    push();
    // 血量條外框
    stroke(0);
    strokeWeight(1);
    fill(40, 40, 40, 200);
    rect(centerX - barWidth/2 - padding, 
         topY - padding, 
         barWidth + padding * 2, 
         barHeight + padding * 2,
         4); // 圓角效果
    
    // 血量條背景
    noStroke();
    fill(200, 0, 0);
    rect(centerX - barWidth/2, 
         topY, 
         barWidth, 
         barHeight,
         2);
    
    // 當前血量
    fill(0, 200, 0);
    rect(centerX - barWidth/2, 
         topY, 
         (this.health / this.maxHealth) * barWidth, 
         barHeight,
         2);
    
    // 玩家名稱
    noStroke();
    fill(255);
    textSize(12);
    textStyle(BOLD);
    textAlign(CENTER);
    text(this.name, centerX, topY - nameOffset);
    pop();
  }

  draw() {
    // 受傷閃爍效果
    if (this.isHit && frameCount % 4 < 2) {
      tint(255, 0, 0);
    }
    
    push();
    if (this.sprites && this.sprites[this.state]) {
      const animation = this.animations[this.state];
      const sprite = this.sprites[this.state];
      const frameWidth = sprite.width / animation.frames;
      const frameHeight = sprite.height;

      if (this.isFlipped) {
        translate(this.x + this.width, this.y);
        scale(-1, 1);
      } else {
        translate(this.x, this.y);
      }

      // 加入偏移量
      translate(animation.offsetX * (this.isFlipped ? -1 : 1), animation.offsetY);

      image(
        sprite,
        0,
        0,
        animation.width,  // 使用指定的寬度
        animation.height, // 使用指定的高度
        this.currentFrame * frameWidth,
        0,
        frameWidth,
        frameHeight
      );
    } else {
      // 如果沒有精靈圖，則繪製簡單的方塊
      if (this.isFlipped) {
        translate(this.x + this.width, this.y);
        scale(-1, 1);
        rect(0, 0, -this.width, this.height);
      } else {
        rect(this.x, this.y, this.width, this.height);
      }
    }
    pop();

    noTint(); // 重置著色
    this.drawHealthBar();
  }
}

function setup() {
  // 創建全螢幕畫布
  createCanvas(windowWidth, windowHeight);
  generatePlatforms();
  
  // 玩家1的動畫設定
  const player1Animations = {
    run: {
      frames: 3,
      frameDelay: 8,
      width: 76.3,
      height: 100,
      offsetX: 0,
      offsetY: 0
    },
    jump: {
      frames: 3,
      frameDelay: 6,
      width: 76,
      height: 114,
      offsetX: 0,
      offsetY: 0
    },
    attack: {
      frames: 3,
      frameDelay: 6,
      width: 99.3,
      height: 107,
      offsetX: 0,
      offsetY: 0
    }
  };

  // 玩家2的動畫設定
  const player2Animations = {
    run: {
      frames: 3,
      frameDelay: 8,
      width: 105,
      height: 102,
      offsetX: 0,
      offsetY: 0
    },
    jump: {
      frames: 3,
      frameDelay: 6,
      width: 80,
      height: 120,
      offsetX: 0,
      offsetY: 0
    },
    attack: {
      frames: 3,
      frameDelay: 6,
      width: 116,
      height: 112,
      offsetX: 0,
      offsetY: 0
    }
  };
  
  // 創建玩家1，加入名稱
  player1 = new Player(
    width * 0.2, 
    height - 150, 
    player1Sprites,
    {
      left: 65,  // A
      right: 68, // D
      jump: 87,  // W
      attack: 70 // F
    },
    player1Animations,
    false,
    "Player 1"
  );

  // 創建玩家2，加入名稱
  player2 = new Player(
    width * 0.8, 
    height - 150, 
    player2Sprites,
    {
      left: LEFT_ARROW,
      right: RIGHT_ARROW,
      jump: UP_ARROW,
      attack: 191  // /
    },
    player2Animations,
    true,
    "Player 2"
  );

  gameStartTime = millis();
}

// 視窗調整大小時重新設定畫布
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generatePlatforms(); // 重新生成適應新視窗大小的平台
}

function drawBackground() {
  // 繪製漸層背景
  let c1 = color(25, 25, 112); // 深藍色
  let c2 = color(70, 130, 180); // 淺藍色
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    let c = lerpColor(c1, c2, inter);
    stroke(c);
    line(0, y, width, y);
  }

  // 繪製裝飾性的圓點
  noStroke();
  fill(255, 255, 255, 30);
  for (let i = 0; i < 50; i++) {
    let x = (frameCount * 0.5 + i * width/50) % width;
    let y = noise(i * 0.1, frameCount * 0.01) * height;
    circle(x, y, 3);
  }

  // 繪製地板
  fill(40, 40, 60);
  rect(0, height - 50, width, 50);

  // 地板裝飾
  stroke(60, 60, 80);
  for (let x = 0; x < width; x += 50) {
    line(x, height - 50, x, height);
  }
  for (let y = height - 40; y < height; y += 10) {
    line(0, y, width, y);
  }

  // 繪製裝飾性的光線
  stroke(255, 255, 255, 20);
  for (let i = 0; i < 5; i++) {
    let x = (frameCount + i * 200) % width;
    line(x, 0, x - 100, height);
  }

  // 繪製平台
  for (let platform of platforms) {
    platform.draw();
  }
}

function drawLogo() {
  push();
  // 呼吸效果
  logoScale = 1.2 + sin(frameCount * 0.05) * 0.08; // 增加基礎大小和呼吸幅度
  logoAlpha = 180 + sin(frameCount * 0.05) * 50;   // 增加透明度
  
  // 設置文字樣式
  textAlign(RIGHT, BOTTOM);
  textStyle(BOLD);
  textSize(36 * logoScale); // 增加字體大小
  
  // 發光效果
  for (let i = 0; i < 3; i++) {
    let glowSize = i * 2;
    fill(255, 255, 255, logoAlpha * 0.1);
    text('TKUET', width - 30 - glowSize, height - 20 - glowSize);
  }
  
  // 繪製陰影效果
  fill(0, 0, 0, logoAlpha * 0.5);
  text('TKUET', width - 28, height - 18);
  
  // 繪製主要文字
  fill(255, 255, 255, logoAlpha);
  text('TKUET', width - 30, height - 20);
  
  // 添加裝飾性底線
  stroke(255, 255, 255, logoAlpha);
  strokeWeight(3);
  const textWidth = 120 * logoScale;
  line(width - 30 - textWidth, height - 15,
       width - 30, height - 15);
  
  pop();
}

function draw() {
  // 使用自定義背景替代圖片
  drawBackground();
  
  // 更新和繪製玩家
  player1.update();
  player2.update();
  
  player1.draw();
  player2.draw();
  
  // 繪製操作說明
  drawInstructions();
  
  // 繪製遊戲時間
  push();
  const gameTime = floor((millis() - gameStartTime) / 1000);
  textAlign(CENTER);
  textSize(24);
  textStyle(BOLD);
  fill(0, 0, 0, 150);
  noStroke();
  rect(width/2 - 50, 10, 100, 40, 10);
  fill(255);
  text(formatTime(gameTime), width/2, 38);
  pop();
  
  // 繪製 TKUET 標誌
  drawLogo();
  
  // 檢查遊戲結束
  checkGameOver();
}

function drawInstructions() {
  push();
  // 半透明背景
  fill(0, 0, 0, 150);
  noStroke();
  rect(10, 10, 160, 100, 10); // 左側控制說明
  rect(width - 170, 10, 160, 100, 10); // 右側控制說明
  
  fill(255);
  textSize(14);
  textStyle(BOLD);
  
  // 玩家1操作說明
  textAlign(LEFT);
  fill(0, 255, 0); // 綠色標題
  text("Player 1 Controls", 20, 30);
  fill(255); // 白色文字
  text("A / D  -  Move", 20, 50);
  text("W      -  Jump", 20, 70);
  text("F       -  Attack", 20, 90);
  
  // 玩家2操作說明
  textAlign(LEFT);
  fill(0, 150, 255); // 藍色標題
  text("Player 2 Controls", width - 160, 30);
  fill(255); // 白色文字
  text("← / →  -  Move", width - 160, 50);
  text("↑        -  Jump", width - 160, 70);
  text("/         -  Attack", width - 160, 90);
  pop();
}

function checkGameOver() {
  if (player1.health <= 0 || player2.health <= 0) {
    const winner = player1.health > 0 ? player1.name : player2.name;
    const winnerColor = player1.health > 0 ? color(0, 255, 0) : color(0, 150, 255);
    
    // 半透明黑色背景
    background(0, 0, 0, 150); // 整個畫面變暗
    
    push();
    // 中央面板背景
    fill(0, 0, 0, 200);
    noStroke();
    rectMode(CENTER);
    rect(width/2, height/2, 500, 300, 30);
    
    // 發光邊框
    for (let i = 0; i < 3; i++) {
      stroke(winnerColor.levels[0], winnerColor.levels[1], winnerColor.levels[2], 50);
      strokeWeight(3 - i);
      noFill();
      rect(width/2, height/2, 500 + i*10, 300 + i*10, 30);
    }
    
    textAlign(CENTER, CENTER);
    
    // "GAME OVER" 文字
    textSize(60);
    textStyle(BOLD);
    // 文字陰影
    fill(0);
    text("GAME OVER", width/2 + 3, height/2 - 80 + 3);
    // 主要文字
    fill(255);
    text("GAME OVER", width/2, height/2 - 80);
    
    // 勝利者文字
    textSize(48);
    // 文字陰影
    fill(0);
    text(winner + " Wins!", width/2 + 2, height/2 + 2);
    // 主要文字
    fill(winnerColor);
    text(winner + " Wins!", width/2, height/2);
    
    // 重新開始提示
    textSize(24);
    // 閃爍效果
    const blinkAlpha = map(sin(frameCount * 0.1), -1, 1, 100, 255);
    fill(255, blinkAlpha);
    text("Press SPACE to restart", width/2, height/2 + 80);
    
    // 添加裝飾性元素
    stroke(winnerColor);
    strokeWeight(2);
    noFill();
    
    // 左上角裝飾
    line(width/2 - 230, height/2 - 130, width/2 - 180, height/2 - 130);
    line(width/2 - 230, height/2 - 130, width/2 - 230, height/2 - 80);
    
    // 右上角裝飾
    line(width/2 + 180, height/2 - 130, width/2 + 230, height/2 - 130);
    line(width/2 + 230, height/2 - 130, width/2 + 230, height/2 - 80);
    
    // 左下角裝飾
    line(width/2 - 230, height/2 + 130, width/2 - 180, height/2 + 130);
    line(width/2 - 230, height/2 + 130, width/2 - 230, height/2 + 80);
    
    // 右下角裝飾
    line(width/2 + 180, height/2 + 130, width/2 + 230, height/2 + 130);
    line(width/2 + 230, height/2 + 130, width/2 + 230, height/2 + 80);
    
    pop();
    
    noLoop();
  }
}

function keyPressed() {
  // 玩家1控制
  if (keyCode === 87) { // W鍵
    player1.jump();
  }
  if (keyCode === 70) { // F鍵
    player1.attack();
  }

  // 玩家2控制
  if (keyCode === UP_ARROW) {
    player2.jump();
  }
  if (keyCode === 191) { // /鍵
    player2.attack();
  }

  // 重新開始遊戲
  if (keyCode === 32 && (player1.health <= 0 || player2.health <= 0)) {
    player1.health = player1.maxHealth;
    player2.health = player2.maxHealth;
    generatePlatforms(); // 重新生成平台
    gameStartTime = millis();
    loop();
  }
}

// 格式化時間的輔助函數
function formatTime(seconds) {
  const minutes = floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return nf(minutes, 2) + ':' + nf(remainingSeconds, 2);
}
