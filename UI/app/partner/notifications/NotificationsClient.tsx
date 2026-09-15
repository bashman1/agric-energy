"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { apiSend, apiGet } from "@/lib/api/client";
import Pagination, { usePagination } from "@/components/admin/Pagination";

interface NotificationItem {
  id: string;
  type: string | null;
  title: string | null;
  contentType: string | null;
  slug: string | null;
  actor: string | null;
  publishedAt: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string | null;
}

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    totalItems,
    paginatedItems,
  } = usePagination(notifications, 1, 10);

  const load = async () => {
    const res = await apiGet<{ data: NotificationItem[]; unreadCount: number }>("notifications", { data: [], unreadCount: 0 });
    setNotifications(res.data ?? []);
    setUnreadCount(res.unreadCount ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    setMarking(id);
    await apiSend("POST", `notifications/${id}/read`, undefined);
    setMarking(null);
    load();
  };

  const markAllRead = async () => {
    await apiSend("POST", "notifications/read-all", undefined);
    load();
  };

  const itemHref = (n: NotificationItem) => {
    if (n.contentType && n.slug) return `/${n.contentType}/${n.slug}`;
    return "/partner";
  };

  return (
    <div className="max-w-2xl">
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/partner" className="hover:text-primary-700">Dashboard</Link>
        <span className="mx-1">/</span>
        <span className="text-gray-800 font-medium">Notifications</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {notifications.length > 0 && unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-3 py-1.5 text-xs font-semibold text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50"
          >
            Mark all read
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && notifications.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">No notifications yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {paginatedItems.map((n) => (
          <div
            key={n.id}
            className={`bg-white rounded-xl border p-4 ${n.read ? "border-gray-200" : "border-primary-200 bg-primary-50/30"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${n.read ? "text-gray-700" : "text-gray-900"}`}>
                  {n.title}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {n.actor && <>By {n.actor} · </>}
                  {n.publishedAt && new Date(n.publishedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    disabled={marking === n.id}
                    className="text-xs font-semibold text-primary-700 hover:text-primary-800 disabled:opacity-50"
                  >
                    {marking === n.id ? "…" : "Mark read"}
                  </button>
                )}
                {n.contentType && n.slug && (
                  <Link
                    href={itemHref(n)}
                    className="text-xs font-semibold text-gray-600 hover:text-gray-800"
                  >
                    View
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            totalItems={totalItems}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            pageSizeOptions={[10, 25, 50, 100]}
            showPageSize={true}
          />
        </div>
      )}
    </div>
  );
}
