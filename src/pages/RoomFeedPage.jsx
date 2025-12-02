import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { questionAPI, getSocket, initSocket } from '../services/api';
import SettingsModal from '../components/SettingsModal';
import './RoomFeedPage.css';

export default function RoomFeedPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode, roomName, lecturerName, questionsVisible, isOneTime } = location.state || {};
  
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [studentTag, setStudentTag] = useState(null);
  const [showAskModal, setShowAskModal] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchQuestions(studentTag);
    setRefreshing(false);
  };

  const handleReport = (questionId) => {
    setSelectedQuestionId(questionId);
    setShowReportModal(true);
  };

  const submitReport = async (reason) => {
    try {
      const response = await questionAPI.reportQuestion(selectedQuestionId, studentTag, reason);
      
      setShowReportModal(false);
      
      if (response.success) {
        alert(`✅ Reported: Question has been reported as ${reason.toLowerCase()}`);
        // Update local state to mark as reported
        setQuestions(prevQuestions =>
          prevQuestions.map(q =>
            q._id === selectedQuestionId ? { ...q, isReported: true } : q
          )
        );
      } else {
        alert(response.message || 'Unable to report question');
      }
    } catch (error) {
      console.error('Error reporting question:', error);
      alert('Unable to report question. Please try again.');
      setShowReportModal(false);
    }
  };

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    // Get student tag
    const tag = localStorage.getItem('studentTag');
    setStudentTag(tag);

    fetchQuestions(tag);
    setupSocket();
  }, [roomId, roomCode]);

  const fetchQuestions = async (tag) => {
    try {
      console.log('Fetching questions for room:', roomId, 'with tag:', tag || studentTag);
      const response = await questionAPI.getQuestions(roomId, tag || studentTag);
      console.log('Questions response:', response);
      
      if (response.success) {
        const transformedQuestions = response.data.map(q => ({
          id: q._id,
          _id: q._id,
          question: q.questionText,
          upvotes: q.upvotes,
          status: q.status,
          isMyQuestion: q.studentTag === (tag || studentTag),
          studentTag: q.studentTag,
          isReported: q.isReported,
          answer: q.answer
        }));
        setQuestions(transformedQuestions);
      } else {
        console.error('Failed to fetch questions:', response.message);
        alert(`Unable to load questions: ${response.message || 'Please try again.'}`);
      }
    } catch (error) {
      console.error('Error fetching questions:', error.response?.data || error.message || error);
      alert(`Unable to load questions: ${error.response?.data?.message || error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = () => {
    const socket = getSocket() || initSocket();
    
    // Join room immediately
    socket.emit('join-room', roomCode);
    console.log('Joined room via socket:', roomCode);

    // Rejoin room on reconnection
    socket.on('connect', () => {
      console.log('Socket connected, rejoining room:', roomCode);
      socket.emit('join-room', roomCode);
    });

    socket.on('new-question', (question) => {
      const newQuestion = {
        id: question._id,
        _id: question._id,
        question: question.questionText,
        upvotes: question.upvotes || 0,
        status: question.status || 'pending',
        isMyQuestion: question.studentTag === studentTag,
        studentTag: question.studentTag,
        isReported: question.isReported || false,
        answer: question.answer || null
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
      setQuestions(prev => prev.filter(q => q._id !== questionId));
    });

    return () => {
      socket.off('new-question');
      socket.off('question-upvote-update');
      socket.off('question-marked-answered');
      socket.off('question-removed');
    };
  };

  const getVisibleQuestions = () => {
    if (questionsVisible) {
      return questions;
    } else {
      return questions.filter(q => q.isMyQuestion);
    }
  };

  const visibleQuestions = getVisibleQuestions();

  const filters = [
    { id: 'all', label: 'All', count: visibleQuestions.length },
    { id: 'mine', label: 'My Questions', count: visibleQuestions.filter(q => q.isMyQuestion).length },
    { id: 'pending', label: 'Pending', count: visibleQuestions.filter(q => q.status === 'pending').length },
    { id: 'answered', label: 'Answered', count: visibleQuestions.filter(q => q.status === 'answered').length },
  ];

  const getFilteredQuestions = () => {
    if (activeFilter === 'all') return visibleQuestions;
    if (activeFilter === 'mine') return visibleQuestions.filter(q => q.isMyQuestion);
    if (activeFilter === 'answered') return visibleQuestions.filter(q => q.status === 'answered');
    return visibleQuestions.filter(q => q.status === activeFilter);
  };

  const handleAskQuestion = async () => {
    if (!questionText.trim()) return;

    try {
      setSubmitting(true);
      console.log('Submitting question:', questionText.trim(), 'to room:', roomId);
      const response = await questionAPI.askQuestion(questionText.trim(), roomId, roomCode);
      console.log('Question response:', response);
      
      if (response.success) {
        setQuestionText('');
        setShowAskModal(false);
      } else {
        console.error('Failed to submit question:', response.message);
        alert(`Failed to submit question: ${response.message || 'Please try again.'}`);
      }
    } catch (error) {
      console.error('Error asking question:', error.response?.data || error.message || error);
      alert(`Failed to submit question: ${error.response?.data?.message || error.message || 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (questionId) => {
    try {
      const response = await questionAPI.upvoteQuestion(questionId);
      if (response.success) {
        setQuestions(prev => prev.map(q => 
          q._id === questionId ? { ...q, upvotes: response.data.upvotes } : q
        ));
      }
    } catch (error) {
      console.error('Error upvoting:', error);
    }
  };

  if (loading) {
    return (
      <div className="room-feed-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="room-feed-page">
      {/* Header with back button */}
      <div className="top-header">
        <button className="back-icon" onClick={() => navigate('/')}>
          ←
        </button>
        <h1 className="page-title">Q&A Feed</h1>
        <button className="settings-icon" onClick={() => setShowSettings(true)} title="Settings">⚙️</button>
      </div>

      <div className="room-feed-container">
        {/* Room Info Card */}
        <div className="room-info-card">
          <h2 className="room-name">{roomName || 'Q&A Room'}</h2>
          <div className="room-details">
            <span className="lecturer-label">👨‍🏫 {lecturerName || 'Lecturer'}</span>
            <div className="room-code-badge">
              <span className="room-code-label">Code:</span>
              <span className="room-code">{roomCode || 'ABC123'}</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-container">
          <div className="filter-row">
            {filters.slice(0, 2).map(filter => (
              <button
                key={filter.id}
                className={`filter-tab ${activeFilter === filter.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter.id)}
              >
                <span className="filter-text">{filter.label}</span>
                <span className="filter-badge">{filter.count}</span>
              </button>
            ))}
          </div>
          <div className="filter-row">
            {filters.slice(2).map(filter => (
              <button
                key={filter.id}
                className={`filter-tab ${activeFilter === filter.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter.id)}
              >
                <span className="filter-text">{filter.label}</span>
                <span className="filter-badge">{filter.count}</span>
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
          <div className="empty-state">
            <span className="empty-emoji">{questionsVisible ? '🤔' : '🔒'}</span>
            <h3 className="empty-title">
              {questionsVisible ? 'No questions yet' : 'Private Room'}
            </h3>
            <p className="empty-description">
              {questionsVisible 
                ? 'Be the first to ask a question in this room'
                : 'In private rooms, you can only see your own questions'}
            </p>
          </div>
        ) : (
          <div className="questions-list">
            {getFilteredQuestions().map((q) => (
              <div key={q.id} className="question-card">
                <div className="question-header">
                  {q.isMyQuestion && <span className="you-badge">You</span>}
                  {!q.isMyQuestion && <span className="student-tag">{q.studentTag}</span>}
                </div>
                <p className="question-text">{q.question}</p>
                <div className="question-footer">
                  <button
                    className="upvote-button"
                    onClick={() => handleUpvote(q._id)}
                  >
                    👍 {q.upvotes}
                  </button>
                  <span className={`status-badge ${q.status}`}>
                    {q.status === 'pending' ? 'Pending' : 'Answered'}
                  </span>
                  {!q.isMyQuestion && (
                    <button 
                      className="more-button" 
                      onClick={() => handleReport(q._id)}
                      title="Report question"
                    >
                      ⋮
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Ask Button */}
      <button 
        className="fab"
        onClick={() => setShowAskModal(true)}
      >
        <span className="fab-text">+</span>
      </button>

      {/* Ask Question Modal */}
      {showAskModal && (
        <div className="modal-overlay" onClick={() => setShowAskModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Ask a Question</h2>
            <p className="modal-subtitle">Your question will be posted anonymously</p>
            <textarea
              className="question-input"
              placeholder="Type your question here..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={5}
              maxLength={500}
              autoFocus
            />
            <div className="modal-buttons">
              <button
                className="modal-button-cancel"
                onClick={() => {
                  setShowAskModal(false);
                  setQuestionText('');
                }}
              >
                Cancel
              </button>
              <button
                className="modal-button-submit"
                onClick={handleAskQuestion}
                disabled={submitting || !questionText.trim()}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content report-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Report Question</h2>
            <p className="modal-subtitle">Why are you reporting this question?</p>
            
            <button
              className="report-option"
              onClick={() => submitReport('Spam')}
            >
              <span className="report-option-icon">🚫</span>
              <span className="report-option-text">Spam</span>
            </button>

            <button
              className="report-option"
              onClick={() => submitReport('Inappropriate')}
            >
              <span className="report-option-icon">⚠️</span>
              <span className="report-option-text">Inappropriate</span>
            </button>

            <button
              className="report-option"
              onClick={() => submitReport('Off-topic')}
            >
              <span className="report-option-icon">📌</span>
              <span className="report-option-text">Off-topic</span>
            </button>

            <button
              className="cancel-option"
              onClick={() => setShowReportModal(false)}
            >
              <span className="cancel-text">Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        userType="student"
      />
    </div>
  );
}
