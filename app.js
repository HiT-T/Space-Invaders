// load images from assets.
function loadTexture(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = path;
    img.onload = () => {
      resolve(img);
    }
  })
}

// class definition for the publisher in pub sub pattern.
class EventEmitter {
  constructor() {
    // key: message, value: array of listeners.
    this.listeners = {};
  }

  // add subscriber's listener to a message.
  on(message, listener) {
    if (!this.listeners[message]) {
      this.listeners[message] = [];
    }
    this.listeners[message].push(listener);
  }

  // call all functions listening to the message.
  emit(message, payload) {
    if (this.listeners[message]) {
      this.listeners[message].forEach((l) => l(message, payload));
    }
  }

  // reset all message listeners.
  clear() {
    this.listeners = {};
  }
}

const Message = {
  KEY_EVENT_UP: 'KEY_EVENT_UP',
  KEY_EVENT_DOWN: 'KEY_EVENT_DOWN',
  KEY_EVENT_LEFT: 'KEY_EVENT_LEFT',
  KEY_EVENT_RIGHT: 'KEY_EVENT_RIGHT',
  KEY_EVENT_UP_LEFT: 'KEY_EVENT_UP_LEFT',
  KEY_EVENT_UP_RIGHT: 'KEY_EVENT_UP_RIGHT',
  KEY_EVENT_LEFT_DOWN: 'KEY_EVENT_LEFT_DOWN',
  KEY_EVENT_RIGHT_DOWN: 'KEY_EVENT_RIGHT_DOWN',
  KEY_EVENT_SPACE: 'KEY_EVENT_SPACE',
  KEY_EVENT_RELEASED: 'KEY_EVENT_RELEASED',
  KEY_EVENT_ENTER: 'KEY_EVENT_ENTER',
  COLLISION_LASERRED_ENEMYSHIP: 'COLLISION_LASERRED_ENEMYSHIP',
  COLLISION_LASERRED_ENEMYUFO: 'COLLISION_LASERRED_ENEMYUFO',
  COLLISION_PLAYER_ENEMY: 'COLLISION_PLAYER_ENEMY',
  COLLISION_PLAYER_LASERGREEN: 'COLLISION_PLAYER_LASERGREEN',
  COLLISION_ENEMY_BOTTOM: 'COLLISION_ENEMY_BOTTOM',
  END_GAME_WIN: 'END_GAME_WIN',
  END_GAME_LOSE: 'END_GAME_LOSE',
};

const green = 'rgb(25, 173, 47)';

let background_layer,
    game_layer,
    background_ctx,
    game_ctx,
    backgroundImg,
    starBigImg, 
    starSmallImg, 
    playerImg,
    playerLeftImg,
    playerRightImg,
    enemyShipImg, 
    enemyUFOImg, 
    laserRedImg,
    laserRedShotImg,
    laserGreenImg,
    laserGreenShotImg,
    playerDamagedImg,
    lifeImg,
    player,
    gameObjects = [],
    eventEmitter = new EventEmitter()
    activeKey = new Set(),
    gameEnds = false;

function createGalaxy() {
  background_ctx.fillRect(0, 0, background_layer.width, background_layer.height);
  background_ctx.drawImage(backgroundImg, 0, 0, background_layer.width, background_layer.height);

  const numBigStars = 30;
  const numSmallStars = 100;
  const bigWidth = starBigImg.width;
  const bigHeight = starBigImg.height;
  const smallWidth = starSmallImg.width;
  const smallHeight = starSmallImg.height;

  for (let i = 0; i < numBigStars; i++) {
    let x = Math.random() * background_layer.width;
    let y = Math.random() * background_layer.height;;
    background_ctx.drawImage(starBigImg, x, y, bigWidth, bigHeight);
  }

  for (let i = 0; i < numSmallStars; i++) {
    let x = Math.random() * background_layer.width;
    let y = Math.random() * background_layer.height;
    background_ctx.drawImage(starSmallImg, x, y, smallWidth, smallHeight);
  }
}

class GameObject {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dead = false;
    this.type = '';
    this.width = 0;
    this.height = 0;
    this.img = undefined;
  }

  show() {
    game_ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
  }

  getRect() {
    return {
      left: this.x,
      top: this.y,
      right: this.x + this.width,
      bottom: this.y + this.height,
    }
  }
}

function intersectRect(r1, r2) {
  // negation logic simplifies the implementation: if not outside, must be intersected.
  return !(
    r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top
  );
}

