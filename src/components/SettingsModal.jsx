import { useState, useEffect } from 'react';
import './SettingsModal.css';

export default function SettingsModal({ isOpen, onClose, userType = 'student' }) {
  const [activeTab, setActiveTab] = useState(null);
  const [anonymousTag, setAnonymousTag] = useState('');
  const [userData, setUserData] = useState(null);
  const [isOneTimeUser, setIsOneTimeUser] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      const tag = localStorage.getItem('studentTag');
      const isOneTime = localStorage.getItem('isOneTimeUser') === 'true';
      const userStr = localStorage.getItem('user');
      
      setAnonymousTag(tag || '');
      setIsOneTimeUser(isOneTime);
      if (userStr) {
        setUserData(JSON.parse(userStr));
      }
    }
  }, [isOpen]);

  const generateRandomTag = () => {
    const animals = ['Panda', 'Tiger', 'Lion', 'Eagle', 'Dolphin', 'Fox', 'Wolf', 'Bear', 'Koala', 'Owl'];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const number = Math.floor(1000 + Math.random() * 9000);
    return `${animal}#${number}`;
  };

  const handleRegenerateTag = () => {
    if (!window.confirm('⚠️ Warning: If you regenerate your tag, you will lose connection to your previous questions. They will appear as questions from another student. This cannot be undone.')) {
      return;
    }

    const newTag = generateRandomTag();
    setAnonymousTag(newTag);
    localStorage.setItem('studentTag', newTag);
    alert('✅ Tag Regenerated! You now have a new anonymous identity.');
  };

  const handleEditProfile = () => {
    setEditName(userData?.fullName || '');
    setEditEmail(userData?.email || '');
    setShowEditProfile(true);
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      alert('Name cannot be empty');
      return;
    }

    const updatedUser = {
      ...userData,
      fullName: editName.trim()
      // Email is read-only and not updated
    };
    
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUserData(updatedUser);
    setShowEditProfile(false);
    alert('✅ Profile updated successfully!');
  };

  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to logout?')) return;

    localStorage.clear();
    window.location.href = '/';
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">Settings</h2>
          <button className="settings-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="settings-modal-body">
          {/* Profile Section - Show if user has userData OR if they have a studentTag */}
          {(userData || (userType === 'student' && anonymousTag)) && (
            <>
              <div className="settings-section-header">Profile</div>
              <div className="settings-section">
                {userType === 'student' ? (
                  <div className="profile-card-settings">
                    <div className="avatar-container-settings">
                      <span className="avatar-emoji">🎭</span>
                    </div>
                    <div className="profile-info-settings">
                      <div className="anonymous-label">Your Anonymous Tag</div>
                      <div className="anonymous-tag-display">{anonymousTag}</div>
                      <button className="regenerate-link" onClick={handleRegenerateTag}>
                        🔄 Regenerate Tag
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="profile-card-settings">
                    <div className="avatar-container-settings lecturer-avatar">
                      <span className="avatar-emoji">👨‍🏫</span>
                    </div>
                    <div className="profile-info-settings">
                      <div className="lecturer-name">{userData?.fullName || 'Lecturer'}</div>
                      <div className="lecturer-email">{userData?.email || ''}</div>
                      <button className="regenerate-link" onClick={handleEditProfile}>
                        ✏️ Edit Profile
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* About Section */}
          <div className="settings-section-header">About</div>
          <div className="settings-section">
            <div className="setting-item" onClick={() => setActiveTab('howItWorks')}>
              <div className="setting-left">
                <span className="setting-icon">📖</span>
                <div className="setting-text">
                  <div className="setting-title">How it Works</div>
                  <div className="setting-description">Learn about QBox features</div>
                </div>
              </div>
              <span className="setting-arrow">›</span>
            </div>

            <div className="setting-divider"></div>

            <div className="setting-item" onClick={() => setActiveTab('privacy')}>
              <div className="setting-left">
                <span className="setting-icon">🔒</span>
                <div className="setting-text">
                  <div className="setting-title">Privacy Policy</div>
                  <div className="setting-description">How we protect your data</div>
                </div>
              </div>
              <span className="setting-arrow">›</span>
            </div>

            <div className="setting-divider"></div>

            <div className="setting-item" onClick={() => setActiveTab('terms')}>
              <div className="setting-left">
                <span className="setting-icon">📜</span>
                <div className="setting-text">
                  <div className="setting-title">Terms of Service</div>
                  <div className="setting-description">Terms and conditions</div>
                </div>
              </div>
              <span className="setting-arrow">›</span>
            </div>

            <div className="setting-divider"></div>

            <div className="setting-item">
              <div className="setting-left">
                <span className="setting-icon">ℹ️</span>
                <div className="setting-text">
                  <div className="setting-title">App Version</div>
                  <div className="setting-description">Current version</div>
                </div>
              </div>
              <span className="version-text">1.0.0</span>
            </div>
          </div>

          {/* Support Section */}
          <div className="settings-section-header">Support</div>
          <div className="settings-section">
            <div className="setting-item" onClick={() => alert('Need help? Email us at axlesolutionsinfo@gmail.com')}>
              <div className="setting-left">
                <span className="setting-icon">💬</span>
                <div className="setting-text">
                  <div className="setting-title">Contact Support</div>
                  <div className="setting-description">Get help and report issues</div>
                </div>
              </div>
              <span className="setting-arrow">›</span>
            </div>

            <div className="setting-divider"></div>

            <div className="setting-item" onClick={() => alert('Enjoying QBox? Please rate us! Your feedback helps us improve.')}>
              <div className="setting-left">
                <span className="setting-icon">⭐</span>
                <div className="setting-text">
                  <div className="setting-title">Rate QBox</div>
                  <div className="setting-description">Share your feedback</div>
                </div>
              </div>
              <span className="setting-arrow">›</span>
            </div>
          </div>

          {/* Logout Button */}
          <button className="logout-btn-settings" onClick={handleLogout}>
            Logout
          </button>

          {/* Footer */}
          <div className="settings-footer">
            Made with ❤️ for better learning
          </div>
        </div>

        {/* Info Modals */}
        {activeTab === 'howItWorks' && (
          <div className="info-modal-overlay" onClick={() => setActiveTab(null)}>
            <div className="info-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="info-modal-header">
                <span className="info-modal-icon">📖</span>
                <h3>How QBox Works</h3>
              </div>
              
              <div className="info-section">
                <h4>🎯 For Students</h4>
                <p>• Join rooms using a 6-character code</p>
                <p>• Ask questions anonymously with a random tag</p>
                <p>• Upvote questions you find interesting</p>
                <p>• See answered questions</p>
                <p>• Report inappropriate content</p>
              </div>

              <div className="info-section">
                <h4>👨‍🏫 For Lecturers</h4>
                <p>• Create rooms with custom names</p>
                <p>• Share room codes with students</p>
                <p>• Manage pending and answered questions</p>
                <p>• Mark questions as answered</p>
                <p>• Close rooms when sessions end</p>
                <p>• Choose public or private visibility</p>
              </div>

              <div className="info-section">
                <h4>🔒 Privacy Features</h4>
                <p>• All student questions are anonymous</p>
                <p>• Random tags ensure identity protection</p>
                <p>• Private rooms for sensitive topics</p>
              </div>

              <button className="info-modal-close" onClick={() => setActiveTab(null)}>
                Got it!
              </button>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="info-modal-overlay" onClick={() => setActiveTab(null)}>
            <div className="info-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="info-modal-header">
                <span className="info-modal-icon">🔒</span>
                <h3>Privacy Policy</h3>
              </div>
              
              <div className="info-section">
                <h4>🛡️ Data Protection</h4>
                <p>Your privacy is our top priority. QBox is designed with privacy-first principles:</p>
                <p>• Student questions are completely anonymous</p>
                <p>• We never link questions to real identities</p>
                <p>• Random tags change between sessions</p>
                <p>• No tracking of individual activity</p>
              </div>

              <div className="info-section">
                <h4>📊 Data Collection</h4>
                <p>We only collect:</p>
                <p>• Email and name for lecturer accounts</p>
                <p>• Question content and votes (anonymous)</p>
                <p>• Room codes and session data</p>
                <p>• Basic usage analytics</p>
              </div>

              <div className="info-section">
                <h4>🔐 Data Security</h4>
                <p>• All data encrypted in transit and at rest</p>
                <p>• Secure authentication for lecturers</p>
                <p>• Regular security audits</p>
                <p>• No third-party data sharing</p>
              </div>

              <button className="info-modal-close" onClick={() => setActiveTab(null)}>
                Close
              </button>
            </div>
          </div>
        )}

        {activeTab === 'terms' && (
          <div className="info-modal-overlay" onClick={() => setActiveTab(null)}>
            <div className="info-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="info-modal-header">
                <span className="info-modal-icon">📜</span>
                <h3>Terms of Service</h3>
              </div>
              
              <div className="info-section">
                <h4>✅ Acceptable Use</h4>
                <p>By using QBox, you agree to:</p>
                <p>• Use the app for educational purposes</p>
                <p>• Be respectful to all users</p>
                <p>• Ask genuine, relevant questions</p>
                <p>• Not abuse the reporting system</p>
                <p>• Maintain a positive learning environment</p>
              </div>

              <div className="info-section">
                <h4>🚫 Prohibited Content</h4>
                <p>The following is strictly prohibited:</p>
                <p>• Spam or irrelevant content</p>
                <p>• Harassment or bullying</p>
                <p>• Hate speech or discrimination</p>
                <p>• Inappropriate material</p>
                <p>• Academic dishonesty</p>
              </div>

              <div className="info-section">
                <h4>⚠️ Consequences</h4>
                <p>Violations may result in:</p>
                <p>• Content removal</p>
                <p>• Account suspension</p>
                <p>• Permanent ban</p>
                <p>• Reporting to authorities</p>
              </div>

              <button className="info-modal-close" onClick={() => setActiveTab(null)}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* Edit Profile Modal */}
        {showEditProfile && (
          <div className="info-modal-overlay" onClick={() => setShowEditProfile(false)}>
            <div className="info-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="info-modal-header">
                <span className="info-modal-icon">✏️</span>
                <h3>Edit Profile</h3>
              </div>
              
              <div className="edit-form">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input form-input-readonly"
                    value={editEmail}
                    readOnly
                    placeholder="Email cannot be changed"
                  />
                  <p className="form-hint">Email is linked to your Google account and cannot be changed</p>
                </div>
              </div>

              <div className="modal-actions">
                <button className="modal-action-cancel" onClick={() => setShowEditProfile(false)}>
                  Cancel
                </button>
                <button className="info-modal-close" onClick={handleSaveProfile}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
