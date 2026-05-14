import React, { useEffect, useMemo, useState } from 'react';
import { BiCodeBlock, BiLayer, BiMusic, BiHash, BiMap, BiCameraMovie, BiCommentDetail, BiRefresh, BiTrash, BiPlay } from 'react-icons/bi';
import { useAdminConfig } from '../../../context/AdminConfigContext';
import adminContentService from '../../../services/adminContentService';

const AdminJsonEditor = ({ title, description, value, onSave }) => {
  const [draft, setDraft] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(JSON.stringify(value, null, 2));
    setError('');
  }, [value]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(draft);
      onSave(parsed);
      setError('');
    } catch (err) {
      setError('Invalid JSON. Please check your formatting.');
    }
  };

  return (
    <div className="admin-card admin-json-editor">
      <div className="admin-card-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <button type="button" className="admin-primary-btn" onClick={handleSave}>
          Save JSON
        </button>
      </div>
      <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={14} />
      {error && <p className="admin-error">{error}</p>}
    </div>
  );
};

const AdminContent = () => {
  const { config, setConfig } = useAdminConfig();
  const [activeTab, setActiveTab] = useState('reels');
  const [reels, setReels] = useState([]);
  const [sounds, setSounds] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [commentsList, setCommentsList] = useState([]);
  const [liveUsers, setLiveUsers] = useState([]);
  const [selectedReel, setSelectedReel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'reels' || activeTab === 'comments') {
      fetchReels();
    } else if (activeTab === 'sounds') {
      fetchSounds();
    } else if (activeTab === 'hashtags') {
      fetchHashtags();
    } else if (activeTab === 'live') {
      fetchLiveUsers();
    }
  }, [activeTab]);

  const fetchReels = async () => {
    setLoading(true);
    try {
      const response = await adminContentService.getAllReels();
      if (response.success) {
        setReels(response.reels);
      }
    } catch (err) {
      setError('Failed to fetch reels');
    } finally {
      setLoading(false);
    }
  };

  const fetchSounds = async () => {
    setLoading(true);
    try {
      const response = await adminContentService.getAllSounds();
      if (response.success) {
        setSounds(response.sounds);
      }
    } catch (err) {
      setError('Failed to fetch sounds');
    } finally {
      setLoading(false);
    }
  };

  const fetchHashtags = async () => {
    setLoading(true);
    try {
      const response = await adminContentService.getAllHashtags();
      if (response.success) {
        setHashtags(response.hashtags);
      }
    } catch (err) {
      setError('Failed to fetch hashtags');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveUsers = async () => {
    setLoading(true);
    try {
      const response = await adminContentService.getAllLiveUsers();
      if (response.success) {
        setLiveUsers(response.users);
      }
    } catch (err) {
      setError('Failed to fetch live users');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (reelId) => {
    setLoading(true);
    try {
      const response = await adminContentService.getAllComments({ reelId });
      if (response.success) {
        setCommentsList(response.comments);
      }
    } catch (err) {
      setError('Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (id) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        const response = await adminContentService.deleteComment(id);
        if (response.success) {
          setCommentsList(commentsList.filter(c => c._id !== id));
        }
      } catch (err) {
        alert('Failed to delete comment');
      }
    }
  };

  const handleDeleteReel = async (id) => {
    if (window.confirm('Are you sure you want to delete this reel?')) {
      try {
        const response = await adminContentService.deleteReel(id);
        if (response.success) {
          setReels(reels.filter(r => r._id !== id));
        }
      } catch (err) {
        alert('Failed to delete reel');
      }
    }
  };

  const sections = useMemo(
    () => [
      { id: 'reels', label: 'Reels', icon: <BiLayer /> },
      { id: 'sounds', label: 'Sounds', icon: <BiMusic /> },
      { id: 'hashtags', label: 'Hashtags', icon: <BiHash /> },
      { id: 'live', label: 'Live', icon: <BiCameraMovie /> },
      { id: 'interests', label: 'Interests', icon: <BiCameraMovie /> },
      { id: 'comments', label: 'Comments', icon: <BiCommentDetail /> },
    ],
    [],
  );

  const setSection = (updater) => {
    setConfig((currentConfig) => updater(currentConfig));
  };

  const sectionMap = {
    templates: {
      title: 'Templates',
      description: 'Gallery items shown in the create templates tray.',
      value: config?.createFlow?.galleryItems || [],
      onSave: (nextValue) =>
        setSection((currentConfig) => ({
          ...currentConfig,
          createFlow: {
            ...currentConfig.createFlow,
            galleryItems: nextValue,
          },
        })),
    },
    locations: {
      title: 'Locations',
      description: 'Popular location chips and search results.',
      value: config?.createFlow?.locations || { chips: [], results: [] },
      onSave: (nextValue) =>
        setSection((currentConfig) => ({
          ...currentConfig,
          createFlow: {
            ...currentConfig.createFlow,
            locations: nextValue,
          },
        })),
    },
    interests: {
      title: 'Onboarding Interests',
      description: 'Interest clusters powering the onboarding flow.',
      value: config?.onboarding?.interests || [],
      onSave: (nextValue) =>
        setSection((currentConfig) => ({
          ...currentConfig,
          onboarding: {
            ...currentConfig.onboarding,
            interests: nextValue,
          },
        })),
    },
    create: {
      title: 'Create Flow Tools',
      description: 'Configure filters, tools, audiences, and share options.',
      value: config?.createFlow,
      onSave: (nextValue) =>
        setSection((currentConfig) => ({
          ...currentConfig,
          createFlow: nextValue,
        })),
    },
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Content</h1>
          <p>Control every piece of content powering the user experience.</p>
        </div>
      </div>

      <div className="admin-tabs">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveTab(section.id)}
            className={`admin-tab ${activeTab === section.id ? 'active' : ''}`}
          >
            <span className="admin-tab-icon">{section.icon}</span>
            {section.label}
          </button>
        ))}
      </div>

      <div className="admin-content-body">
        {activeTab === 'reels' ? (
          <div className="admin-reels-section">
            <div className="admin-section-header">
              <div>
                <h2>User Reels</h2>
                <p>Manage all reels uploaded by users.</p>
              </div>
              <button type="button" className="admin-secondary-btn" onClick={fetchReels}>
                <BiRefresh size={18} /> Refresh
              </button>
            </div>

            <div className="admin-card">
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>Loading reels...</div>
              ) : (
                <div className="admin-reels-grid">
                  {reels.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', gridColumn: '1/-1' }}>No reels found in database.</div>
                  ) : (
                    reels.map((reel) => (
                      <div key={reel._id} className="admin-reel-card">
                        <div className="admin-reel-preview">
                          {reel.video?.url ? (
                            <video src={reel.video.url} preload="metadata" />
                          ) : (
                            <div className="admin-reel-placeholder"><BiPlay size={40} /></div>
                          )}
                          <div className="admin-reel-overlay">
                            <button type="button" className="admin-reel-delete" onClick={() => handleDeleteReel(reel._id)}>
                              <BiTrash size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="admin-reel-info">
                          <p className="admin-reel-user">@{reel.user?.username || 'unknown'}</p>
                          <p className="admin-reel-caption">{reel.caption || 'No caption'}</p>
                          <div className="admin-reel-stats">
                            <span>{reel.likesCount || 0} Likes</span>
                            <span>{reel.commentsCount || 0} Comments</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'sounds' ? (
          <div className="admin-sounds-section">
            <div className="admin-section-header">
              <div>
                <h2>Sound Catalog</h2>
                <p>Manage sounds extracted from user reels.</p>
              </div>
              <button type="button" className="admin-secondary-btn" onClick={fetchSounds}>
                <BiRefresh size={18} /> Refresh
              </button>
            </div>

            <div className="admin-card">
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>Loading sounds...</div>
              ) : (
                <div className="admin-sounds-grid">
                  {sounds.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', gridColumn: '1/-1' }}>No sounds found in database.</div>
                  ) : (
                    sounds.map((sound, idx) => (
                      <div key={idx} className="admin-sound-card">
                        <div className="admin-sound-icon">
                          <BiMusic size={24} />
                        </div>
                        <div className="admin-sound-info">
                          <p className="admin-sound-name">{sound.name}</p>
                          <p className="admin-sound-artist">{sound.artist || 'Original Artist'}</p>
                          <div className="admin-sound-meta">
                            <span className="admin-chip">{sound.usageCount} reels</span>
                          </div>
                          {sound.url && (
                            <audio controls src={sound.url} className="admin-sound-player" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'hashtags' ? (
          <div className="admin-hashtags-section">
            <div className="admin-section-header">
              <div>
                <h2>Trending Hashtags</h2>
                <p>Monitor hashtags extracted from user reels.</p>
              </div>
              <button type="button" className="admin-secondary-btn" onClick={fetchHashtags}>
                <BiRefresh size={18} /> Refresh
              </button>
            </div>

            <div className="admin-card">
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>Loading hashtags...</div>
              ) : (
                <div className="admin-hashtags-grid">
                  {hashtags.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', gridColumn: '1/-1' }}>No hashtags found in database.</div>
                  ) : (
                    hashtags.map((tag, idx) => (
                      <div key={idx} className="admin-hashtag-card">
                        <div className="admin-hashtag-info">
                          <span className="admin-hashtag-symbol">#</span>
                          <span className="admin-hashtag-name">{tag.name}</span>
                        </div>
                        <div className="admin-hashtag-stats">
                          <span>{tag.usageCount} reels</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'comments' ? (
          <div className="admin-comments-section">
            <div className="admin-section-header">
              <div>
                <h2>{selectedReel ? `Comments for @${selectedReel.user?.username}` : 'Select a Reel to View Comments'}</h2>
                <p>{selectedReel ? `Caption: ${selectedReel.caption}` : 'Manage comments across all user reels.'}</p>
              </div>
              <div className="admin-header-actions">
                {selectedReel && (
                  <button type="button" className="admin-secondary-btn" onClick={() => setSelectedReel(null)} style={{ marginRight: '10px' }}>
                    Back to Reels
                  </button>
                )}
                <button type="button" className="admin-secondary-btn" onClick={selectedReel ? () => fetchComments(selectedReel._id) : fetchReels}>
                  <BiRefresh size={18} /> Refresh
                </button>
              </div>
            </div>

            <div className="admin-card">
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
              ) : selectedReel ? (
                <div className="admin-comments-list">
                  {commentsList.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>No comments found for this reel.</div>
                  ) : (
                    commentsList.map((comment) => (
                      <div key={comment._id} className="admin-comment-item">
                        <div className="admin-comment-user">
                          <img src={comment.user?.profilePicture || '/default-avatar.png'} alt="" className="admin-comment-avatar" />
                          <div className="admin-comment-user-info">
                            <p className="admin-comment-username">@{comment.user?.username}</p>
                            <p className="admin-comment-date">{new Date(comment.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className="admin-comment-text">{comment.text}</p>
                        <button type="button" className="admin-comment-delete" onClick={() => handleDeleteComment(comment._id)}>
                          <BiTrash size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="admin-reels-grid">
                  {reels.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', gridColumn: '1/-1' }}>No reels found in database.</div>
                  ) : (
                    reels.map((reel) => (
                      <div key={reel._id} className="admin-reel-card">
                        <div className="admin-reel-preview">
                          {reel.video?.url ? (
                            <video src={reel.video.url} preload="metadata" />
                          ) : (
                            <div className="admin-reel-placeholder"><BiPlay size={40} /></div>
                          )}
                          <div className="admin-reel-overlay">
                            <button 
                              type="button" 
                              className="admin-reel-action-btn" 
                              onClick={() => {
                                setSelectedReel(reel);
                                fetchComments(reel._id);
                              }}
                            >
                              <BiCommentDetail size={24} />
                            </button>
                          </div>
                        </div>
                        <div className="admin-reel-info">
                          <p className="admin-reel-user">@{reel.user?.username || 'unknown'}</p>
                          <p className="admin-reel-caption">{reel.caption || 'No caption'}</p>
                          <div className="admin-reel-stats">
                            <span>{reel.commentsCount || 0} Comments</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'live' ? (
          <div className="admin-live-section">
            <div className="admin-section-header">
              <div>
                <h2>Live Users</h2>
                <p>Monitor users currently broadcasting live.</p>
              </div>
              <button type="button" className="admin-secondary-btn" onClick={fetchLiveUsers}>
                <BiRefresh size={18} /> Refresh
              </button>
            </div>

            <div className="admin-card">
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>Loading live users...</div>
              ) : (
                <div className="admin-live-grid">
                  {liveUsers.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', gridColumn: '1/-1' }}>No users are currently live.</div>
                  ) : (
                    liveUsers.map((user) => (
                      <div key={user._id} className="admin-live-card">
                        <div className="admin-live-avatar-container">
                          <img src={user.profilePicture?.url || '/default-avatar.png'} alt="" className="admin-live-avatar" />
                          <div className="admin-live-badge">LIVE</div>
                        </div>
                        <div className="admin-live-info">
                          <p className="admin-live-username">@{user.username}</p>
                          <p className="admin-live-name">{user.fullName}</p>
                          <div className="admin-live-meta">
                            <span>{user.stats?.followersCount || 0} Followers</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          sectionMap[activeTab] && (
            <AdminJsonEditor
              title={sectionMap[activeTab].title}
              description={sectionMap[activeTab].description}
              value={sectionMap[activeTab].value}
              onSave={sectionMap[activeTab].onSave}
            />
          )
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-reels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
          padding: 20px;
        }
        .admin-reel-card {
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #f3f4f6;
        }
        .admin-reel-preview {
          position: relative;
          aspect-ratio: 9/16;
          background: #000;
          overflow: hidden;
        }
        .admin-reel-preview video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .admin-reel-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4b5563;
        }
        .admin-reel-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.2);
          opacity: 0;
          transition: opacity 0.2s;
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
          padding: 10px;
        }
        .admin-reel-card:hover .admin-reel-overlay {
          opacity: 1;
        }
        .admin-reel-delete {
          background: rgba(239, 68, 68, 0.9);
          color: white;
          border: none;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
        }
        .admin-reel-info {
          padding: 12px;
        }
        .admin-reel-user {
          font-weight: 700;
          font-size: 13px;
          color: #111827;
          margin-bottom: 4px;
        }
        .admin-reel-caption {
          font-size: 12px;
          color: #6b7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 8px;
        }
        .admin-reel-stats {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: #9ca3af;
          font-weight: 600;
        }
        .admin-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .admin-sounds-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          padding: 20px;
        }
        .admin-sound-card {
          display: flex;
          gap: 16px;
          padding: 16px;
          background: #fff;
          border-radius: 12px;
          border: 1px solid #f3f4f6;
          align-items: flex-start;
        }
        .admin-sound-icon {
          width: 48px;
          height: 48px;
          background: #fee2e2;
          color: #ef4444;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          flex-shrink: 0;
        }
        .admin-sound-info {
          flex: 1;
          min-width: 0;
        }
        .admin-sound-name {
          font-weight: 700;
          color: #111827;
          font-size: 14px;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .admin-sound-artist {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 8px;
        }
        .admin-sound-player {
          width: 100%;
          height: 30px;
          margin-top: 8px;
        }
        .admin-hashtags-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          padding: 20px;
        }
        .admin-hashtag-card {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #f3f4f6;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.2s;
        }
        .admin-hashtag-card:hover {
          border-color: #ef4444;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .admin-hashtag-info {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .admin-hashtag-symbol {
          color: #ef4444;
          font-weight: 800;
          font-size: 18px;
        }
        .admin-hashtag-name {
          font-weight: 700;
          color: #111827;
          font-size: 15px;
        }
        .admin-hashtag-stats {
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;
          background: #f9fafb;
          padding: 4px 8px;
          border-radius: 6px;
          width: fit-content;
        }
        .admin-reel-action-btn {
          background: rgba(255, 255, 255, 0.9);
          color: #111827;
          border: none;
          padding: 12px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s;
        }
        .admin-reel-action-btn:hover {
          transform: scale(1.1);
          background: #fff;
          color: #ef4444;
        }
        .admin-comments-list {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .admin-comment-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f3f4f6;
          position: relative;
        }
        .admin-comment-item:last-child {
          border-bottom: none;
        }
        .admin-comment-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid #e5e7eb;
        }
        .admin-comment-user-info {
          flex: 1;
        }
        .admin-comment-username {
          font-weight: 700;
          font-size: 14px;
          color: #111827;
          margin-bottom: 2px;
        }
        .admin-comment-date {
          font-size: 11px;
          color: #9ca3af;
        }
        .admin-comment-text {
          font-size: 14px;
          color: #4b5563;
          margin-top: 4px;
          flex: 3;
        }
        .admin-comment-delete {
          background: #fee2e2;
          color: #ef4444;
          border: none;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .admin-comment-delete:hover {
          background: #fecaca;
        }
        .admin-live-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          padding: 20px;
        }
        .admin-live-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #f3f4f6;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.2s;
        }
        .admin-live-card:hover {
          border-color: #ef4444;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .admin-live-avatar-container {
          position: relative;
        }
        .admin-live-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 3px solid #ef4444;
          padding: 2px;
          object-fit: cover;
        }
        .admin-live-badge {
          position: absolute;
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%);
          background: #ef4444;
          color: #fff;
          font-size: 9px;
          font-weight: 900;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }
        .admin-live-info {
          flex: 1;
        }
        .admin-live-username {
          font-weight: 700;
          color: #111827;
          font-size: 15px;
          margin-bottom: 2px;
        }
        .admin-live-name {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 8px;
        }
        .admin-live-meta {
          font-size: 11px;
          color: #9ca3af;
          font-weight: 600;
        }
      `}} />
    </div>
  );
};

export default AdminContent;
