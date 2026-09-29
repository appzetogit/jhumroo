import { useState, useEffect, useRef, useCallback } from 'react';
import liveService from '../services/liveService';

/**
 * Custom hook for WebRTC Live Streaming (Broadcaster & Viewer)
 * Supports dynamic Coturn TURN/STUN ICE servers and real-time P2P/SFU streaming
 */
export const useWebRTCLive = ({
  isBroadcaster = false,
  liveId = null,
  localStream = null,
  socket = null
}) => {
  const [iceServers, setIceServers] = useState([
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
  ]);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // idle, connecting, connected, disconnected, failed
  const [viewersCount, setViewersCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [isLiveEnded, setIsLiveEnded] = useState(false);
  const [endStats, setEndStats] = useState(null);

  // References
  const peerConnectionsRef = useRef(new Map()); // viewerSocketId -> RTCPeerConnection (Broadcaster)
  const viewerPcRef = useRef(null); // RTCPeerConnection (Viewer)
  const iceCandidateQueue = useRef([]);
  const localStreamRef = useRef(localStream);
  const iceServersRef = useRef(iceServers);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    iceServersRef.current = iceServers;
  }, [iceServers]);

  // Fetch STUN/TURN ICE servers on mount
  useEffect(() => {
    let isMounted = true;
    const fetchIce = async () => {
      try {
        const res = await liveService.getIceServers();
        if (isMounted && res?.iceServers?.length > 0) {
          setIceServers(res.iceServers);
          console.log('[WebRTC] ICE Servers loaded:', res.iceServers.length);
        }
      } catch (err) {
        console.warn('[WebRTC] Using fallback Google STUN servers:', err);
      }
    };
    fetchIce();
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * BROADCASTER LOGIC: Handle new viewer joining and establish WebRTC connection
   */
  const handleViewerJoined = useCallback(
    async ({ viewerSocketId, user }) => {
      if (!socket || !viewerSocketId) return;
      console.log(`[WebRTC Broadcaster] New viewer joined: ${viewerSocketId} (${user?.username || 'user'})`);

      try {
        // Close existing connection if any
        if (peerConnectionsRef.current.has(viewerSocketId)) {
          peerConnectionsRef.current.get(viewerSocketId).close();
          peerConnectionsRef.current.delete(viewerSocketId);
        }

        const pc = new RTCPeerConnection({
          iceServers: iceServersRef.current,
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require'
        });

        // Add local tracks (Canvas video + Mic audio)
        const currentStream = localStreamRef.current;
        if (currentStream) {
          currentStream.getTracks().forEach((track) => {
            pc.addTrack(track, currentStream);
          });
        }

        // ICE candidate handling
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('live_ice_candidate', {
              targetSocketId: viewerSocketId,
              candidate: event.candidate,
              liveId
            });
          }
        };

        pc.onconnectionstatechange = () => {
          console.log(`[WebRTC Broadcaster] Viewer ${viewerSocketId} connection state:`, pc.connectionState);
          if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
            peerConnectionsRef.current.delete(viewerSocketId);
          }
        };

        // Create and send SDP offer
        const offer = await pc.createOffer({
          offerToReceiveAudio: false,
          offerToReceiveVideo: false
        });
        await pc.setLocalDescription(offer);

        socket.emit('live_offer', {
          toViewerSocketId: viewerSocketId,
          sdp: pc.localDescription,
          liveId
        });

        peerConnectionsRef.current.set(viewerSocketId, pc);
      } catch (err) {
        console.error(`[WebRTC Broadcaster] Error offering to viewer ${viewerSocketId}:`, err);
      }
    },
    [socket, liveId]
  );

  /**
   * Update video track for all viewers if local stream tracks change (e.g. effect switch or camera flip)
   */
  const replaceLiveTrack = useCallback((newVideoTrack) => {
    if (!newVideoTrack) return;
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      localStreamRef.current = new MediaStream([newVideoTrack, ...audioTracks]);
    }
    peerConnectionsRef.current.forEach((pc) => {
      const senders = pc.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (videoSender) {
        videoSender.replaceTrack(newVideoTrack).catch((err) => {
          console.warn('[WebRTC] replaceTrack warning:', err);
        });
      }
    });
  }, []);

  /**
   * VIEWER LOGIC: Handle offer received from Broadcaster
   */
  const handleLiveOfferReceived = useCallback(
    async ({ fromBroadcasterSocketId, sdp }) => {
      if (!socket || !sdp) return;
      console.log('[WebRTC Viewer] Received live offer from broadcaster:', fromBroadcasterSocketId);
      setConnectionStatus('connecting');

      try {
        if (viewerPcRef.current) {
          viewerPcRef.current.close();
          viewerPcRef.current = null;
        }

        const pc = new RTCPeerConnection({
          iceServers: iceServersRef.current,
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require'
        });
        viewerPcRef.current = pc;

        // Remote track received!
        pc.ontrack = (event) => {
          console.log('[WebRTC Viewer] Remote track received:', event.track.kind);
          if (event.streams && event.streams[0]) {
            setRemoteStream(new MediaStream(event.streams[0].getTracks()));
            setConnectionStatus('connected');
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('live_ice_candidate', {
              targetSocketId: fromBroadcasterSocketId,
              candidate: event.candidate,
              liveId
            });
          }
        };

        pc.onconnectionstatechange = () => {
          console.log('[WebRTC Viewer] Connection state:', pc.connectionState);
          setConnectionStatus(pc.connectionState);
        };

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        // Process any queued ICE candidates
        while (iceCandidateQueue.current.length > 0) {
          const cand = iceCandidateQueue.current.shift();
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('live_answer', {
          toBroadcasterSocketId: fromBroadcasterSocketId,
          sdp: pc.localDescription,
          liveId
        });
      } catch (err) {
        console.error('[WebRTC Viewer] Error handling offer:', err);
        setConnectionStatus('failed');
      }
    },
    [socket, liveId]
  );

  /**
   * Connect Socket Events for Broadcaster and Viewer
   */
  useEffect(() => {
    if (!socket || !liveId) return;

    if (isBroadcaster) {
      // Register broadcaster
      socket.emit('broadcaster_register', { liveId });

      socket.on('viewer_joined_stream', handleViewerJoined);

      socket.on('live_answer', async ({ fromViewerSocketId, sdp }) => {
        const pc = peerConnectionsRef.current.get(fromViewerSocketId);
        if (pc && sdp) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            console.log(`[WebRTC Broadcaster] Set remote description for viewer ${fromViewerSocketId}`);
          } catch (err) {
            console.error('[WebRTC Broadcaster] Error setting remote description:', err);
          }
        }
      });

      socket.on('live_ice_candidate', async ({ fromSocketId, candidate }) => {
        const pc = peerConnectionsRef.current.get(fromSocketId);
        if (pc && candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('[WebRTC Broadcaster] Error adding ICE candidate:', err);
          }
        }
      });

      socket.on('viewer_left_stream', ({ viewerSocketId }) => {
        const pc = peerConnectionsRef.current.get(viewerSocketId);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(viewerSocketId);
        }
      });
    } else {
      // Join as viewer
      socket.emit('join_live_room', { liveId });

      socket.on('live_offer', handleLiveOfferReceived);

      socket.on('live_ice_candidate', async ({ candidate }) => {
        if (!candidate) return;
        if (viewerPcRef.current && viewerPcRef.current.remoteDescription) {
          try {
            await viewerPcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn('[WebRTC Viewer] Candidate addition warning:', err);
          }
        } else {
          iceCandidateQueue.current.push(candidate);
        }
      });
    }

    // Shared listeners for both Broadcaster and Viewer
    socket.on('live_viewers_count', ({ count }) => {
      setViewersCount(count || 0);
    });

    socket.on('new_live_comment', (comment) => {
      setComments((prev) => [...prev.slice(-100), comment]); // keep last 100
    });

    socket.on('new_live_reaction', (reaction) => {
      setReactions((prev) => [...prev.slice(-30), reaction]); // keep last 30 for animation
    });

    socket.on('user_joined_live', ({ user }) => {
      // Optional system toast message in chat
      if (user?.username) {
        setComments((prev) => [
          ...prev.slice(-100),
          {
            _id: `sys-${Date.now()}-${Math.random()}`,
            isSystem: true,
            text: `${user.username} joined the live`,
            createdAt: new Date().toISOString()
          }
        ]);
      }
    });

    socket.on('live_stream_ended', (data) => {
      console.log('[Live] Stream ended:', data);
      setIsLiveEnded(true);
      setEndStats(data?.stats || null);
      if (viewerPcRef.current) {
        viewerPcRef.current.close();
        viewerPcRef.current = null;
      }
      setRemoteStream(null);
    });

    return () => {
      if (isBroadcaster) {
        socket.off('viewer_joined_stream', handleViewerJoined);
        socket.off('live_answer');
        socket.off('live_ice_candidate');
        socket.off('viewer_left_stream');
        peerConnectionsRef.current.forEach((pc) => pc.close());
        peerConnectionsRef.current.clear();
      } else {
        socket.emit('leave_live_room', { liveId });
        socket.off('live_offer', handleLiveOfferReceived);
        socket.off('live_ice_candidate');
        if (viewerPcRef.current) {
          viewerPcRef.current.close();
          viewerPcRef.current = null;
        }
      }

      socket.off('live_viewers_count');
      socket.off('new_live_comment');
      socket.off('new_live_reaction');
      socket.off('user_joined_live');
      socket.off('live_stream_ended');
    };
  }, [socket, liveId, isBroadcaster, handleViewerJoined, handleLiveOfferReceived]);

  /**
   * Send comment
   */
  const sendComment = useCallback(
    (text) => {
      if (!socket || !liveId || !text?.trim()) return;
      socket.emit('send_live_comment', { liveId, text: text.trim() });
    },
    [socket, liveId]
  );

  /**
   * Send reaction
   */
  const sendReaction = useCallback(
    (emoji = '❤️') => {
      if (!socket || !liveId) return;
      socket.emit('send_live_reaction', { liveId, emoji });
    },
    [socket, liveId]
  );

  return {
    remoteStream,
    connectionStatus,
    viewersCount,
    comments,
    reactions,
    isLiveEnded,
    endStats,
    sendComment,
    sendReaction,
    replaceLiveTrack
  };
};

export default useWebRTCLive;
