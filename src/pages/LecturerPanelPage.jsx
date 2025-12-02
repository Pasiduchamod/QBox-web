import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { questionAPI, roomsAPI, getSocket, initSocket } from '../services/api';
import SettingsModal from '../components/SettingsModal';
import './LecturerPanelPage.css';

export default function LecturerPanelPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [roomData, setRoomData] = useState(null);
  const [isRoomClosed, setIsRoomClosed] = useState(false);
  const [questionsVisible, setQuestionsVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchQuestions();
    setRefreshing(false);
  };

  useEffect(() => {
    if (!roomId) {
      navigate('/my-rooms');
      return;
    }

    fetchRoomData();
    fetchQuestions();
    setupSocket();
  }, [roomId]);

  const fetchRoomData = async () => {
    try {
      const response = await roomsAPI.getRoom(roomId);
      if (response.success) {
        setRoomData(response.data);
        setIsRoomClosed(response.data.status === 'closed');
        setQuestionsVisible(response.data.questionsVisible);
      }
    } catch (error) {
      console.error('Error fetching room:', error);
      alert('Unable to load room data');
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await questionAPI.getQuestions(roomId, null, true);
      
      if (response.success) {
        const transformedQuestions = response.data.map(q => ({
          id: q._id,
          _id: q._id,
          question: q.questionText,
          upvotes: q.upvotes,
          status: q.status,
          studentTag: q.studentTag,
          isReported: q.isReported,
          answer: q.answer,
          timestamp: new Date(q.createdAt).toLocaleString()
        }));
        setQuestions(transformedQuestions);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      alert('Unable to load questions');
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = () => {
    const socket = getSocket() || initSocket();
    if (!roomData?.roomCode) return;

    // Join room immediately
    socket.emit('join-room', roomData.roomCode);
    console.log('Joined room via socket:', roomData.roomCode);

    // Rejoin room on reconnection
    socket.on('connect', () => {
      console.log('Socket connected, rejoining room:', roomData.roomCode);
      socket.emit('join-room', roomData.roomCode);
    });

    socket.on('new-question', (question) => {
      const newQuestion = {
        id: question._id,
        _id: question._id,
        question: question.questionText,
        upvotes: question.upvotes || 0,
        status: question.status || 'pending',
        studentTag: question.studentTag,
        isReported: question.isReported || false,
        answer: question.answer || null,
        timestamp: new Date(question.createdAt).toLocaleString()
      };
      setQuestions(prev => {
        const exists = prev.some(q => q._id === question._id);
        if (exists) return prev;
        return [newQuestion, ...prev];
      });
    });

    socket.on('question-upvote-update', ({ questionId, upvotes }) => {
      setQuestions(prev => prev.map(q => 
        q._id === questionId ? { ...q, upvotes } : q
      ));
    });

    socket.on('question-marked-answered', ({ questionId }) => {
      setQuestions(prev => prev.map(q => 
        q._id === questionId ? { ...q, status: 'answered' } : q
      ));
    });

    socket.on('question-removed', ({ questionId }) => {
      setQuestions(prev => prev.map(q => 
        q._id === questionId ? { ...q, status: 'rejected' } : q
      ));
    });

    socket.on('question-restored', ({ questionId }) => {
      setQuestions(prev => prev.map(q => 
        q._id === questionId ? { ...q, status: 'pending' } : q
      ));
    });

    socket.on('question-permanently-deleted', ({ questionId }) => {
      setQuestions(prev => prev.filter(q => q._id !== questionId));
    });

    return () => {
      socket.off('new-question');
      socket.off('question-upvote-update');
      socket.off('question-marked-answered');
      socket.off('question-removed');
      socket.off('question-restored');
      socket.off('question-permanently-deleted');
    };
  };

  const handleAnswer = async (questionId) => {
    if (!window.confirm('Mark this question as answered?')) return;

    try {
      const response = await questionAPI.answerQuestion(questionId, roomData?.roomCode);
      if (response.success) {
        await fetchQuestions();
        alert('✅ Question marked as answered');
      } else {
        alert('Failed to mark as answered');
      }
    } catch (error) {
      console.error('Error marking answered:', error);
      alert('Unable to mark as answered');
    }
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm('Delete this question? It will be moved to Deleted section.')) return;

    try {
      const response = await questionAPI.deleteQuestion(questionId);
      if (response.success) {
        setQuestions(prev => prev.map(q => 
          q._id === questionId ? { ...q, status: 'rejected' } : q
        ));
        alert('🗑️ Question deleted');
      } else {
        alert('Failed to delete question');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Unable to delete question');
    }
  };

  const handleRestore = async (questionId) => {
    if (!window.confirm('Restore this question to Pending?')) return;

    try {
      const response = await questionAPI.restoreQuestion(questionId);
      if (response.success) {
        setQuestions(prev => prev.map(q => 
          q._id === questionId ? { ...q, status: 'pending' } : q
        ));
        alert('♻️ Question restored');
      } else {
        alert('Failed to restore question');
      }
    } catch (error) {
      console.error('Error restoring:', error);
      alert('Unable to restore question');
    }
  };

  const handlePermanentDelete = async (questionId) => {
    if (!window.confirm('⚠️ Permanently delete this question? This cannot be undone!')) return;

    try {
      const response = await questionAPI.permanentDeleteQuestion(questionId);
      if (response.success) {
        setQuestions(prev => prev.filter(q => q._id !== questionId));
        alert('🗑️ Question permanently deleted');
      } else {
        alert('Failed to delete permanently');
      }
    } catch (error) {
      console.error('Error permanent delete:', error);
      alert('Unable to delete permanently');
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomData?.roomCode || '');
      alert(`✅ Room code ${roomData?.roomCode} copied!`);
    } catch (error) {
      alert('Failed to copy code');
    }
  };

  const handleShare = async () => {
    const message = `Join my Q&A session!\n\nRoom: ${roomData?.roomName}\nCode: ${roomData?.roomCode}\n\nOpen QBox app and enter the code.`;
    
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(message);
      alert('Invitation copied to clipboard!');
    }
  };

  const handleToggleVisibility = async () => {
    try {
      const response = await roomsAPI.toggleVisibility(roomId);
      if (response.success) {
        setQuestionsVisible(response.data.questionsVisible);
        alert(response.data.questionsVisible 
          ? '✅ Questions now visible to all students'
          : '🔒 Questions now private (students see only their own)'
        );
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Unable to update visibility');
    }
  };

  const handleCloseRoom = async () => {
    if (!window.confirm('⚠️ Close this room? Students will no longer be able to ask questions. This cannot be undone!')) return;

    try {
      const response = await roomsAPI.closeRoom(roomId, roomData?.roomCode);
      if (response.success) {
        setIsRoomClosed(true);
        alert('🔒 Room closed successfully');
      }
    } catch (error) {
      console.error('Error closing room:', error);
      alert('Unable to close room');
    }
  };

  const getFilteredQuestions = () => {
    if (filter === 'all') return questions.filter(q => q.status !== 'rejected');
    return questions.filter(q => q.status === filter);
  };

  const filters = [
    { id: 'all', label: 'All', count: questions.filter(q => q.status !== 'rejected').length },
    { id: 'pending', label: 'Pending', count: questions.filter(q => q.status === 'pending').length },
    { id: 'answered', label: 'Answered', count: questions.filter(q => q.status === 'answered').length },
    { id: 'rejected', label: 'Deleted', count: questions.filter(q => q.status === 'rejected').length },
  ];

  if (loading) {
    return (
      <div className="lecturer-panel-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lecturer-panel-page">
      {/* Header */}
      <div className="top-header">
        <button className="back-icon" onClick={() => navigate('/my-rooms')}>←</button>
        <h1 className="page-title">Lecturer Panel</h1>
        <button className="settings-icon" onClick={() => setShowSettings(true)} title="Settings">⚙️</button>
      </div>

      <div className="panel-container">
        {/* Room Info Card */}
        <div className="room-info-card-lecturer">
          <h2 className="room-name-lecturer">{roomData?.roomName || 'My Room'}</h2>
          
          <div className="room-code-row">
            <div className="code-display">
              <span className="code-label">Room Code:</span>
              <span className="code-value">{roomData?.roomCode || 'ABC123'}</span>
            </div>
            <div className="action-icons">
              <button className="icon-btn" onClick={handleCopyCode} title="Copy code">📋</button>
              <button className="icon-btn" onClick={handleShare} title="Share">↗️</button>
            </div>
          </div>

          {/* Visibility Toggle */}
          <div className="visibility-row">
            <span className="visibility-label">Question Visibility:</span>
            <button
              className={`visibility-toggle ${questionsVisible ? 'public' : 'private'}`}
              onClick={handleToggleVisibility}
              disabled={isRoomClosed}
            >
              {questionsVisible ? 'Public' : 'Private'}
            </button>
          </div>

          {/* Close Room Button */}
          {!isRoomClosed && (
            <button className="close-room-btn" onClick={handleCloseRoom}>
              🔒 Close Room
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-number">{questions.filter(q => q.status === 'pending').length}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{questions.filter(q => q.status === 'answered').length}</div>
            <div className="stat-label">Answered</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{questions.filter(q => q.status === 'rejected').length}</div>
            <div className="stat-label">Deleted</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-container-lecturer">
          <div className="filter-row-lecturer">
            {filters.slice(0, 2).map(f => (
              <button
                key={f.id}
                className={`filter-tab-lecturer ${filter === f.id ? 'active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                <span className="filter-text-lecturer">{f.label} ({f.count})</span>
              </button>
            ))}
          </div>
          <div className="filter-row-lecturer">
            {filters.slice(2).map(f => (
              <button
                key={f.id}
                className={`filter-tab-lecturer ${filter === f.id ? 'active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                <span className="filter-text-lecturer">{f.label} ({f.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="refresh-section">
          <button className="refresh-button" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? '⟳ Refreshing...' : '🔄 Refresh Questions'}
          </button>
        </div>

        {/* Questions List */}
        {getFilteredQuestions().length === 0 ? (
          <div className="empty-state-lecturer">
            <span className="empty-emoji">✨</span>
            <h3 className="empty-title">All caught up!</h3>
            <p className="empty-description">No questions to review at the moment</p>
          </div>
        ) : (
          <div className="questions-list-lecturer">
            {getFilteredQuestions().map((q) => (
              <div key={q.id} className="question-card-lecturer">
                <div className="question-header-lecturer">
                  <div className="upvote-badge">
                    <span>👍</span>
                    <span>{q.upvotes}</span>
                  </div>
                  <span className="timestamp">{q.timestamp}</span>
                </div>
                
                <div className="student-tag">Anonymous {q.studentTag}</div>
                
                {q.isReported && (
                  <div className="reported-badge-container">
                    <span className="reported-badge">🚩 Reported</span>
                  </div>
                )}
                
                <p className="question-text-lecturer">{q.question}</p>

                {q.answer && (
                  <div className="answer-container-lecturer">
                    <div className="answer-label">Answer:</div>
                    <div className="answer-text">{q.answer}</div>
                  </div>
                )}

                {/* Action Footer */}
                <div className="question-footer-lecturer">
                  <div className="action-buttons-lecturer">
                    {q.status === 'rejected' ? (
                      <>
                        <button className="action-btn restore-btn" onClick={() => handleRestore(q._id)}>
                          ♻️ Restore
                        </button>
                        <button className="action-btn permanent-delete-btn" onClick={() => handlePermanentDelete(q._id)}>
                          🗑️ Delete Permanently
                        </button>
                      </>
                    ) : (
                      <>
                        {q.status === 'pending' && (
                          <button className="action-btn answer-btn" onClick={() => handleAnswer(q._id)}>
                            ✅ Mark Answered
                          </button>
                        )}
                        <button className="action-btn delete-btn" onClick={() => handleDelete(q._id)}>
                          🗑️ Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
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
