"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Device {
  id: string;
  device_fingerprint: string;
  installation_id: string;
  license_id: string;
  first_seen_at: string;
  last_seen_at: string;
  app_version: string | null;
  os_version: string | null;
  device_model: string | null;
  is_blocked: boolean;
  licenses?: { license_key: string; license_type: string; customer_name: string | null } | null;
}

export default function DevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) { router.push("/admin/login"); return; }
    loadDevices(token);
  }, [router]);

  const loadDevices = async (token: string) => {
    try {
      const res = await fetch("/api/admin/devices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices || []);
      }
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (deviceId: string, block: boolean) => {
    try {
      const token = localStorage.getItem("admin_token");
      await fetch(`/api/admin/devices/${deviceId}/block`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ blocked: block }),
      });
      setDevices(devices.map((d) => d.id === deviceId ? { ...d, is_blocked: block } : d));
    } catch (err) {
      console.error("Block error:", err);
    }
  };

  const filteredDevices = devices.filter((d) => {
    if (!search) return true;
    return d.device_fingerprint.toLowerCase().includes(search.toLowerCase()) ||
      d.device_model?.toLowerCase().includes(search.toLowerCase()) ||
      d.licenses?.license_key?.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">الأجهزة</h1>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <input
          type="text"
          placeholder="بحث بالبصمة أو الموديل أو مفتاح الترخيص..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">الجهاز</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">الموديل</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">الترخيص</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">آخر ظهور</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">الحالة</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDevices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono" dir="ltr">{device.device_fingerprint.substring(0, 20)}...</td>
                  <td className="px-6 py-4 text-sm">{device.device_model || "—"}</td>
                  <td className="px-6 py-4 text-sm font-mono text-blue-600" dir="ltr">{device.licenses?.license_key || "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(device.last_seen_at).toLocaleDateString("ar-SA")}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${device.is_blocked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {device.is_blocked ? "محظور" : "نشط"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleBlock(device.id, !device.is_blocked)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        device.is_blocked
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                      }`}
                    >
                      {device.is_blocked ? "إلغاء الحظر" : "حظر"}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredDevices.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">لا توجد أجهزة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
