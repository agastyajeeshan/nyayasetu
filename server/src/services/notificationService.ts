import crypto from 'crypto';
import { db } from '../db/database.js';
import { NotificationItem, UserRole } from '../types/index.js';

export class NotificationService {
  /**
   * Retrieves notifications filtered for user / role
   */
  public static getNotifications(userId?: string, role?: UserRole): NotificationItem[] {
    return db.notifications
      .filter(n => {
        if (n.recipientUserId && userId && n.recipientUserId !== userId) return false;
        if (n.recipientRole && role && n.recipientRole !== role && role !== 'admin') return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Counts unread notifications
   */
  public static getUnreadCount(userId?: string, role?: UserRole): number {
    return this.getNotifications(userId, role).filter(n => !n.isRead).length;
  }

  /**
   * Mark single notification as read
   */
  public static markAsRead(id: string): boolean {
    const n = db.notifications.find(item => item.id === id);
    if (!n) return false;
    n.isRead = true;
    db.save();
    return true;
  }

  /**
   * Mark all notifications as read for user
   */
  public static markAllAsRead(userId?: string, role?: UserRole): void {
    const list = this.getNotifications(userId, role);
    list.forEach(n => {
      n.isRead = true;
    });
    db.save();
  }

  /**
   * Emit new notification
   */
  public static createNotification(data: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>): NotificationItem {
    const newNotif: NotificationItem = {
      id: crypto.randomUUID(),
      ...data,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    db.notifications.unshift(newNotif);
    // Keep max 200 notifications
    if (db.notifications.length > 200) {
      db.notifications.splice(200);
    }
    db.save();

    return newNotif;
  }
}
