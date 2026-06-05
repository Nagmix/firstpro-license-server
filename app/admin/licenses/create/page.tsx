"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateLicensePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    license_type: "monthly",
    max_devices: 1,
    customer_name: "",
    customer_phone: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/license/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.license);
      } else {
        setError(data.error || "حدث خطأ");
      }
    } catch {
      setError("فشل الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">إنشاء ترخيص جديد</h1>
      </div>

      {result ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-green-800">تم إنشاء الترخيص بنجاح!</h2>
          <div className="bg-white rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">مفتاح الترخيص:</span>
              <span className="font-mono font-bold text-lg text-blue-600" dir="ltr">{result.license_key as string}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">النوع:</span>
              <span>{(result.license_type as string) === "monthly" ? "شهري" : (result.license_type as string) === "yearly" ? "سنوي" : (result.license_type as string) === "trial" ? "تجريبي" : "دائم"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">الحالة:</span>
              <span>غير مفعل</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">تاريخ الانتهاء:</span>
              <span dir="ltr">{result.expires_at ? new Date(result.expires_at as string).toLocaleDateString("ar-SA") : "دائم"}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(result.license_key as string);
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
            >
              نسخ المفتاح
            </button>
            <button
              onClick={() => setResult(null)}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
            >
              إنشاء ترخيص آخر
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نوع الترخيص</label>
            <select
              value={form.license_type}
              onChange={(e) => setForm({ ...form, license_type: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="trial">تجريبي (14 يوم)</option>
              <option value="monthly">شهري (30 يوم)</option>
              <option value="yearly">سنوي (365 يوم)</option>
              <option value="lifetime">دائم (بدون انتهاء)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأقصى للأجهزة</label>
            <input
              type="number"
              min="1"
              max="10"
              value={form.max_devices}
              onChange={(e) => setForm({ ...form, max_devices: parseInt(e.target.value) || 1 })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم العميل</label>
            <input
              type="text"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="اختياري"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم هاتف العميل</label>
            <input
              type="text"
              value={form.customer_phone}
              onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="967XXXXXXXXX"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="ملاحظات إضافية..."
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "جاري الإنشاء..." : "إنشاء الترخيص"}
          </button>
        </form>
      )}
    </div>
  );
}
