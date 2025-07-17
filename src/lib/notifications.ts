
'use server';

import { pb } from './pocketbase';
import { getSetting } from '@/app/actions';

interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  userIds?: string[];
}

const WEBHOOK_SETTING_KEY = 'webhook_url';
const DEFAULT_WEBHOOK_URL = 'https://n8n.eulab.cloud/webhook/pdg-service';

async function getWebhookUrl(): Promise<string> {
  try {
    const setting = await getSetting(WEBHOOK_SETTING_KEY);
    return setting?.value || DEFAULT_WEBHOOK_URL;
  } catch (error) {
    console.error("Failed to get webhook URL from settings, using default:", error);
    return DEFAULT_WEBHOOK_URL;
  }
}

export async function sendNotification(payload: NotificationPayload) {
  const { userIds = [], ...notificationData } = payload;

  // 1. Send to webhook
  try {
    const webhookUrl = await getWebhookUrl();
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificationData),
    });
  } catch (error) {
    console.error('Failed to send webhook notification:', error);
  }

  // 2. Save in-app notification to PocketBase for each specified user
  if (userIds.length > 0) {
    const promises = userIds.map(userId => {
      const dbPayload = {
        user: userId,
        type: notificationData.type,
        title: notificationData.title,
        body: notificationData.body,
        data: JSON.stringify(notificationData.data), // Store complex data as JSON string
        read: false,
      };
      return pb.collection('pdg_notifications').create(dbPayload);
    });

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to save in-app notifications:', error);
    }
  }
}
