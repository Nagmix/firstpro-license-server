"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface LicenseDetail {
  id: string;
  license_key: string;
  license_type: string;
  status: string;
  expires_at: string | null;
  max_devices: number;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  notes: string | null;
}

interface Device {
  id: string;
  device_fingerprint: string;
  installation_id: string;
  first_seen_at: string;
  last_seen_at: string;
  app_version: string | null;
  os_version: string | null;
  device_model: string | null;
  is_blocked: boolean;
}

export default function LicenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [license, setLicense] = useState<LicenseDetail | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) { router.push("/admin/login"); return; }
    loadData(token);
  }, [router]);

  const loadData = async (token: string) => {
    try {
      const res = await fetch(`/api/admin/licenses/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLicense(data.license);
        setDevices(data.devices || []);
      }
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm("هل أنت متأكد من إلغاء هذا الترخيص؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    setRevoking(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/license/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ license_id: license!.id }),
      });
      const data = await res.json();
      if (data.success) {
        setLicense({ ...license!, status: "revoked" });
        setDevices(devices.map((d) => ({ ...d, is_blocked: true })));
      }
    } catch (err) {
      console.error("Revoke error:", err);
    } finally {
      setRevoking(false);
    }
  };

  const handleBlockDevice = async (deviceId: string, block: boolean) => {
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

  const handleUnbindDevice = async (deviceId: string) => {
    if (!confirm("هل أنت متأكد من فصل هذا الجهاز؟")) return;
    try {
      const token = localStorage.getItem("admin_token");
      await fetch(`/api/admin/devices/${deviceId}/unbind`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setDevices(devices.filter((d) => d.id !== deviceId));
    } catch (err) {
      console.error("Unbind error:", err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  if (!license) {
    return <div className="text-center py-12 text-gray-500">الترخيص غير موجود</div>;
  }

  const getTypeLabel = (t: string) => ({ trial: "تجريبي", monthly: "شهري", yearly: "سنوي", lifetime: "دائم" }[t] || t);
  const getStatusLabel = (s: string) => ({ active: "نشط", inactive: "غير مفعل", expired: "منتهي", revoked: "ملغى" }[s] || s);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">تفاصيل الترخيص</h1>
      </div>

      {/* License Info */}
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="مفتاح الترخيص" value={license.license_key} mono dir="ltr" />
          <InfoRow label="النوع" value={getTypeLabel(license.license_type)} />
          <InfoRow label="الحالة" value={getStatusLabel(license.status)} />
          <InfoRow label="الحد الأقصى للأجهزة" value={String(license.max_devices)} />
          <InfoRow label="العميل" value={license.customer_name || "—"} />
          <InfoRow label="الهاتف" value={license.customer_phone || "—"} dir="ltr" />
          <InfoRow label="تاريخ الانتهاء" value={license.expires_at ? new Date(license.expires_at).toLocaleDateString("ar-SA") : "دائم"} />
          <InfoRow label="تاريخ الإنشاء" value={new Date(license.created_at).toLocaleDateString("ar-SA")} />
        </div>
        {license.notes && (
          <div className="bg-gray-50 p-3 rounded-xl">
            <span className="text-xs text-gray-500">ملاحظات:</span>
            <p className="text-sm text-gray-700 mt-1">{license.notes}</p>
          </div>
        )}
        {license.status !== "revoked" && (
          <button
            onClick={handleRevoke}
            disabled={revoking}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50"
          >
            {revoking ? "جاري الإلغاء..." : "إلغاء الترخيص"}
          </button>
        )}
      </div>

      {/* Devices */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">الأجهزة المرتبطة ({devices.length})</h2>
        {devices.length === 0 ? (
          <p className="text-gray-500 text-center py-8">لا توجد أجهزة مرتبطة</p>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div key={device.id} className={`p-4 rounded-xl border ${device.is_blocked ? "border-red-200 bg-red-50" : "border-gray-200"}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-mono text-gray-600" dir="ltr">{device.device_fingerprint.substring(0, 16)}...</p>
                    <p className="text-xs text-gray-500">{device.device_model || "غير معروف"}</p>
                    <p className="text-xs text-gray-500">Android {device.os_version || "—"} | App {device.app_version || "—"}</p>
                    <p className="text-xs text-gray-500">آخر ظهور: {new Date(device.last_seen_at).toLocaleDateString("ar-SA")}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBlockDevice(device.id, !device.is_blocked)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        device.is_blocked
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                      }`}
                    >
                      {device.is_blocked ? "إلغاء الحظر" : "حظر"}
                    </button>
                    <button
                      onClick={() => handleUnbindDevice(device.id)}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      فصل
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, dir }: { label: string; value: string; mono?: boolean; dir?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-sm font-medium text-gray-900 ${mono ? "font-mono" : ""}`} dir={dir}>{value}</p>
    </div>
  );
}
