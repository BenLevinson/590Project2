const http = require('http');
const socketio = require('socket.io');
const xxh = require('xxhashjs');
const fs = require('fs');

const PORT = process.env.PORT || process.env.NODE_PORT || 3000;

const handler = (req, res) => {
  fs.readFile(`${__dirname}/../client/index.html`, (err, data) => {
    if (err) {
      throw err;
    }
    res.writeHead(200);
    res.end(data);
  });
};

const app = http.createServer(handler);

const io = socketio(app);

app.listen(PORT);

io.on('connection', (sock) => {
  const socket = sock;
  const randX = Math.floor((Math.random() * 925)) + 1;
  const randY = Math.floor((Math.random() * 725)) + 1;
  socket.join('room1');
  socket.avatar = {
    hash: xxh.h32(`${socket.id}${new Date().getTime()}`, 0xCAFEBABE).toString(16),
    lastUpdate: new Date().getTime(),
    color: '',
    x: randX,
    y: randY,
    prevX: randX,
    prevY: randY,
    destX: randX,
    destY: randY,
    alpha: 0,
    width: 75,
    height: 75,
    drag: 0.1,
    maxVelocity: 10,
    currVelocityX: 0,
    currVelocityY: 0,
    health: 75,
  };
  socket.emit('joined', socket.avatar);

  socket.on('moveUpdate', (data) => {
    if (data.collisionCheck === 'true') {
      let user1X = data.user1.x;
      let user1Y = data.user1.y;
      let user2X = data.user2.x;
      let user2Y = data.user2.y;
      // collision detection between two players (AABB)
      if (data.user1.x < data.user2.x + data.user2.width
      && data.user1.x + data.user1.width > data.user2.x
      && data.user1.y < data.user2.y + data.user2.height
      && data.user1.height + data.user1.y > data.user2.y
      && data.user1.health > 0 && data.user2.health > 0) {
        // case one, user1's x is greater than user2's x
        if (user1X > user2X) {
          if (user1Y > user2Y) { // if user1's y is greater than user2's y
            user1Y = (data.user2.currVelocityY * 5) + 25;
            user2Y = (-data.user1.currVelocityY * 5) - 25;
            user1X = (data.user2.currVelocityX * 5) + 25;
            user2X = (-data.user1.currVelocityX * 5) - 25;
          } else if (user1Y < user2Y) { // if user1's y is less than user2's y
            user1Y = (-data.user2.currVelocityY * 5 * 5) - 25;
            user2Y = (data.user1.currVelocityY * 5) + 25;
            user1X = (data.user2.currVelocityX * 5) + 25;
            user2X = (-data.user1.currVelocityX * 5) - 25;
          } else { // if user1's y is equal to user2's y
            user1X = (data.user2.currVelocityX * 5) + 25;
            user2X = (-data.user1.currVelocityX * 5) - 25;
          }
        // case two, user1's x is less than user2's x
        } else if (user1X < user2X) {
          if (user1Y > user2Y) { // if user1's y is greater than user2's y
            user1Y = (data.user2.currVelocityY * 5) + 25;
            user2Y = (-data.user1.currVelocityY * 5) - 25;
            user1X = (-data.user2.currVelocityX * 5) - 25;
            user2X = (data.user1.currVelocityX * 5) + 25;
          } else if (user1Y < user2Y) { // if user1's y is less than user2's y
            user1Y = (-data.user2.currVelocityY * 5) - 25;
            user2Y = (data.user1.currVelocityY * 5) + 25;
            user1X = (-data.user2.currVelocityX * 5) - 25;
            user2X = (data.user1.currVelocityX * 5) + 25;
          } else { // if user1's y is equal to user2's y
            user1X = (-data.user2.currVelocityX * 5) - 25;
            user2X = (data.user1.currVelocityX * 5) + 25;
          }
        // case three, user1's x is equal to user2's x
        } else {
          if (user1Y > user2Y) { // if user1's y is greater than user2's y
            user1Y = (data.user2.currVelocityY * 5) + 25;
            user2Y = (-data.user1.currVelocityY * 5) - 25;
          } if (user1Y < user2Y) { // if user1's y is less than user2's y
            user1Y = (-data.user2.currVelocityY * 5) - 25;
            user2Y = (data.user1.currVelocityY * 5) + 25;
          }
        }
        // emit collision detection to client so it can apply knockback force
        io.in('room1').emit('collisionDetected', {
          user: data.user1,
          user2: data.user2,
          kB1X: user1X,
          kB1Y: user1Y,
          kB2X: user2X,
          kB2Y: user2Y,
          usrVelX: data.user1.currVelocityX,
          usrVelY: data.user1.currVelocityY,
          usr2VelX: data.user2.currVelocityX,
          usr2VelY: data.user2.currVelocityY,
          usr2averageVelocity: (data.user2.currVelocityX + data.user2.currVelocityY) / 2,
          usraverageVelocity: (data.user1.currVelocityX + data.user1.currVelocityY) / 2,
        });
      }
    // if there is no collision with movements of clients, continue as normal
    } else if (data.collisionCheck === 'false') {
      const acceleration = 0.08;
      let boundaryCollision = false;
      let moveValX = data.currVelX;
      let moveValY = data.currVelY;
      socket.avatar = data.user;
      socket.xDir = data.xDir;
      socket.yDir = data.yDir;
      socket.avatar.lastUpdate = new Date().getTime();
      if (socket.avatar.x < 0) {
        socket.avatar.destX = 5;
      } else if (socket.avatar.x > 925) {
        socket.avatar.destX = 920;
      } else if (socket.avatar.y < 0) {
        socket.avatar.destY = 5;
      } else if (socket.avatar.y > 725) {
        socket.avatar.destY = 720;
      }
      // if client is out of bounds, switch there direction and make them bounce off wall
      if (socket.xDir === 'left' && socket.avatar.x <= 0) {
        boundaryCollision = true;
        socket.xDir = 'right';
      } else if (socket.xDir === 'right' && socket.avatar.x >= 925) {
        boundaryCollision = true;
        socket.xDir = 'left';
      }
      if (socket.yDir === 'up' && socket.avatar.y <= 0) {
        boundaryCollision = true;
        socket.yDir = 'down';
      } else if (socket.yDir === 'down' && socket.avatar.y >= 725) {
        boundaryCollision = true;
        socket.yDir = 'up';
      }
      if (socket.xDir === 'none' && moveValX > 0) {
        moveValX = 0;
      } if (socket.yDir === 'none' && moveValY > 0) {
        moveValY = 0;
      }
      // if the client is moving and not at max velocity, increase velocity by acceleration
      if (moveValX < socket.avatar.maxVelocity && socket.xDir !== 'none') {
        moveValX += acceleration;
      } if (moveValY < socket.avatar.maxVelocity && socket.yDir !== 'none') {
        moveValY += acceleration;
      }
      // cap client at max velocity
      if (moveValX > socket.avatar.maxVelocity || moveValY > socket.avatar.maxVelocity) {
        if (moveValX > socket.avatar.maxVelocity) {
          moveValX = socket.avatar.maxVelocity;
        } if (moveValY > socket.avatar.maxVelocity) {
          moveValY = socket.avatar.maxVelocity;
        }
      }
      // apply new velocity to user in there x and y directions
      socket.avatar.currVelocityX = moveValX;
      socket.avatar.currVelocityY = moveValY;
      // if user collides with wall, make them bounce off it by sending different data to client
      if (boundaryCollision === true) {
        io.in('room1').emit('updateMove', {
          user: socket.avatar,
          xDir: socket.xDir,
          yDir: socket.yDir,
          currVelocityX: socket.avatar.currVelocityX,
          currVelocityY: socket.avatar.currVelocityY,
          currHealth: data.currHealth,
          wallCollision: 'true',
        });
      // continue as normal if no wall collision
      } else {
        io.in('room1').emit('updateMove', {
          user: socket.avatar,
          xDir: socket.xDir,
          yDir: socket.yDir,
          currVelocityX: socket.avatar.currVelocityX,
          currVelocityY: socket.avatar.currVelocityY,
          currHealth: data.currHealth,
          wallCollision: 'false',
        });
      }
    }
  });
  // if user hits 0 health, respawn them with same hash, but with full health/different coordinates
  socket.on('respawn', (data) => {
    const newRandX = Math.floor((Math.random() * 925)) + 1;
    const newRandY = Math.floor((Math.random() * 925)) + 1;
    socket.avatar = {
      hash: data.hash,
      lastUpdate: data.lastUpdate,
      color: '',
      x: newRandX,
      y: newRandY,
      prevX: newRandX,
      prevY: newRandY,
      destX: newRandX,
      destY: newRandY,
      alpha: 0,
      width: 75,
      height: 75,
      drag: 0.1,
      maxVelocity: 10,
      currVelocityX: 0,
      currVelocityY: 0,
      health: 75,
    };
    socket.emit('respawned', socket.avatar);
  });
  socket.on('disconnect', () => {
    io.sockets.in('room1').emit('disconnect', socket.avatar.hash);
    socket.leave('room1');
  });
});
