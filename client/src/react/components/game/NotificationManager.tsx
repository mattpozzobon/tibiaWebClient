import React, { useState, useEffect, useCallback } from 'react';
import { reactNotificationManager } from '../../services/ReactNotificationManager';
import './styles/NotificationManager.scss';

export interface Notification {
  type: 'server' | 'zone' | 'cancel';
  message: string;
  color?: string;
  title?: string;
  timestamp: number;
}

const NotificationManager: React.FC = () => {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);

  // Handle notifications from the service
  const handleNotification = useCallback((notification: Notification) => {
    setCurrentNotification(notification);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setCurrentNotification(null);
    }, 3000);
  }, []);

  // Set up notification listener
  useEffect(() => {
    const unsubscribe = reactNotificationManager.onNotification(handleNotification);
    return unsubscribe;
  }, [handleNotification]);

  return (
    <>
      {currentNotification && (
        <div 
          className={`notification ${currentNotification.type}-message`}
          style={{ 
            display: 'block',
            color: currentNotification.color || '#FFFFFF'
          }}
        >
          {currentNotification.type === 'server' && currentNotification.message}
          
          {currentNotification.type === 'zone' && (
            <>
              🏰 <span className="zone-title">{currentNotification.message}</span> 🏰<br />
              <span className="zone-sub">{currentNotification.title}</span>
            </>
          )}
          
          {currentNotification.type === 'cancel' && currentNotification.message}
        </div>
      )}
    </>
  );
};

export default NotificationManager;
