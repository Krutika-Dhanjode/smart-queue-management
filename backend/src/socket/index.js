const { Server } = require('socket.io');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: function(origin, callback) {
        callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join:queue', (queueId) => {
      socket.join(`queue:${queueId}`);
      console.log(`Socket ${socket.id} joined queue:${queueId}`);
    });

    socket.on('leave:queue', (queueId) => {
      socket.leave(`queue:${queueId}`);
      console.log(`Socket ${socket.id} left queue:${queueId}`);
    });

    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

module.exports = { initializeSocket };
