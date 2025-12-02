import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomsAPI, authAPI } from '../services/api';
import SettingsModal from '../components/SettingsModal';
import './MyRoomsPage.css';

export default function MyRoomsPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const fetchRooms = async () => {
    try {
      const response = await roomsAPI.getMyRooms();
      
      if (response.success) {
        setRooms(response.data);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        alert('Session Expired. Please login again');
        await authAPI.logout();
        navigate('/login');
      } else {
        alert('Failed to load rooms');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRooms();
  };

  const handleRoomPress = (room) => {
    navigate(`/lecturer/${room._id}`, {
      state: {
        roomId: room._id,
        roomCode: room.roomCode,
        roomName: room.roomName,
        roomStatus: room.status,
        questionsVisible: room.questionsVisible
      }
    });
  };

  const handleDeleteRoom = async (room) => {
    if (!confirm(`Are you sure you want to delete "${room.roomName}"? This will permanently delete all questions in this room.`)) {
      return;
    }

    try {
      const response = await roomsAPI.deleteRoom(room._id);
      if (response.success) {
        alert('Room deleted successfully');
        fetchRooms();
      } else {
        alert(response.message || 'Failed to delete room');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete room';
      alert(errorMessage);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await authAPI.logout();
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="my-rooms-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-rooms-page">
      <div className="my-rooms-container">
        {/* Header */}
        <div className="header">
          <div className="header-top">
            <div>
              <h1 className="title">My Rooms</h1>
              <p className="subtitle">View and manage your Q&A sessions</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button className="settings-icon-myrooms" onClick={() => setShowSettings(true)}>
                ⚙️
              </button>
              <button className="logout-button" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>

        {/* Room List or Empty State */}
        {rooms.length === 0 ? (
          <div className="empty-state">
            <span className="empty-emoji">📚</span>
            <h2 className="empty-title">No rooms yet</h2>
            <p className="empty-description">
              Create your first room to get started
            </p>
            <button 
              className="create-button"
              onClick={() => navigate('/create-room')}
            >
              + Create New Room
            </button>
          </div>
        ) : (
          <>
            <div className="rooms-grid">
              {rooms.map((room) => (
                <div key={room._id} className="room-card">
                  <div 
                    className="room-card-content"
                    onClick={() => handleRoomPress(room)}
                  >
                    <div className="room-header">
                      <div className="room-title-container">
                        <h3 className="room-name">{room.roomName}</h3>
                      </div>
                      <div className="room-code-row">
                        <span className="room-code">{room.roomCode}</span>
                        <span className={`status-badge ${room.status === 'active' ? 'active' : 'closed'}`}>
                          {room.status === 'active' ? '🟢 Active' : '🔴 Closed'}
                        </span>
                      </div>
                    </div>

                    <div className="room-stats">
                      <div className="stat-item">
                        <span className="stat-icon">💬</span>
                        <span className="stat-value">{room.questionCount}</span>
                        <span className="stat-label">Questions</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">👥</span>
                        <span className="stat-value">{room.studentsCount}</span>
                        <span className="stat-label">Enrollments</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">📅</span>
                        <span className="stat-value">
                          {new Date(room.createdAt).toLocaleDateString()}
                        </span>
                        <span className="stat-label">Created</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRoom(room);
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>

            {/* Floating Action Button */}
            <button 
              className="fab"
              onClick={() => navigate('/create-room')}
            >+</button>
          </>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        userType="lecturer"
      />
    </div>
  );
}
