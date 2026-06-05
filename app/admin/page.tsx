"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DashboardStats {
  activeLicenses: number;
  totalDevices: number;
  inactiveLicenses: number;
  todayActivations: number;
  expiredLicenses: number;
  revokedLicenses: number;
}

interface AuditEntry {
  id: string;
  action: string;
  created_at: string;
  details: Record<string, unknown>;
  license_id: string | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    loadDashboard(token);
  }, [router]);

  const loadDashboard = async (token: string) => {
    try {
      // Fetch stats in parallel
      const [licensesRes, devicesRes, auditRes] = await Promise.all([
        fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        fetch("/api/admin/recent-logs", {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        Promise.resolve(null),
      ]);

      if (licensesRes?.ok) {
        const data = await licensesRes.json();
        if (data.success) {
          setStats(data.stats);
        }
      }

      if (auditRes?.ok) {
        const data = await auditRes.json();
        if (data.success) {
          setRecentLogs(data.logs || []);
        }
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">لوحة المعلومات</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="التراخيص النشطة"
          value={stats?.activeLicenses || 0}
          color="bg-green-500"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="الأجهزة المرتبطة"
          value={stats?.totalDevices || 0}
          color="bg-blue-500"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          title="تراخيص منتهية"
          value={stats?.expiredLicenses || 0}
          color="bg-yellow-500"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="تراخيص ملغاة"
          value={stats?.revokedLicenses || 0}
          color="bg-red-500"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">إجراءات سريعة</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push("/admin/licenses/create")}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إنشاء ترخيص جديد
          </button>
          <button
            onClick={() => router.push("/admin/activate")}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            تفعيل يدوي (واتساب)
          </button>
          <button
            onClick={() => router.push("/admin/licenses")}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            عرض كل التراخيص
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">آخر النشاطات</h2>
        {recentLogs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">لا توجد نشاطات بعد</p>
        ) : (
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-2 h-2 rounded-full ${
                  log.action.includes("ACTIVATED") ? "bg-green-500" :
                  log.action.includes("REVOKED") ? "bg-red-500" :
                  log.action.includes("CREATED") ? "bg-blue-500" :
                  "bg-gray-400"
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{getActionLabel(log.action)}</p>
                  <p className="text-xs text-gray-500">{formatDate(log.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, color, icon }: { title: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`${color} text-white p-3 rounded-xl`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    LICENSE_CREATED: "إنشاء ترخيص",
    LICENSE_ACTIVATED: "تفعيل ترخيص",
    LICENSE_REVOKED: "إلغاء ترخيص",
    DEVICE_REBIND: "إعادة ربط جهاز",
    DEVICE_BLOCKED: "حظر جهاز",
    DEVICE_UNBLOCKED: "إلغاء حظر جهاز",
    DEVICE_UNBOUND: "فصل جهاز",
  };
  return labels[action] || action;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}
