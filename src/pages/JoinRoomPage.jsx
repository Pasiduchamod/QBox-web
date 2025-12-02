import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomsAPI } from '../services/api';
import './JoinRoomPage.css';

export default function JoinRoomPage() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoinRoom = async () => {
    if (roomCode.length !== 6) {
      setError('Please enter a valid 6-character room code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await roomsAPI.joinRoom(roomCode.trim().toUpperCase());

      if (response.success) {
        const roomData = response.data;
        // Navigate to room with correct field names from backend
        navigate(`/room/${roomData.roomId}`, {
          state: {
            roomId: roomData.roomId,
            roomCode: roomData.roomCode,
            roomName: roomData.roomName,
            lecturerName: roomData.lecturerName,
            questionsVisible: roomData.questionsVisible,
            status: roomData.status
          }
        });
      } else {
        setError(response.message || 'Failed to join room');
      }
    } catch (error) {
      let errorMessage = 'Unable to join room';
      
      if (error.response) {
        errorMessage = error.response.data?.message || 'Invalid room code or room is closed';
      } else if (error.request) {
        errorMessage = 'Cannot reach server. Check your connection.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomCodeChange = (value) => {
    setRoomCode(value.toUpperCase());
    setError('');
  };

  return (
    <div className="join-room-page">
      <div className="join-room-content">
        {/* Header */}
        <div className="header">
          <h1 className="title">Join Room</h1>
          <p className="description">
            Enter the 6-character room code shared by your instructor
          </p>
        </div>

        {/* Room Code Input */}
        <div className="input-section">
          <input
            type="text"
            className="room-code-input"
            placeholder="ENTER CODE"
            value={roomCode}
            onChange={(e) => handleRoomCodeChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
            maxLength={6}
            autoCapitalize="characters"
          />
          
          {error && <p className="error-text">{error}</p>}

          <p className="hint">
            Room codes are case-insensitive and contain letters and numbers
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="button-container">
        <button
          className="primary-button"
          onClick={handleJoinRoom}
          disabled={roomCode.length === 0 || loading}
        >
          {loading ? 'Joining...' : 'Join Room'}
        </button>
        
        <button
          className="ghost-button"
          onClick={() => navigate('/')}
        >
          Back
        </button>
      </div>
    </div>
  );
}
