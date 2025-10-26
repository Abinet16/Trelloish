import { query } from "../db";
import { Notification, NotificationStatus, RelatedEntityType } from "../models";
import { auditLogService } from "../logging/auditLogService";

export const notificationService = {
  async createNotification(
    recipientId: string,
    title: string,
    body: string,
    relatedEntityId: string | null = null,
    relatedEntityType: RelatedEntityType | null = null
  ): Promise<Notification> {
    const result = await query(
      `INSERT INTO notifications (recipient_id, title, body, related_entity_id, related_entity_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [recipientId, title, body, relatedEntityId, relatedEntityType]
    );
    const newNotification: Notification = result.rows[0];
    await auditLogService.info("NOTIFICATION_CREATED", recipientId, undefined, {
      notificationId: newNotification.id,
      title,
      relatedEntityId,
    });
    return newNotification;
  },

  async markNotificationAsSeen(
    userId: string,
    notificationId: string
  ): Promise<Notification> {
    const result = await query(
      `UPDATE notifications SET status = 'SEEN', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND recipient_id = $2 RETURNING *`,
      [notificationId, userId]
    );
    if (result.rows.length === 0) {
      throw new Error("Notification not found or not authorized to update.");
    }
    await auditLogService.activity("NOTIFICATION_SEEN", userId, {
      notificationId,
    });
    return result.rows[0];
  },

  async getNotificationsForUser(
    userId: string,
    status?: NotificationStatus
  ): Promise<Notification[]> {
    const params: any[] = [userId];
    let queryText = "SELECT * FROM notifications WHERE recipient_id = $1";
    if (status) {
      queryText += " AND status = $2";
      params.push(status);
    }
    queryText += " ORDER BY created_at DESC";
    const result = await query(queryText, params);
    return result.rows;
  },
};
