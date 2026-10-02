import { Router, Response } from 'express';
import { NotificationService } from '../services/notificationService.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get notifications for authenticated user
router.get('/', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const notifications = NotificationService.getNotifications(req.user!.id, req.user!.role);
  const unreadCount = NotificationService.getUnreadCount(req.user!.id, req.user!.role);
  res.json({ notifications, unreadCount });
});

// Mark single notification as read
router.patch('/:id/read', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const success = NotificationService.markAsRead(req.params.id as string);
  if (!success) {
    res.status(404).json({ error: 'Notification not found.' });
    return;
  }
  res.json({ success: true });
});

// Mark all notifications as read
router.post('/read-all', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  NotificationService.markAllAsRead(req.user!.id, req.user!.role);
  res.json({ success: true });
});

export default router;
