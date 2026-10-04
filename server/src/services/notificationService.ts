import crypto from 'crypto';
import { NotificationRepository } from '../repositories/notificationRepository.js';
import { NotificationItem, UserRole } from '../types/index.js';

export class NotificationService {
  /**
   * Retrieves notifications filtered for user / role from PostgreSQL
   */
  public static async getNotifications(userId?: string, role?: UserRole): Promise<NotificationItem[]> {
    return await NotificationRepository.findByUserId(userId || '', role);
  }

  /**
   * Counts unread notifications in PostgreSQL
   */
  public static async getUnreadCount(userId?: string, role?: UserRole): Promise<number> {
    return await NotificationRepository.countUnread(userId, role);
  }

  /**
   * Mark single notification as read in PostgreSQL
   */
  public static async markAsRead(id: string): Promise<boolean> {
    return await NotificationRepository.markAsRead(id);
  }

  /**
   * Mark all notifications as read for user in PostgreSQL
   */
  public static async markAllAsRead(userId?: string, role?: UserRole): Promise<void> {
    await NotificationRepository.markAllAsReadForUser(userId, role);
  }

  /**
   * Emit new notification in PostgreSQL
   */
  public static async createNotification(data: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>): Promise<NotificationItem> {
    const newNotif: NotificationItem = {
      id: crypto.randomUUID(),
      ...data,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    await NotificationRepository.create(newNotif);
    return newNotif;
  }
}
