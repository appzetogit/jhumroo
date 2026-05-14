import React, { useEffect, useState } from 'react';
import { BiMusic, BiPlus, BiTrash, BiRefresh, BiPlay, BiPause, BiEditAlt } from 'react-icons/bi';
import audioService from '../../../services/audioService';

const AudioDuration = ({ audio }) => {
  const [duration, setDuration] = useState(audio.duration || 0);

  useEffect(() => {
    if (!audio.duration && audio.url) {
      const tempAudio = new window.Audio(audio.url);
      tempAudio.onloadedmetadata = () => {
        setDuration(tempAudio.duration);
      };
    }
  }, [audio.url, audio.duration]);

  const mins = Math.floor(duration / 60);
  const secs = Math.floor(duration % 60);
  const formatted = duration ? `${mins}:${secs.toString().padStart(2, '0')}` : '0:00';

  return (
    <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--admin-text)' }}>
      {formatted}
    </span>
  );
};

const AdminAudio = () => {
  const [audios, setAudios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [audioPlayer] = useState(new Audio());
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    audio: null,
    thumbnail: null,
    category: 'Trending',
    duration: 0
  });

  useEffect(() => {
    fetchAudios();
    audioPlayer.onended = () => setPlayingId(null);
    
    return () => {
      audioPlayer.pause();
      audioPlayer.src = '';
      audioPlayer.onended = null;
    };
  }, []);

  const fetchAudios = async () => {
    setLoading(true);
    try {
      const data = await audioService.getAllAudios();
      setAudios(data);
    } catch (err) {
      setError('Failed to fetch audios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('artist', formData.artist);
      data.append('category', formData.category);
      
      if (isEditing) {
        if (formData.thumbnail) data.append('thumbnail', formData.thumbnail);
        await audioService.updateAudio(editId, data);
      } else {
        if (formData.audio) data.append('audio', formData.audio);
        if (formData.thumbnail) data.append('thumbnail', formData.thumbnail);
        if (formData.duration) data.append('duration', formData.duration);
        await audioService.createAudio(data);
      }

      setShowAddModal(false);
      resetForm();
      fetchAudios();
    } catch (err) {
      console.error('Submit audio error:', err);
      alert(err.message || `Failed to ${isEditing ? 'update' : 'add'} audio`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', artist: '', audio: null, thumbnail: null, category: 'Trending', duration: 0 });
    setIsEditing(false);
    setEditId(null);
  };

  const handleEditClick = (audio) => {
    setFormData({
      title: audio.title,
      artist: audio.artist,
      category: audio.category,
      audio: null,
      thumbnail: null
    });
    setIsEditing(true);
    setEditId(audio._id);
    setShowAddModal(true);
  };

  const handleDeleteAudio = async (id) => {
    if (window.confirm('Are you sure you want to delete this audio?')) {
      try {
        await audioService.deleteAudio(id);
        setAudios(audios.filter(a => a._id !== id));
      } catch (err) {
        alert('Failed to delete audio');
      }
    }
  };

  const togglePlay = (audio) => {
    if (playingId === audio._id) {
      audioPlayer.pause();
      setPlayingId(null);
    } else {
      audioPlayer.src = audio.url;
      audioPlayer.play();
      setPlayingId(audio._id);
    }
  };



  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Audio Library</h1>
          <p>Manage the music and sounds available for user reels.</p>
        </div>
        <button 
          className="admin-primary-btn" 
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <BiPlus size={20} /> Add Audio
        </button>
      </div>

      {error && <div className="admin-error-banner">{error}</div>}

      <div className="admin-section-header" style={{ marginTop: '24px' }}>
        <h2>Available Sounds ({audios.length})</h2>
        <button className="admin-secondary-btn" onClick={fetchAudios}>
          <BiRefresh size={18} /> Refresh
        </button>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading audio library...</div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-audio-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}></th>
                  <th>Track Details</th>
                  <th>Category</th>
                  <th>Duration</th>
                  <th>Usage</th>
                  <th>Date Added</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {audios.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center' }}>
                      No audios found. Start by adding one!
                    </td>
                  </tr>
                ) : (
                  audios.map((audio) => (
                    <tr key={audio._id}>
                      <td>
                        <div className="admin-list-cover">
                          {audio.thumbnail ? (
                            <img src={audio.thumbnail} alt={audio.title} />
                          ) : (
                            <div className="admin-list-placeholder">
                              <BiMusic size={18} />
                            </div>
                          )}
                          <button 
                            className="admin-list-play-btn"
                            onClick={() => togglePlay(audio)}
                          >
                            {playingId === audio._id ? <BiPause size={16} /> : <BiPlay size={16} />}
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="admin-list-details">
                          <span className="admin-list-title">{audio.title}</span>
                          <span className="admin-list-artist">{audio.artist}</span>
                        </div>
                      </td>
                      <td>
                        <span className="admin-chip">{audio.category}</span>
                      </td>
                      <td>
                        <AudioDuration audio={audio} />
                      </td>
                      <td>
                        <div className="admin-usage-badge">
                          <BiMusic size={14} />
                          <span>{audio.usageCount || 0} reels</span>
                        </div>
                      </td>
                      <td>
                        <span className="admin-list-date">
                          {new Date(audio.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td>
                        <div className="admin-list-actions">
                          <button 
                            className="admin-edit-icon-btn"
                            onClick={() => handleEditClick(audio)}
                          >
                            <BiEditAlt size={18} />
                          </button>
                          <button 
                            className="admin-delete-icon-btn"
                            onClick={() => handleDeleteAudio(audio._id)}
                          >
                            <BiTrash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>{isEditing ? 'Edit Audio Details' : 'Add New Audio'}</h2>
              <button onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="admin-form-group">
                <label>Title</label>
                <input 
                  type="text" 
                  required 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Summer Vibes"
                />
              </div>
              <div className="admin-form-group">
                <label>Artist</label>
                <input 
                  type="text" 
                  value={formData.artist}
                  onChange={(e) => setFormData({...formData, artist: e.target.value})}
                  placeholder="e.g. Calvin Harris"
                />
              </div>
              {!isEditing && (
                <div className="admin-form-group">
                  <label>Audio File</label>
                  <input 
                    type="file" 
                    accept="audio/*"
                    required 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const objectUrl = URL.createObjectURL(file);
                        const tempAudio = new window.Audio(objectUrl);
                        tempAudio.onloadedmetadata = () => {
                          setFormData({...formData, audio: file, duration: tempAudio.duration});
                          URL.revokeObjectURL(objectUrl);
                        };
                      }
                    }}
                  />
                </div>
              )}
              <div className="admin-form-group">
                <label>Cover Image (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setFormData({...formData, thumbnail: e.target.files[0]})}
                />
              </div>
              <div className="admin-form-group">
                <label>Category</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Trending">Trending</option>
                  <option value="Pop">Pop</option>
                  <option value="Rock">Rock</option>
                  <option value="Hiphop">Hiphop</option>
                  <option value="Lofi">Lofi</option>
                </select>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-secondary-btn" onClick={() => setShowAddModal(false)} disabled={loading}>Cancel</button>
                <button type="submit" className="admin-primary-btn" disabled={loading}>
                  {loading ? 'Processing...' : (isEditing ? 'Update Details' : 'Add to Library')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-table-container {
          width: 100%;
          overflow-x: auto;
        }
        .admin-audio-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .admin-audio-table th {
          background: #f9fafb;
          padding: 14px 20px;
          font-size: 12px;
          font-weight: 600;
          color: var(--admin-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #f3f4f6;
        }
        .admin-audio-table td {
          padding: 12px 20px;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: middle;
        }
        .admin-audio-table tr:hover {
          background: #fcfdfe;
        }
        .admin-list-cover {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 8px;
          background: #f3f4f6;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .admin-list-cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .admin-list-placeholder {
          color: #9ca3af;
        }
        .admin-list-play-btn {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.4);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .admin-list-cover:hover .admin-list-play-btn {
          opacity: 1;
        }
        .admin-list-details {
          display: flex;
          flex-direction: column;
        }
        .admin-list-title {
          font-weight: 700;
          color: var(--admin-text);
          font-size: 14px;
        }
        .admin-list-artist {
          font-size: 12px;
          color: var(--admin-muted);
        }
        .admin-list-date {
          font-size: 12px;
          color: #9ca3af;
        }
        .admin-usage-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #4b5563;
          font-weight: 600;
        }
        .admin-usage-badge span {
          color: var(--admin-primary);
        }
        .admin-list-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        .admin-chip {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 100px;
          background: #fee2e2;
          color: #fe2c55;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .admin-delete-icon-btn {
          background: #fee2e2;
          color: #ef4444;
          border: none;
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .admin-delete-icon-btn:hover {
          background: #fecaca;
        }
        .admin-edit-icon-btn {
          background: #e0f2fe;
          color: #0ea5e9;
          border: none;
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .admin-edit-icon-btn:hover {
          background: #bae6fd;
        }
        .admin-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-blur: 4px;
        }
        .admin-modal {
          background: white;
          width: 100%;
          max-width: 500px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        .admin-modal-header {
          padding: 20px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .admin-modal-header h2 {
          margin: 0;
          font-size: 18px;
        }
        .admin-modal-header button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #9ca3af;
        }
        .admin-form {
          padding: 20px;
        }
        .admin-form-group {
          margin-bottom: 16px;
        }
        .admin-form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--admin-text);
          margin-bottom: 6px;
        }
        .admin-form-group input, .admin-form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
        }
        .admin-modal-footer {
          margin-top: 24px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
      `}} />
    </div>
  );
};

export default AdminAudio;
