import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { authAPI, roomsAPI } from '../services/api';
import logoImg from '../assets/QBox logo png.png';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [oneTimeLoading, setOneTimeLoading] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [questionsVisible, setQuestionsVisible] = useState(true);
  const [error, setError] = useState('');

  // Google Sign-In
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setGoogleLoading(true);
        setError('');
        
        // Fetch user info with access token
        const userInfoResponse = await fetch(
          `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenResponse.access_token}`
        );
        const userInfo = await userInfoResponse.json();
        
        if (!userInfo.email) {
          throw new Error('Failed to get user information');
        }
        
        // Send to backend
        const response = await authAPI.googleAuth(userInfo);
        
        if (response.success) {
          navigate('/my-rooms');
        } else {
          setError(response.message || 'Google Sign-In failed');
        }
      } catch (error) {
        console.error('Google Sign-In Error:', error);
        setError('Failed to sign in with Google. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setError('Google Sign-In failed. Please try again.');
    },
  });

  // Create One-Time Room
  const handleCreateOneTimeRoom = async () => {
    if (!userName.trim()) {
      alert('Please enter your name to create a room');
      return;
    }

    try {
      setOneTimeLoading(true);
      setError('');

      const response = await roomsAPI.createOneTimeRoom(userName.trim(), questionsVisible);

      if (response.success) {
        setShowNameModal(false);
        setUserName('');
        
        // Store one-time room flag and generate student tag
        localStorage.setItem('isOneTimeUser', 'true');
        let studentTag = localStorage.getItem('studentTag');
        if (!studentTag) {
          const timestamp = Date.now().toString().slice(-4);
          studentTag = `Lecturer ${timestamp}`;
          localStorage.setItem('studentTag', studentTag);
        }
        
        // Navigate to Lecturer Panel (one-time rooms act as lecturers)
        navigate(`/lecturer/${response.data.room._id}`, {
          state: {
            roomId: response.data.room._id,
            roomCode: response.data.room.code,
            roomName: response.data.room.roomName,
            roomStatus: 'active',
            questionsVisible: response.data.room.questionsVisible,
            isOneTime: true
          }
        });
      } else {
        setError(response.message || 'Failed to create room');
      }
    } catch (error) {
      console.error('One-Time Room Error:', error);
      setError('Failed to create room. Please try again.');
    } finally {
      setOneTimeLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Header with Logo */}
        <div className="header">
          <img src={logoImg} alt="QBox Logo" className="logo-img" />
          <h1 className="title">Welcome to QBox</h1>
          <p className="subtitle">Choose how you want to continue</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-container">
            <p className="error-text">{error}</p>
          </div>
        )}

        {/* Button Section */}
        <div className="button-section">
          {/* Google Sign-In Button */}
          <button 
            className="google-button"
            onClick={() => googleLogin()}
            disabled={googleLoading}
          >
            <svg className="google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{googleLoading ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>

          {/* Divider */}
          <div className="divider">
            <div className="divider-line"></div>
            <span className="divider-text">OR</span>
            <div className="divider-line"></div>
          </div>

          {/* One-Time Room Button */}
          <button 
            className="one-time-button"
            onClick={() => setShowNameModal(true)}
            disabled={oneTimeLoading}
          >
            <span className="one-time-button-text">Create One-Time Room</span>
            <span className="one-time-button-subtext">No account needed • Expires in 1 hour</span>
          </button>
        </div>

        {/* Back Button */}
        <button 
          className="back-button"
          onClick={() => navigate('/')}
        >
          Back
        </button>
      </div>

      {/* Name Modal for One-Time Room */}
      {showNameModal && (
        <div className="modal-overlay" onClick={() => setShowNameModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Enter Your Name</h2>
            <p className="modal-subtitle">This will be displayed in your room</p>
            
            <input
              type="text"
              className="name-input"
              placeholder="Your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateOneTimeRoom()}
              maxLength={50}
              autoFocus
            />

            {/* Room Type Selection */}
            <div className="room-type-container">
              <p className="room-type-label">Room Type:</p>
              <div className="room-type-buttons">
                <button
                  className={`room-type-button ${questionsVisible ? 'active' : ''}`}
                  onClick={() => setQuestionsVisible(true)}
                >
                  <span className="room-type-button-text">👁️ Public</span>
                  <span className="room-type-button-desc">Everyone sees all questions</span>
                </button>
                
                <button
                  className={`room-type-button ${!questionsVisible ? 'active' : ''}`}
                  onClick={() => setQuestionsVisible(false)}
                >
                  <span className="room-type-button-text">🔒 Private</span>
                  <span className="room-type-button-desc">Students see only their own</span>
                </button>
              </div>
            </div>

            <div className="modal-buttons">
              <button 
                className="modal-button-cancel"
                onClick={() => {
                  setShowNameModal(false);
                  setUserName('');
                  setQuestionsVisible(true);
                }}
              >
                Cancel
              </button>
              <button 
                className={`modal-button-create ${oneTimeLoading ? 'disabled' : ''}`}
                onClick={handleCreateOneTimeRoom}
                disabled={oneTimeLoading}
              >
                {oneTimeLoading ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
