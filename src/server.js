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
  socket.join('room1');
  socket.avatar = {
    hash: xxh.h32(`${socket.id}${new Date().getTime()}`, 0xCAFEBABE).toString(16),
    lastUpdate: new Date().getTime(),
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    destX: 0,
    destY: 0,
    alpha: 0,
    width: 75,
    height: 75,
    canJump: false,
  };
  socket.emit('joined', socket.avatar);

  socket.on('gravityUpdate', (data) => {
    socket.avatar = data;
    if (data.destY < 525) {
      const gravity = data.destY + 5;
      socket.avatar.destY = gravity;
      io.to(socket.id).emit('updateGravity', socket.avatar);
    }
  });

  socket.on('moveUpdate', (data) => {
    socket.avatar = data;
    socket.avatar.lastUpdate = new Date().getTime();
    socket.broadcast.to('room1').emit('updateMove', socket.avatar);
  });

  socket.on('disconnect', () => {
    io.sockets.in('room1').emit('disconnect', socket.avatar.hash);
    socket.leave('room1');
  });
});