class LaserRed extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.type = 'LaserRed';
    this.width = laserRedImg.width / 2;
    this.height = laserRedImg.height / 2;
    this.img = laserRedImg;

    let id = setInterval(() => {
      if (this.y > 0) {
        this.y -= 15;
      } else {
        this.dead = true;
        clearInterval(id);
      }
    }, 100);
  }
}

class Explosion extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.type = 'Explosion';

    // explosion only lasts for 0.5 seconds.
    setTimeout(() => { this.dead = true; }, 500);
  }
}

class PlayerExplosion extends Explosion {
  constructor(x, y) {
    super(x, y);
    this.width = laserGreenShotImg.width;
    this.height = laserGreenShotImg.height;
    this.type = 'PlayerExplosion';
    this.img = laserGreenShotImg;
  }
}

class Player extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.type = 'Player';
    this.dead = undefined;
    this.width = playerImg.width / 2;
    this.height = playerImg.height / 2;
    this.img = playerImg;
    this.cooldown = 0;
    this.life = 3;
    this.scores = 0;
  }

  moveUp() {
    this.y -= 5;
  }

  moveDown() {
    this.y += 5;
  }

  moveLeft() {
    this.img = playerLeftImg;
    this.x -= 5;
  }

  moveRight() {
    this.img = playerRightImg;
    this.x += 5;
  }

  moveUpLeft() {
    this.img = playerLeftImg;
    this.y -= 4;
    this.x -= 4;
  }

  moveUpRight() {
    this.img = playerRightImg;
    this.y -= 4;
    this.x += 4;
  }

  moveLeftDown() {
    this.img = playerLeftImg;
    this.x -= 4;
    this.y += 4;
  }

  moveRightDown() {
    this.img = playerRightImg;
    this.x += 4;
    this.y += 4;
  }

  stop() {
    this.img = playerImg;
  }

  canFire() {
    return this.cooldown == 0;
  }

  fire() {
    gameObjects.push(new LaserRed(this.x + this.width/2 - laserRedImg.width/4,
       this.y - laserRedImg.height/2));
    
    this.cooldown = 5;
    let id = setInterval(() => {
      this.cooldown -= 1;
      if (this.cooldown == 0) {
        clearInterval(id);
      }
    }, 200);
  }

  isHit() {
    this.life -= 1;

    if (this.life == 0) {
      this.dead = true;
    } else {
      this.img = playerDamagedImg;
      setTimeout(() => { this.img = playerImg; }, 3000);
    }
  }
}

class LaserGreen extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.type = 'LaserGreen';
    this.width = laserGreenImg.width / 2;
    this.height = laserGreenImg.height / 2;
    this.img = laserGreenImg;
    this.intervalID = null; // keep track of the interval, so we can clear it when game ends.

    this.intervalID = setInterval(() => {
      if (this.y < game_layer.height) {
        this.y += 15;
      } else {
        this.dead = true;
        clearInterval(this.intervalID);
      }
    }, 100);
  }

  explode() {
    clearInterval(this.intervalID);

    gameObjects.push(new PlayerExplosion(this.x - (laserGreenShotImg.width/2 - playerImg.width/4),
     this.y - (laserGreenShotImg.height/2 - playerImg.height/4)));
  }
}

class EnemyExplosion extends Explosion {
  constructor(x, y) {
    super(x, y);
    this.width = laserRedShotImg.width;
    this.height = laserRedShotImg.height;
    this.type = 'EnemyExplosion';
    this.img = laserRedShotImg;
  }
}

class Enemy extends GameObject {
  constructor(x, y) {
    super(x, y);

    let id = setInterval(() => {
      if (this.y < game_layer.height - this.height) {
        this.y += 3;
      } else {
        console.log("Stop at", this.y);
        clearInterval(id);
      }
    }, 600);
  }
}

class EnemyShip extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = 'EnemyShip';
    this.width = enemyShipImg.width / 2;
    this.height = enemyShipImg.height / 2;
    this.img = enemyShipImg;
    this.intervalID = null; // keep track of the interval, so we can clear it when game ends.

    // Enemyships fire every 10 seconds.
    this.keep_firing();
  }

  keep_firing() {
    this.intervalID = setInterval(() => {
      if (this.dead) {
        clearInterval(this.intervalID);
        return;
      }
      
      gameObjects.push(new LaserGreen(this.x + this.width/2 - laserGreenImg.width/4,
        this.y + this.height));
    }, 10000);
  }

  explode() {
    gameObjects.push(new EnemyExplosion(this.x - (laserRedShotImg.width/2 - enemyShipImg.width/4),
     this.y - (laserRedShotImg.height/2 - enemyShipImg.height/4)));
  }
}

