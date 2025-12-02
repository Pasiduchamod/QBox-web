import axios from 'axios';
import io from 'socket.io-client';

// API Configuration
const API_URL = 'https://qbox-backend.onrender.com/api';
const SOCKET_URL = 'https://qbox-backend.onrender.com';

// For Local Development (uncomment when testing locally):
// const API_URL = 'http://localhost:3000/api';
// const SOCKET_URL = 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 90000, // 90 seconds to handle Render free tier cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Socket.io instance
let socket = null;

export const initSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 10000,
      forceNew: false,
    });
    
    socket.on('connect', () => {
      console.log('Socket connected successfully');
    });
    
    socket.on('connect_error', (error) => {
      console.log('Socket connection error:', error.message);
    });
    
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });
  }
  return socket;
};

export const getSocket = () => socket;

// Auth API
export const authAPI = {
  // Google Sign-In
  googleAuth: async (userInfo) => {
    const response = await api.post('/auth/google-web', { 
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      sub: userInfo.sub
    });
    if (response.data.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  sendVerificationCode: async (email) => {
    const response = await api.post('/auth/send-verification', { email });
    return response.data;
  },

  verifyCode: async (email, code) => {
    const response = await api.post('/auth/verify-code', { email, code });
    return response.data;
  },

  signup: async (name, email, password) => {
    const response = await api.post('/auth/signup', { name, email, password });
    if (response.data.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (email, code, newPassword) => {
    const response = await api.post('/auth/reset-password', { email, code, newPassword });
    if (response.data.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('studentTag');
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getCurrentUser: async () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// Room API
export const roomsAPI = {
  createRoom: async (roomName, questionsVisible = true) => {
    const response = await api.post('/rooms', { roomName, questionsVisible });
    return response.data;
  },

  createOneTimeRoom: async (lecturerName, questionsVisible = true) => {
    const response = await api.post('/rooms/one-time', { lecturerName, questionsVisible });
    return response.data;
  },

  getMyRooms: async () => {
    const response = await api.get('/rooms');
    return response.data;
  },

  getRoom: async (roomId) => {
    const response = await api.get(`/rooms/${roomId}`);
    return response.data;
  },

  joinRoom: async (roomCode) => {
    const response = await api.post('/rooms/join', { roomCode });
    if (response.data.success) {
      // Generate student tag if not exists
      let studentTag = localStorage.getItem('studentTag');
      if (!studentTag) {
        const timestamp = Date.now().toString().slice(-4);
        studentTag = `Student ${timestamp}`;
        localStorage.setItem('studentTag', studentTag);
      }
      
      // Join socket room (non-blocking)
      try {
        const socket = getSocket() || initSocket();
        socket.emit('join-room', roomCode);
      } catch (socketError) {
        console.log('Socket connection warning:', socketError.message);
        // Continue anyway - socket is optional for viewing
      }
    }
    return response.data;
  },

  toggleVisibility: async (roomId) => {
    const response = await api.put(`/rooms/${roomId}/toggle-visibility`);
    if (response.data.success) {
      const socket = getSocket();
      if (socket) {
        const room = response.data.data;
        socket.emit('visibility-toggled', {
          roomCode: room.roomCode,
          questionsVisible: room.questionsVisible,
        });
      }
    }
    return response.data;
  },

  closeRoom: async (roomId, roomCode) => {
    const response = await api.put(`/rooms/${roomId}/close`);
    if (response.data.success) {
      const socket = getSocket();
      if (socket) {
        socket.emit('room-closed', { roomCode });
      }
    }
    return response.data;
  },

  deleteRoom: async (roomId) => {
    const response = await api.delete(`/rooms/${roomId}`);
    return response.data;
  },
};

// Question API
export const questionAPI = {
  getQuestions: async (roomId, studentTag = null, includeRejected = false) => {
    const params = studentTag ? { studentTag } : {};
    if (includeRejected) {
      params.includeRejected = 'true';
    }
    const response = await api.get(`/questions/room/${roomId}`, { params });
    return response.data;
  },

  askQuestion: async (questionText, roomId, roomCode) => {
    let studentTag = localStorage.getItem('studentTag');
    if (!studentTag) {
      const timestamp = Date.now().toString().slice(-4);
      studentTag = `Student ${timestamp}`;
      localStorage.setItem('studentTag', studentTag);
    }

    const response = await api.post('/questions', {
      questionText,
      roomId,
      studentTag,
    });

    return response.data;
  },

  upvoteQuestion: async (questionId, roomCode) => {
    const studentTag = localStorage.getItem('studentTag');
    const response = await api.put(`/questions/${questionId}/upvote`, { studentTag });
    return response.data;
  },

  reportQuestion: async (questionId) => {
    const studentTag = localStorage.getItem('studentTag');
    const response = await api.put(`/questions/${questionId}/report`, { studentTag });
    return response.data;
  },

  answerQuestion: async (questionId, roomCode) => {
    const response = await api.put(`/questions/${questionId}/answer`);
    
    if (response.data.success) {
      const socket = getSocket();
      if (socket) {
        socket.emit('question-answered', { roomCode, questionId });
      }
    }

    return response.data;
  },

  deleteQuestion: async (questionId, roomCode) => {
    const response = await api.delete(`/questions/${questionId}`);
    
    if (response.data.success) {
      const socket = getSocket();
      if (socket) {
        socket.emit('question-deleted', { roomCode, questionId });
      }
    }

    return response.data;
  },

  upvoteQuestion: async (questionId) => {
    const response = await api.put(`/questions/${questionId}/upvote`);
    return response.data;
  },

  reportQuestion: async (questionId, studentTag, reason) => {
    const response = await api.put(`/questions/${questionId}/report`, { 
      studentTag,
      reason 
    });
    return response.data;
  },

  permanentDeleteQuestion: async (questionId) => {
    const response = await api.delete(`/questions/${questionId}/permanent`);
    return response.data;
  },
};

// User API
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (name, email) => {
    const response = await api.put('/users/profile', { name, email });
    if (response.data.success) {
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/users/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

export default api;
