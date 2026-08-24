import { useEffect, useRef } from 'react';
import { notificationService } from '@/services';
import type { AppNotification } from '@/types';

export function useBrowserNotifications(isAuthenticated: boolean = true) {
  const previousNotificationsRef = useRef<AppNotification[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !('Notification' in window)) return;

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const unsubscribe = notificationService.subscribeToUserNotifications((notifications) => {
      // Find new notifications
      const prevIds = new Set(previousNotificationsRef.current.map(n => n.id));
      const newNotifications = notifications.filter(n => !prevIds.has(n.id));

      if (Notification.permission === 'granted' && previousNotificationsRef.current.length > 0) {
        newNotifications.forEach(n => {
          // Only show unread notifications that were created in the last 5 minutes to avoid spamming on reload
          const isRecent = new Date(n.timestamp).getTime() > Date.now() - 5 * 60 * 1000;
          if (!n.read && isRecent) {
            new Notification(n.title, {
              body: n.body,
              icon: '/images/logo.jpg', // Assuming this exists
            });
          }
        });
      }

      previousNotificationsRef.current = notifications;
    });

    return () => unsubscribe();
  }, [isAuthenticated]);
}