class EnemyUFO extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = 'EnemyUFO';
    this.width = enemyUFOImg.width / 2;
    this.height = enemyUFOImg.height / 2;
    this.img = enemyUFOImg;
    this.life = 2; // EnemyUFO can be hit twice before it dies.
  }

  isHit() {
    this.life -= 1;
    if (this.life == 0) {
      this.dead = true;
    }
  }

  explode() {
    gameObjects.push(new EnemyExplosion(this.x - (laserRedShotImg.width/2 - enemyUFOImg.width/4),
     this.y - (laserRedShotImg.height/2 - enemyUFOImg.height/4)));
  }
}

function createPlayer() {
  const x = (game_layer.width - playerImg.width) / 2;
  const y = game_layer.height*(7/8) - playerImg.height/2;
  player = new Player(x, y);
  gameObjects.push(player);
}

// set initial positions for enemies.
function createEnemies() {
  const MOSTER_WIDTH = 10 * enemyShipImg.width/2;
  const START_X = (game_layer.width - MOSTER_WIDTH) / 2;
  const STOP_X = START_X + MOSTER_WIDTH;

  for (let x = START_X; x < STOP_X; x += enemyShipImg.width/2) {
    let y;
    for (y = 0; y < enemyUFOImg.height; y += enemyUFOImg.height/2) {
      const enemyUFO = new EnemyUFO(x, y);
      gameObjects.push(enemyUFO);
    }

    for (y = enemyUFOImg.height;
       y < (enemyUFOImg.height + 3 * enemyShipImg.height/2);
        y += enemyShipImg.height/2) 
    {
      const enemyShip = new EnemyShip(x, y);
      gameObjects.push(enemyShip);
    }
  }
}

// depending on the key pressed, calling the listeners to move the player.
window.addEventListener('keydown', (evt) => {
  const moveKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  if (moveKey.includes(evt.key)) {
    activeKey.add(evt.key);
  }

  if (activeKey.size === 2) {
    if (activeKey.has('ArrowUp') && activeKey.has('ArrowLeft')) {
      evt.preventDefault();
      eventEmitter.emit(Message.KEY_EVENT_UP_LEFT);
    }
    if (activeKey.has('ArrowUp') && activeKey.has('ArrowRight')) {
      evt.preventDefault();
      eventEmitter.emit(Message.KEY_EVENT_UP_RIGHT);
    }
    if (activeKey.has('ArrowLeft') && activeKey.has('ArrowDown')) {
      evt.preventDefault();
      eventEmitter.emit(Message.KEY_EVENT_LEFT_DOWN);
    }
    if (activeKey.has('ArrowRight') && activeKey.has('ArrowDown')) {
      evt.preventDefault();
      eventEmitter.emit(Message.KEY_EVENT_RIGHT_DOWN);
    }
    if (activeKey.has('ArrowUp') && activeKey.has('ArrowDown')) {
      evt.preventDefault();
    }
  }

  if (activeKey.size === 1) {
    if (evt.key === 'ArrowUp') {
      evt.preventDefault();
      eventEmitter.emit(Message.KEY_EVENT_UP);
    }
    if (evt.key === 'ArrowDown') {
      evt.preventDefault();
      eventEmitter.emit(Message.KEY_EVENT_DOWN);
   }
    if (evt.key === 'ArrowLeft') {
      evt.preventDefault();
      eventEmitter.emit(Message.KEY_EVENT_LEFT);
    }
    if (evt.key === 'ArrowRight') {
      evt.preventDefault();
      eventEmitter.emit(Message.KEY_EVENT_RIGHT);
    }
  }

  if (evt.key === ' ') {
    evt.preventDefault();
    eventEmitter.emit(Message.KEY_EVENT_SPACE);
  }

  if(evt.key === "Enter") {
    eventEmitter.emit(Message.KEY_EVENT_ENTER);
  }
});

// when the key is released, stop the player.
window.addEventListener('keyup', (evt) => {
  activeKey.delete(evt.key);
  if (evt.key === 'ArrowUp' || evt.key === 'ArrowDown' || evt.key === 'ArrowLeft'
     || evt.key === 'ArrowRight') 
  {
    evt.preventDefault();
    eventEmitter.emit(Message.KEY_EVENT_RELEASED);
  }
});

// draw the player's life on the screen.
function drawLife() {
  let START_POS = game_layer.width - 180;

  for (let i = 1; i <= player.life; i++) {
    game_ctx.drawImage(
      lifeImg,
      START_POS + 45 * i, 
      game_layer.height - 100
    );
  }
}

