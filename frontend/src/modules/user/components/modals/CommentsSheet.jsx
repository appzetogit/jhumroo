import React, { useState } from 'react';
import { BiX, BiSend, BiHeart, BiSolidHeart } from 'react-icons/bi';
import { useTheme } from '../../../../context/ThemeContext';
import { useAppContent } from '../../../../hooks/useAppContent';
import { useAuth } from '../../../../context/AuthContext';
import reelService from '../../../../services/reelService';
import userService from '../../../../services/userService';

const CommentsSheet = ({ isOpen, onClose, commentCount = 0, reelId, onCommentAdded }) => {
  const { isDarkMode } = useTheme();
  const { config } = useAppContent();
  const { user: currentUser } = useAuth();
  const quickEmojis = config?.comments?.quickEmojis || [];
  const [newComment, setNewComment] = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [commentsList, setCommentsList] = useState([]);
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // { id, username }
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionSearchLoading, setMentionSearchLoading] = useState(false);

  // Mention Suggestions logic
  React.useEffect(() => {
    const lastWord = newComment.split(' ').pop();
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      const query = lastWord.slice(1);
      const delayDebounceFn = setTimeout(async () => {
        setMentionSearchLoading(true);
        try {
          const response = await userService.getMentionSuggestions(query);
          if (response.success) {
            setMentionSuggestions(response.users);
            setShowSuggestions(response.users.length > 0);
          }
        } catch (err) {
          console.error("Mention search error:", err);
        } finally {
          setMentionSearchLoading(false);
        }
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    } else {
      setShowSuggestions(false);
    }
  }, [newComment]);

  const handleSelectMention = (username) => {
    const words = newComment.split(' ');
    words[words.length - 1] = `@${username} `;
    setNewComment(words.join(' '));
    setShowSuggestions(false);
  };

  const fetchComments = async () => {
    if (!reelId) return;
    setLoading(true);
    try {
      const response = await reelService.getComments(reelId);
      if (response.success) {
        setCommentsList(response.comments);
        setCommentsDisabled(!!response.commentsDisabled);
        if (typeof onCommentAdded === 'function') {
          onCommentAdded(response.comments.length);
        }
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, reelId]);

  const handleSend = async () => {
    if (!newComment.trim() || !reelId) return;

    try {
      const response = await reelService.addComment(reelId, newComment, replyTo?.id);
      if (response.success) {
        const commentData = response.comment;
        
        if (replyTo) {
          // Re-fetch to get correct counts and nesting for replies
          fetchComments();
        } else {
          setCommentsList(prev => [commentData, ...prev]);
          if (typeof onCommentAdded === 'function') {
            onCommentAdded(commentsList.length + 1);
          }
        }
        
        setNewComment('');
        setReplyTo(null);
      }
    } catch (err) {
      console.error("Error posting comment:", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji) => {
    setNewComment((prev) => `${prev}${emoji}`);
  };

  React.useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = '';
      setKeyboardOffset(0);
      return;
    }

    const body = document.body;
    const root = document.getElementById('root');
    const appShell = root?.firstElementChild;
    const viewport = window.visualViewport;
    const lockedHeight = Math.round(
      appShell instanceof HTMLElement
        ? appShell.getBoundingClientRect().height
        : window.innerHeight
    );

    const previousBodyHeight = body.style.height;
    const previousRootHeight = root?.style.height ?? '';
    const previousAppShellHeight = appShell instanceof HTMLElement ? appShell.style.height : '';

    body.style.overflow = 'hidden';
    body.style.height = `${lockedHeight}px`;

    if (root) {
      root.style.height = `${lockedHeight}px`;
    }

    if (appShell instanceof HTMLElement) {
      appShell.style.height = `${lockedHeight}px`;
    }

    const syncKeyboardOffset = () => {
      if (!viewport) {
        setKeyboardOffset(0);
        return;
      }

      const nextOffset = Math.max(0, lockedHeight - viewport.height - viewport.offsetTop);
      setKeyboardOffset(nextOffset);
    };

    syncKeyboardOffset();
    viewport?.addEventListener('resize', syncKeyboardOffset);
    viewport?.addEventListener('scroll', syncKeyboardOffset);

    return () => {
      viewport?.removeEventListener('resize', syncKeyboardOffset);
      viewport?.removeEventListener('scroll', syncKeyboardOffset);
      body.style.overflow = '';
      body.style.height = previousBodyHeight;

      if (root) {
        root.style.height = previousRootHeight;
      }

      if (appShell instanceof HTMLElement) {
        appShell.style.height = previousAppShellHeight;
      }

      setKeyboardOffset(0);
    };
  }, [isOpen]);

  const [loadedReplies, setLoadedReplies] = useState({}); // { commentId: [replies] }

  const fetchReplies = async (commentId) => {
    try {
      const response = await reelService.getCommentReplies(commentId);
      if (response.success) {
        setLoadedReplies(prev => ({
          ...prev,
          [commentId]: response.replies
        }));
      }
    } catch (err) {
      console.error("Error fetching replies:", err);
    }
  };

  const handleToggleCommentLike = async (commentId, parentId = null) => {
    try {
      const response = await reelService.toggleCommentLike(commentId);
      if (response.success) {
        const { isLiked, likesCount } = response;
        
        if (!parentId) {
          // Update top-level comment
          setCommentsList(prev => prev.map(c => 
            String(c._id || c.id) === String(commentId) ? { ...c, isLiked, likesCount } : c
          ));
        } else {
          // Update reply
          if (loadedReplies[parentId]) {
            setLoadedReplies(prev => ({
              ...prev,
              [parentId]: prev[parentId].map(r => 
                String(r._id || r.id) === String(commentId) ? { ...r, isLiked, likesCount } : r
              )
            }));
          }
          
          setCommentsList(prev => prev.map(c => {
            if (String(c._id || c.id) === String(parentId) && c.replyPreview) {
              return {
                ...c,
                replyPreview: c.replyPreview.map(r => 
                  String(r._id || r.id) === String(commentId) ? { ...r, isLiked, likesCount } : r
                )
              };
            }
            return c;
          }));
        }
      }
    } catch (err) {
      console.error("Error toggling comment like:", err);
    }
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Just now';
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diffInSeconds = Math.floor((now - date) / 1000);

      if (diffInSeconds < 0) return 'Just now';
      if (diffInSeconds < 60) return `${diffInSeconds}s`;
      
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `${diffInMinutes}m`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d`;
      
      return date.toLocaleDateString();
    } catch (e) {
      return 'Just now';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`absolute inset-0 z-[2000] flex flex-col justify-end touch-none comments-sheet-backdrop ${
        isDarkMode ? 'bg-black/50' : 'bg-black/30 backdrop-blur-[2px]'
      }`}
      data-modal-open="true"
      onClick={onClose}
    >
      <div 
        className={`w-full h-[70%] rounded-t-[12px] flex flex-col animate-slide-up touch-auto ${
          isDarkMode
            ? 'bg-[#161823] text-white'
            : 'bg-white text-black shadow-[0_-12px_36px_rgba(15,23,42,0.16)] border-t border-black/10'
        }`} 
        style={{ paddingBottom: keyboardOffset ? `${keyboardOffset}px` : undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`relative p-4 border-b flex flex-col items-center ${isDarkMode ? 'border-white/5' : 'border-black/[0.08]'}`}>
           <div className={`w-10 h-1 rounded-full mb-3 shrink-0 ${isDarkMode ? 'bg-white/20' : 'bg-black/15'}`}></div>
           <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{commentsList.length} comments</h3>
           <button
             className={`absolute right-4 top-4 hover:opacity-70 transition-opacity ${isDarkMode ? 'text-white' : 'text-black/70'}`}
             onClick={onClose}
           >
              <BiX size={24} />
           </button>
        </div>

         <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollable no-scrollbar overscroll-contain">
            {loading && commentsList.length === 0 ? (
               <div className="flex justify-center py-10 opacity-50 text-sm">Loading comments...</div>
            ) : commentsDisabled ? (
               <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-2">
                 <div className={`p-4 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                   <BiX size={32} className="opacity-40" />
                 </div>
                 <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Comments are turned off</h4>
                 <p className={`text-xs opacity-50 leading-relaxed`}>The creator has turned off comments for this video.</p>
               </div>
            ) : commentsList.length === 0 ? (
               <div className="flex justify-center py-10 opacity-50 text-sm">No comments yet. Be the first!</div>
            ) : (
               commentsList.map(comment => (
                  <div key={comment._id || comment.id} className="animate-fade-in">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-black/5">
                            <img 
                              src={comment.user?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user?.username || comment.user}`} 
                              alt="avatar" 
                              className="w-full h-full object-cover" 
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-bold ${isDarkMode ? 'text-white/50' : 'text-black/45'}`}>@{comment.user?.username || comment.user}</span>
                              <span className={`text-[10px] font-medium ${isDarkMode ? 'text-white/30' : 'text-black/30'}`}>{formatRelativeTime(comment.createdAt)}</span>
                            </div>
                            <p className={`text-sm leading-relaxed mb-1 ${isDarkMode ? 'text-white/90' : 'text-black/90'}`}>{comment.text || comment.content}</p>
                            <div className={`flex gap-4 text-xs font-semibold uppercase ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>
                                <span 
                                  className="cursor-pointer hover:opacity-70"
                                  onClick={() => {
                                    setReplyTo({ id: comment._id || comment.id, username: comment.user?.username || comment.username || comment.user });
                                    setNewComment(`@${comment.user?.username || comment.username || comment.user} `);
                                  }}
                                >
                                  Reply
                                </span>
                            </div>

                            {/* Show replies if any */}
                            {comment.repliesCount > 0 && (
                               <div className="mt-3 ml-2 space-y-4 pl-4">
                                  {/* If we have loaded replies or preview replies, show them */}
                                  {(loadedReplies[comment._id || comment.id] || comment.replyPreview)?.map(reply => (
                                      <div key={reply._id || reply.id} className="flex gap-2">
                                          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-black/5">
                                              <img 
                                                src={reply.user?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.user?.username || reply.user}`} 
                                                alt="avatar" 
                                                className="w-full h-full object-cover" 
                                              />
                                          </div>
                                          <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`text-[11px] font-bold ${isDarkMode ? 'text-white/50' : 'text-black/45'}`}>@{reply.user?.username || reply.user}</span>
                                                <span className={`text-[9px] font-medium ${isDarkMode ? 'text-white/30' : 'text-black/30'}`}>{formatRelativeTime(reply.createdAt)}</span>
                                              </div>
                                              <p className={`text-xs leading-relaxed mb-1 ${isDarkMode ? 'text-white/90' : 'text-black/90'}`}>{reply.text || reply.content}</p>
                                              <div className={`flex gap-4 text-[10px] font-semibold uppercase ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>
                                                  <span 
                                                    className="cursor-pointer hover:opacity-70"
                                                    onClick={() => {
                                                      setReplyTo({ id: comment._id || comment.id, username: reply.user?.username || reply.user });
                                                      setNewComment(`@${reply.user?.username || reply.user} `);
                                                    }}
                                                  >
                                                    Reply
                                                  </span>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                                  {comment.repliesCount > (loadedReplies[comment._id || comment.id]?.length || comment.replyPreview?.length || 0) && (
                                     <button 
                                        className={`text-[11px] font-bold transition-colors ${isDarkMode ? 'text-white/40 hover:text-white/60' : 'text-black/40 hover:text-black/60'}`}
                                        onClick={() => fetchReplies(comment._id || comment.id)}
                                     >
                                        View all {comment.repliesCount} replies
                                     </button>
                                  )}
                               </div>
                            )}
                        </div>
                    </div>
                  </div>
               ))
            )}
         </div>

        {!commentsDisabled ? (
          <div
            className={`p-4 border-t pb-[max(1rem,var(--safe-area-bottom))] ${
              isDarkMode ? 'border-white/5 bg-[#161823]' : 'border-black/[0.08] bg-white'
            }`}
          >
            {/* Mention Suggestions List */}
            {showSuggestions && (
              <div className={`mb-3 w-fit min-w-[180px] max-w-[260px] rounded-[16px] overflow-hidden border shadow-2xl animate-scale-in ${isDarkMode ? 'bg-[#1e202f] border-white/10' : 'bg-white border-black/10'}`}>
                {mentionSuggestions.map((suggestion) => (
                  <div 
                    key={suggestion._id}
                    className={`flex items-center gap-3 p-2.5 cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                    onClick={() => handleSelectMention(suggestion.username)}
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-black/5">
                      <img 
                        src={suggestion.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${suggestion.username}`} 
                        alt={suggestion.username} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <p className={`text-[13px] font-bold truncate ${isDarkMode ? 'text-white' : 'text-black'}`}>
                        {suggestion.fullName}
                      </p>
                      <p className={`text-[11px] truncate ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>
                        @{suggestion.username}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

              <div className="mb-3 -mx-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {quickEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className={`shrink-0 w-10 h-10 rounded-full border flex items-center justify-center text-[22px] active:scale-95 transition-all ${
                        isDarkMode
                          ? 'bg-white/5 border-white/10 hover:bg-white/10'
                          : 'bg-black/[0.04] border-black/[0.08] hover:bg-black/[0.06]'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
              </div>
              <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 border ${isDarkMode ? 'border-white/10' : 'border-black/[0.08]'}`}>
                     <img 
                        src={currentUser?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username}`} 
                        alt="my avatar" 
                        className="w-full h-full object-cover" 
                     />
                  </div>
                  <div className="flex-1 relative">
                     <input 
                        type="text" 
                        placeholder={replyTo ? `Reply to @${replyTo.username}...` : "Add comment..."}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={`w-full border rounded-full py-2.5 px-4 pr-10 text-sm outline-none transition-all ${
                          isDarkMode
                            ? 'bg-white/5 border-transparent focus:border-white/20 text-white placeholder:text-white/30'
                            : 'bg-black/[0.04] border-transparent focus:border-black/15 text-black placeholder:text-black/35'
                        }`}
                     />
                     <BiSend 
                        size={20} 
                        onClick={handleSend}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors ${
                          newComment ? "text-tiktok-red" : isDarkMode ? "text-white/20" : "text-black/20"
                        }`}
                     />
                  </div>
              </div>
          </div>
        ) : (
          <div className={`p-4 border-t text-center pb-[max(1rem,var(--safe-area-bottom))] ${
            isDarkMode ? 'border-white/5 bg-[#161823]' : 'border-black/[0.08] bg-white'
          }`}>
             <p className={`text-xs opacity-50`}>The creator has turned off comments for this video.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsSheet;
