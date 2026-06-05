"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AuditEntry {
  id: string;
  action: string;
  license_id: string | null;
  device_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) { router.push("/admin/login"); return; }
    loadLogs(token);
  }, [router]);

  const loadLogs = async (token: string) => {
    try {
      const res = await fetch("/api/admin/audit-logs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
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
  };

  const getActionColor = (action: string) => {
    if (action.includes("ACTIVATED") || action.includes("UNBLOCKED")) return "bg-green-100 text-green-700";
    if (action.includes("REVOKED") || action.includes("BLOCKED")) return "bg-red-100 text-red-700";
    if (action.includes("CREATED")) return "bg-blue-100 text-blue-700";
    if (action.includes("REBIND")) return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">سجل العمليات</h1>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">العملية</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">التفاصيل</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">IP</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getActionColor(log.action)}`}>
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details).substring(0, 80) : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono" dir="ltr">{log.ip_address || "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(log.created_at).toLocaleDateString("ar-SA", {
                      year: "numeric", month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">لا توجد عمليات مسجلة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