// draw the game scores on the screen.
function drawScores() {
  game_ctx.font = 'bold 24px Arial';
  game_ctx.fillStyle = green;
  game_ctx.textAlign = 'left';
  game_ctx.fillText("Scores: " + player.scores, game_layer.width - 160, game_layer.height - 47);
}

// format the message and print it on the screen.
function printMessage(message, color, x, y) {
  game_ctx.font = 'bold 32px Arial';
  game_ctx.fillStyle = color;
  game_ctx.textAlign = 'center';
  game_ctx.fillText(message, x, y);
}

function endGame(win) {
  gameEnds = true; // used to stop the game loop.
  game_ctx.clearRect(0, 0, game_layer.width, game_layer.height);

  if (win) {
    printMessage("Victory!!! Pew pew...", green, game_layer.width/2, game_layer.height/2);
    printMessage("Your scores: " + player.scores, green, game_layer.width/2, game_layer.height/2 + 35);
    printMessage("Press [Enter] to start a new game Captain Pew Pew", green, game_layer.width/2,
      game_layer.height/2 + 70);
  } else {
    printMessage("You lose!!!", "red", game_layer.width/2, game_layer.height/2);
    printMessage("Your scores: " + player.scores, "red", game_layer.width/2, game_layer.height/2 + 35);
    printMessage("Press [Enter] to start a new game Captain Pew Pew", "red", game_layer.width/2,
      game_layer.height/2 + 70);
  }
}

function restartGame() {
  gameEnds = false;
  gameObjects.forEach((go) => {
    if (go.intervalID) {
      clearInterval(go.intervalID);
    }
  });
  gameObjects = [];
  eventEmitter.clear();
  initGame();
  requestAnimationFrame(gameLoop);
}

function enemiesAreDead() {
  const enemies = gameObjects.filter((e) => (e.type === 'EnemyShip' || e.type === 'EnemyUFO') && !e.dead);
  return enemies.length === 0;
}

// initialization: create canvas & ctx, load assets, prepare every drawable objects, 
// and game operations.
async function initGame() {
  // create canvases and contexts.
  background_layer = document.getElementById('background-layer');
  game_layer = document.getElementById('game-layer');
  background_ctx = background_layer.getContext('2d');
  game_ctx = game_layer.getContext('2d');

  // load assets.
  backgroundImg = await loadTexture('spaceArt/png/Background/backgroundColor.png');
  starBigImg = await loadTexture('spaceArt/png/Background/starBig.png');
  starSmallImg = await loadTexture('spaceArt/png/Background/starSmall.png')
  playerImg = await loadTexture('spaceArt/png/player.png');
  playerLeftImg = await loadTexture('spaceArt/png/playerLeft.png');
  playerRightImg = await loadTexture('spaceArt/png/playerRight.png');
  playerDamagedImg = await loadTexture('spaceArt/png/playerDamaged.png');
  enemyShipImg = await loadTexture('spaceArt/png/enemyShip.png');
  enemyUFOImg = await loadTexture('spaceArt/png/enemyUFO.png');
  laserRedImg = await loadTexture('spaceArt/png/laserRed.png');
  laserRedShotImg = await loadTexture('spaceArt/png/laserRedShot.png');
  laserGreenImg = await loadTexture('spaceArt/png/laserGreen.png');
  laserGreenShotImg = await loadTexture('spaceArt/png/laserGreenShot.png');
  lifeImg = await loadTexture("spaceArt/png/life.png");

  // create game objects (including background and game layers).
  createGalaxy();
  createPlayer();
  createEnemies();

  // initialize scoring system on the screen.
  drawLife();
  drawScores();

  // let player, enemies, and lasers subscribe to messages sent by the publisher.
  eventEmitter.on(Message.KEY_EVENT_UP, () => {
    player.moveUp();
  });
  eventEmitter.on(Message.KEY_EVENT_DOWN, () => {
    player.moveDown();
  });
  eventEmitter.on(Message.KEY_EVENT_LEFT, () => {
    player.moveLeft();
  });
  eventEmitter.on(Message.KEY_EVENT_RIGHT, () => {
    player.moveRight();
  });
  eventEmitter.on(Message.KEY_EVENT_UP_LEFT, () => {
    player.moveUpLeft();
  });
  eventEmitter.on(Message.KEY_EVENT_UP_RIGHT, () => {
    player.moveUpRight();
  });
  eventEmitter.on(Message.KEY_EVENT_LEFT_DOWN, () => {
    player.moveLeftDown();
  });
  eventEmitter.on(Message.KEY_EVENT_RIGHT_DOWN, () => {
    player.moveRightDown();
  });
  eventEmitter.on(Message.KEY_EVENT_RELEASED, () => {
    player.stop();
  });
  eventEmitter.on(Message.KEY_EVENT_SPACE, () => {
    if (player.canFire()) {
      player.fire();
    }
  });
  eventEmitter.on(Message.COLLISION_LASERRED_ENEMYSHIP, (_, { first, second }) => {
    first.dead = true;
    second.dead = true;
    second.explode();
    player.scores += 100;

    if (enemiesAreDead()) {
      eventEmitter.emit(Message.END_GAME_WIN);
    }
  });
  eventEmitter.on(Message.COLLISION_LASERRED_ENEMYUFO, (_, { first, second }) => {
    first.dead = true;
    second.isHit();
    if (second.dead) {
      second.explode();
      player.scores += 200;
    }

    if (enemiesAreDead()) {
      eventEmitter.emit(Message.END_GAME_WIN);
    }
  });
  eventEmitter.on(Message.COLLISION_PLAYER_LASERGREEN, (_, { laser }) => {
    player.isHit();
    laser.explode();
    laser.dead = true;

    if (player.dead) {
      eventEmitter.emit(Message.END_GAME_LOSE);
    }
  });
  eventEmitter.on(Message.COLLISION_PLAYER_ENEMY, (_, { enemy }) => {
    player.isHit();
    enemy.explode();
    enemy.dead = true;
    player.scores += 50;

    if (enemiesAreDead()) {
      eventEmitter.emit(Message.END_GAME_WIN);
    } // when player and enemies die meantime, win before lose.

    if (player.dead) {
      eventEmitter.emit(Message.END_GAME_LOSE);
    }
  });
  eventEmitter.on(Message.END_GAME_WIN, () => {
    endGame(true);
  });
  eventEmitter.on(Message.END_GAME_LOSE, () => {
    endGame(false);
  });
  eventEmitter.on(Message.KEY_EVENT_ENTER, () => {
    // only allow restart when the game ends.
    if (gameEnds) {
      restartGame();
    }
  })
}

