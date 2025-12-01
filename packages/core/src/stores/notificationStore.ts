import { create } from 'zustand';

export type NotificationType =
  | 'reservation_reminder'
  | 'reservation_confirmed'
  | 'reservation_cancelled'
  | 'visit_thankyou'
  | 'points_earned'
  | 'points_expiring'
  | 'campaign'
  | 'system'
  | 'staff_alert';

export type NotificationChannel = 'push' | 'email' | 'sms' | 'line' | 'in_app';

export interface Notification {
  id: string;
  companyId: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipientId?: string;
  recipientType: 'customer' | 'staff' | 'store';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  readAt?: string;
  sentAt?: string;
  createdAt: string;
}

export interface NotificationPreference {
  channel: NotificationChannel;
  enabled: boolean;
  types: NotificationType[];
}

export interface UnreadCount {
  total: number;
  byType: Record<NotificationType, number>;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: UnreadCount;
  preferences: NotificationPreference[];
  isLoading: boolean;
  error: string | null;
  pushToken?: string;
  pushEnabled: boolean;
}

interface NotificationActions {
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearNotifications: () => void;
  setPreferences: (preferences: NotificationPreference[]) => void;
  updatePreference: (channel: NotificationChannel, updates: Partial<NotificationPreference>) => void;
  setPushToken: (token: string) => void;
  setPushEnabled: (enabled: boolean) => void;
  updateUnreadCount: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialUnreadCount: UnreadCount = {
  total: 0,
  byType: {
    reservation_reminder: 0,
    reservation_confirmed: 0,
    reservation_cancelled: 0,
    visit_thankyou: 0,
    points_earned: 0,
    points_expiring: 0,
    campaign: 0,
    system: 0,
    staff_alert: 0,
  },
};

const initialState: NotificationState = {
  notifications: [],
  unreadCount: initialUnreadCount,
  preferences: [],
  isLoading: false,
  error: null,
  pushToken: undefined,
  pushEnabled: false,
};

export const useNotificationStore = create<NotificationState & NotificationActions>((set, get) => ({
  ...initialState,

  setNotifications: (notifications) => {
    set({ notifications });
    get().updateUnreadCount();
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
    }));
    get().updateUnreadCount();
  },

  markAsRead: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId
          ? { ...n, readAt: new Date().toISOString() }
          : n
      ),
    }));
    get().updateUnreadCount();
  },

  markAllAsRead: () => {
    const now = new Date().toISOString();
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.readAt ? n : { ...n, readAt: now }
      ),
    }));
    get().updateUnreadCount();
  },

  deleteNotification: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
    }));
    get().updateUnreadCount();
  },

  clearNotifications: () => {
    set({ notifications: [] });
    get().updateUnreadCount();
  },

  setPreferences: (preferences) =>
    set({ preferences }),

  updatePreference: (channel, updates) =>
    set((state) => ({
      preferences: state.preferences.map((p) =>
        p.channel === channel ? { ...p, ...updates } : p
      ),
    })),

  setPushToken: (pushToken) =>
    set({ pushToken }),

  setPushEnabled: (pushEnabled) =>
    set({ pushEnabled }),

  updateUnreadCount: () => {
    const { notifications } = get();
    const unread = notifications.filter((n) => !n.readAt);

    const byType = { ...initialUnreadCount.byType };
    unread.forEach((n) => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });

    set({
      unreadCount: {
        total: unread.length,
        byType,
      },
    });
  },

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error, isLoading: false }),

  reset: () =>
    set(initialState),
}));
