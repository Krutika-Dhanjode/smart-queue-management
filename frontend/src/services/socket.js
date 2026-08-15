import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const connectSocket = (userId) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    if (userId) {
      socket.emit('join:user', userId);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinQueueRoom = (queueId) => {
  if (socket) {
    socket.emit('join:queue', queueId);
  }
};

export const leaveQueueRoom = (queueId) => {
  if (socket) {
    socket.emit('leave:queue', queueId);
  }
};

const onEvent = (event, callback) => {
  if (socket) {
    socket.off(event);
    socket.on(event, callback);
  }
};

export const onTokenGenerated = (callback) => onEvent('token:generated', callback);
export const onTokenCalled = (callback) => onEvent('token:called', callback);
export const onTokenSkipped = (callback) => onEvent('token:skipped', callback);
export const onTokenCompleted = (callback) => onEvent('token:completed', callback);
export const onTokenRemoved = (callback) => onEvent('token:removed', callback);
export const onQueueStatusChanged = (callback) => onEvent('queue:statusChanged', callback);
export const onBreakStarted = (callback) => onEvent('queue:breakStarted', callback);
export const onBreakEnded = (callback) => onEvent('queue:breakEnded', callback);
export const onQueueClosed = (callback) => onEvent('queue:closed', callback);

export const getSocket = () => socket;
