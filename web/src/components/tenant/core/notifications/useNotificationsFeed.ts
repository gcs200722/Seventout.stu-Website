"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
} from "@/lib/notifications-api";

type UseNotificationsFeedParams = {
  enabled: boolean;
  page?: number;
  limit?: number;
  readFilter?: "all" | "read" | "unread";
  pollIntervalMs?: number;
};

export function useNotificationsFeed({
  enabled,
  page = 1,
  limit = 10,
  readFilter = "all",
  pollIntervalMs = 15000,
}: UseNotificationsFeedParams) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRead =
    readFilter === "all" ? undefined : readFilter === "read" ? true : false;

  const loadNotifications = useCallback(
    async (showLoading = true) => {
      if (!enabled) {
        return;
      }
      try {
        if (showLoading) {
          setLoading(true);
        }
        setError(null);
        const response = await getNotifications({
          page,
          limit,
          is_read: isRead,
        });
        setItems(response.items);
        setTotal(response.pagination.total);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Không tải được thông báo.",
        );
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [enabled, isRead, limit, page],
  );

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    void loadNotifications(true);
  }, [enabled, loadNotifications]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const interval = window.setInterval(() => {
      void loadNotifications(false);
    }, pollIntervalMs);
    const onFocus = () => {
      void loadNotifications(false);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, loadNotifications, pollIntervalMs]);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.isRead).length,
    [items],
  );

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        setActionLoading(true);
        setError(null);
        await markNotificationAsRead(id);
        await loadNotifications(false);
      } finally {
        setActionLoading(false);
      }
    },
    [loadNotifications],
  );

  const markAllAsRead = useCallback(async () => {
    try {
      setActionLoading(true);
      setError(null);
      const updated = await markAllNotificationsAsRead();
      await loadNotifications(false);
      return updated;
    } finally {
      setActionLoading(false);
    }
  }, [loadNotifications]);

  return {
    items,
    total,
    loading,
    actionLoading,
    error,
    unreadCount,
    reload: loadNotifications,
    markAsRead,
    markAllAsRead,
  };
}
