"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface License {
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

export default function LicensesPage() {
  const router = useRouter();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) { router.push("/admin/login"); return; }
    loadLicenses(token);
  }, [router]);

  const loadLicenses = async (token: string) => {
    try {
      const res = await fetch("/api/admin/licenses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLicenses(data.licenses || []);
      }
    } catch (err) {
      console.error("Load licenses error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLicenses = licenses.filter((lic) => {
    const matchSearch = search
      ? lic.license_key.toLowerCase().includes(search.toLowerCase()) ||
        (lic.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (lic.customer_phone || "").includes(search)
      : true;
    const matchStatus = filterStatus === "all" || lic.status === filterStatus;
    const matchType = filterType === "all" || lic.license_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      inactive: "bg-gray-100 text-gray-700",
      expired: "bg-yellow-100 text-yellow-700",
      revoked: "bg-red-100 text-red-700",
    };
    const labels: Record<string, string> = {
      active: "نشط",
      inactive: "غير مفعل",
      expired: "منتهي",
      revoked: "ملغى",
    };
    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      trial: "تجريبي",
      monthly: "شهري",
      yearly: "سنوي",
      lifetime: "دائم",
    };
    return labels[type] || type;
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">التراخيص</h1>
        <Link
          href="/admin/licenses/create"
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          إنشاء ترخيص
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="بحث بالمفتاح أو الاسم أو الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير مفعل</option>
          <option value="expired">منتهي</option>
          <option value="revoked">ملغى</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">كل الأنواع</option>
          <option value="trial">تجريبي</option>
          <option value="monthly">شهري</option>
          <option value="yearly">سنوي</option>
          <option value="lifetime">دائم</option>
        </select>
      </div>

      {/* Licenses Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">مفتاح الترخيص</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">النوع</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">الحالة</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">العميل</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">تاريخ الانتهاء</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">الأجهزة</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLicenses.map((lic) => (
                <tr key={lic.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/admin/licenses/${lic.id}`)}>
                  <td className="px-6 py-4 text-sm font-mono font-medium text-blue-600" dir="ltr">{lic.license_key}</td>
                  <td className="px-6 py-4 text-sm">{getTypeLabel(lic.license_type)}</td>
                  <td className="px-6 py-4 text-sm">{getStatusBadge(lic.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{lic.customer_name || "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600" dir="ltr">
                    {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString("ar-SA") : "دائم"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{lic.max_devices}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(lic.created_at).toLocaleDateString("ar-SA")}</td>
                </tr>
              ))}
              {filteredLicenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    لا توجد تراخيص
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
