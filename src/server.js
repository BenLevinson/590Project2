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
    x: randX,
    y: randY,
    prevX: randX,
    prevY: randY,
    destX: randX,
    destY: randY,
    alpha: 0,
    width: 75,
    height: 75,
  };
  socket.emit('joined', socket.avatar);

  socket.on('moveUpdate', (data) => {
    let moveVal = 0;
    socket.avatar = data.user;
    socket.dir = data.dir;
    socket.avatar.lastUpdate = new Date().getTime();
    if ((socket.dir === 'left' && socket.avatar.destX > 0) || (socket.dir === 'right' && socket.avatar.destX < 925)) {
      moveVal = 2;
    }
    if ((socket.dir === 'up' && socket.avatar.destY > 0) || (socket.dir === 'down' && socket.avatar.destY < 725)) {
      moveVal = 2;
    }
    io.in('room1').emit('updateMove', { user: socket.avatar, dir: socket.dir, val: moveVal });
  });

  socket.on('collisionCheck', (data) => {
    if (data.user1.x < data.user2.x + data.user2.width
        && data.user1.x + data.user1.width > data.user2.x
        && data.user1.y < data.user2.y + data.user2.height
        && data.user1.height + data.user1.y > data.user2.y) {
      // collision detection
      io.in('room1').emit('collisionDetected', { user1: data.user1, user2: data.user2 });
    } else {
      io.in('room1').emit('noCollision', { user1: data.user1, user2: data.user2 });
    }
  });

  socket.on('disconnect', () => {
    io.sockets.in('room1').emit('disconnect', socket.avatar.hash);
    socket.leave('room1');
  });
});
