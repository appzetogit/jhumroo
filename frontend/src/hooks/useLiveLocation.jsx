import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const useLiveLocation = () => {
  const socket = useSocket();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Only track if authenticated and socket is connected
    if (!isAuthenticated || !socket) return;

    let watchId;

    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Emit location to socket
          socket.emit('update_location', { latitude, longitude });
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000,
        }
      );
    } else {
      console.warn('Geolocation is not supported by this browser.');
    }

    return () => {
      if (watchId !== undefined && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isAuthenticated, socket]);
};

export default useLiveLocation;
