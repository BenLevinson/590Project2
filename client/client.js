let canvas;
let ctx;
let socket;
let color;
let hash;
let moveLeft;
let moveRight;
let moveUp;
let moveDown;
const users = {};
const leftKey = 37;
const upKey = 38;
const rightKey = 39;
const downKey = 40;
const aKey = 65;
const dKey = 68;
const sKey = 83;
const wKey = 87;

// create user when joining room
const createUser = (data) => {
  hash = data.hash;
  users[hash] = data;
  users[hash].color = color;
  requestAnimationFrame(draw);
};
// delete user when they leave room
const removeUser = (data) => {
  if (users[data]) {
    delete users[data];
  }
};
// update users positions, forces, and health based on data server sends
const update = (data) => {
  if (!users[data.user.hash]) {
    users[data.user.hash] = data.user;
    return;
  }
  const user = users[data.user.hash];
  if (user.lastUpdate >= data.user.lastUpdate) {
    return;
  }
  user.lastUpdate = data.user.lastUpdate;
  user.prevX = data.user.prevX;
  user.prevY = data.user.prevY;
  user.destX = data.user.destX;
  user.destY = data.user.destY;
  user.alpha = 0.05;
  // check what direction of client is, then add velocity to destination accordingly
  // if there was a wall collision, add a flat bounce rate
  // if they go out of bounds, send them right back in
  if (data.xDir === 'left') {
    if (data.wallCollision === 'true') {
      user.destX -= data.currVelocityX * 15;
      data.wallCollision = false;
    } else {
      user.destX -= data.currVelocityX;
      if (user.x <= 0) {
        user.destX = 5;
      }
    }
  } else if (data.xDir === 'right') {
    if (data.wallCollision === 'true') {
      user.destX += data.currVelocityX * 15;
      data.wallCollision = false;
    } else {
      user.destX += data.currVelocityX;
      if (user.x >= 925) {
        user.destX = 920;
      }
    }
  } if (data.yDir === 'up') {
    if (data.wallCollision === 'true') {
      user.destY -= data.currVelocityY * 15;
      data.wallCollision = false;
    } else {
      user.destY -= data.currVelocityY;
      if (user.y <= 0) {
        user.destY = 5;
      }
    }
  } else if (data.yDir === 'down') {
    if (data.wallCollision === 'true') {
      user.destY += data.currVelocityY * 15;
      data.wallCollision = false;
    } else {
      user.destY += data.currVelocityY;
      if (user.y >= 725) {
        user.destY = 720;
      }
    }
  }
  // make sure user velocity and health are what they're supposed to be
  user.currVelocityX = data.currVelocityX;
  user.currVelocityY = data.currVelocityY;
  user.health = data.currHealth;
};
// lerp method to move users with minimum lag
const lerp = (v0, v1, alpha) => ((((1 - alpha) * v0) + alpha) * v1);
// update position based on what key(s) was/were pressed
const updatePos = () => {
  const user = users[hash];
  let xDirection = '';
  let yDirection = '';
  user.prevX = user.x;
  user.prevY = user.y;
  if (moveLeft || moveRight || moveUp || moveDown) {
    if (moveLeft) {
      xDirection = 'left';
    } else if (moveRight) {
      xDirection = 'right';
    } if (moveUp) {
      yDirection = 'up';
    } else if (moveDown) {
      yDirection = 'down';
    }
  }
  if (!moveLeft && !moveRight) {
    xDirection = 'none';
  } if (!moveUp && !moveDown) {
    yDirection = 'none';
  }
  user.alpha = 0.1;
  socket.emit('moveUpdate', {
    usr: user,
    xDir: xDirection,
    yDir: yDirection,
    currVelX: user.currVelocityX,
    currVelY: user.currVelocityY,
    currHealth: user.health,
    collisionCheck: 'false',
  });
};
// draw to client's screen
const draw = () => {
  updatePos();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const keys = Object.keys(users);
  for (let i = 0; i < keys.length; i++) {
    const user = users[keys[i]];
    if (user.alpha < 1) {
      user.alpha += 0.05;
    } if (user.hash === hash) {
      ctx.fillStyle = color;
    } else {
      ctx.fillStyle = user.color;
    }

    user.x = lerp(user.prevX, user.destX, user.alpha);
    user.y = lerp(user.prevY, user.destY, user.alpha);
    ctx.fillRect(user.x, user.y, user.width, user.height);
    if (keys.length > 1) {
      for (let j = i + 1; j < keys.length; j++) {
        socket.emit('moveUpdate', { user1: users[keys[i]], user2: users[keys[j]], collisionCheck: 'true' });
      }
    }
    if (users[keys[i]].health > (75 * (2 / 3))) {
      ctx.fillStyle = 'lightgreen';
    } else if (users[keys[i]].health < (75 * (2 / 3)) && users[keys[i]].health > (75 * (1 / 3))) {
      ctx.fillStyle = 'yellow';
    } else if (users[keys[i]].health < (75 * (1 / 3))) {
      ctx.fillStyle = 'red';
    }
    ctx.fillRect(users[keys[i]].x, users[keys[i]].y + 80, users[keys[i]].health, 10);
    // socket.emit('moveUpdate', {user1: users[keys[i]],  )
  }
  requestAnimationFrame(draw);
};
// see if key pressed is up
const keyUp = (e) => {
  const xKey = e.which;
  const yKey = e.which;
  if (xKey === aKey || xKey === leftKey) {
    moveLeft = false;
  } if (xKey === dKey || xKey === rightKey) {
    moveRight = false;
  } if (yKey === sKey || yKey === downKey) {
    moveDown = false;
  } if (yKey === wKey || yKey === upKey) {
    moveUp = false;
  }
};
// see if key pressed is down
const keyDown = (e) => {
  const xKey = e.which;
  const yKey = e.which;
  if (xKey === aKey || xKey === leftKey) {
    moveLeft = true;
  } if (xKey === dKey || xKey === rightKey) {
    moveRight = true;
  } if (yKey === sKey || yKey === downKey) {
    moveDown = true;
  } if (yKey === wKey || yKey === upKey) {
    moveUp = true;
  } if (moveLeft || moveRight || moveUp || moveDown) {
    e.preventDefault();
  }
};
// apply knockback based on user's velocities; make user with less velocity take damage
const applyKnockBack = (data) => {
  const user = data.user.hash;
  const user2 = data.user2.hash;
  let health1 = data.user.health;
  let health2 = data.user2.health;
  if (hash === user) {
    data.user.prevX = data.user.x;
    data.user.prevY = data.user.y;
    data.user.destX += data.kB1X;
    data.user.destY += data.kB1Y;
    if (data.usraverageVelocity < data.usr2averageVelocity) {
      health1 -= data.usr2averageVelocity;
    } if (health1 <= 0) {
      health1 = 0;
      socket.emit('respawn', data.user);
    } else {
      socket.emit('moveUpdate', {
        user: data.user,
        currVelX: data.usrVelX,
        currVelY: data.usrVelY,
        currHealth: health1,
        collisionCheck: 'false',
      });
    }
  } else if (hash === user2) {
    data.user2.prevX = data.user2.x;
    data.user2.prevY = data.user2.y;
    data.user2.destX += data.kB2X;
    data.user2.destY += data.kB2Y;
    if (data.usraverageVelocity > data.usr2averageVelocity) {
      health2 -= data.usraverageVelocity;
    } if (health2 <= 0) {
      health2 = 0;
      socket.emit('respawn', data.user2);
    } else {
      socket.emit('moveUpdate', {
        user: data.user2,
        currVelX: data.usr2VelX,
        currVelY: data.usr2VelY,
        currHealth: health2,
        collisionCheck: 'false',
      });
    }
  }
};
// generate random number for color
const randomNum = r => Math.floor(Math.random() * r);
// respawn user if they die
const respawnUser = (data) => {
  hash = data.hash;
  users[hash] = data;
  users[hash].color = color;
  requestAnimationFrame(draw);
};

const init = () => {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext('2d');
  color = `rgb(${randomNum(255)}, ${randomNum(255)}, ${randomNum(255)}`;
  socket = io.connect();
  socket.on('joined', createUser);
  socket.on('updateMove', update);
  socket.on('collisionDetected', applyKnockBack);
  socket.on('respawned', respawnUser);
  socket.on('disconnect', removeUser);
  document.body.addEventListener('keyup', keyUp);
  document.body.addEventListener('keydown', keyDown);
};
window.onload = init;