function reachBottom(enemies) {
  return enemies.some((e) => e.getRect().bottom >= game_layer.height);
}

function updateGameStatus() {
  const laserreds = gameObjects.filter((l) => l.type === 'LaserRed');
  const lasergreens = gameObjects.filter((l) => l.type === 'LaserGreen');
  const enemies = gameObjects.filter((e) => e.type === 'EnemyShip' || e.type === 'EnemyUFO');
  const enemyShips = enemies.filter((e) => e.type === 'EnemyShip');
  const enemyUFOs = enemies.filter((e) => e.type === 'EnemyUFO');

  // another way to lose the game: enemies reach the bottom.
  if (reachBottom(enemies)) {
    eventEmitter.emit(Message.END_GAME_LOSE);
    return;
  }

  // check if any lasers of player hits the enemyShips.
  laserreds.forEach((l) => {
    enemyShips.forEach((e) => {
      if (intersectRect(l.getRect(), e.getRect())) {
        eventEmitter.emit(Message.COLLISION_LASERRED_ENEMYSHIP, { 
          first: l,
          second: e
        });
      }
    });
  });

  // check if any lasers of player hits the enemyUFOs.
  laserreds.forEach((l) => {
    enemyUFOs.forEach((e) => {
      if (intersectRect(l.getRect(), e.getRect())) {
        eventEmitter.emit(Message.COLLISION_LASERRED_ENEMYUFO, { 
          first: l,
          second: e
        });
      }
    });
  });

  // check if any lasers of enemieShips hit player.
  lasergreens.forEach((l) => {
    if (intersectRect(player.getRect(), l.getRect())) {
      eventEmitter.emit(Message.COLLISION_PLAYER_LASERGREEN, { laser: l });
    }
  });
  
  // check if player collides with the enemies.
  enemies.forEach((e) => {
    if (intersectRect(player.getRect(), e.getRect())) {
      eventEmitter.emit(Message.COLLISION_PLAYER_ENEMY, { enemy: e });
    }
  });

  // remove dead objects from the game.
  gameObjects = gameObjects.filter((e) => !e.dead);

  // update the scoring system on the screen.
  drawLife();
  drawScores();
}

function drawGameObjects() {
  gameObjects.forEach((go) => { go.show(); });
}

// from frame to frame, clear thr canvas and redraw the moving objects.
function gameLoop() {
  if (gameEnds) { return; }

  game_ctx.clearRect(0, 0, game_layer.width, game_layer.height);
  updateGameStatus();
  drawGameObjects();

  requestAnimationFrame(gameLoop);
}

// start the game the first time when the window is loaded.
window.onload = async () => {
  await initGame();
  requestAnimationFrame(gameLoop);
}