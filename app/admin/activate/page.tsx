"use client";

import { useState } from "react";

export default function ActivatePage() {
  const [deviceCode, setDeviceCode] = useState("");
  const [licenseType, setLicenseType] = useState("monthly");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("admin_token");

      // Step 1: Generate license
      const genRes = await fetch("/api/license/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          license_type: licenseType,
          customer_name: customerName,
          customer_phone: customerPhone,
          notes: `تفعيل يدوي عبر واتساب - كود الجهاز: ${deviceCode}`,
        }),
      });

      const genData = await genRes.json();

      if (!genData.success) {
        setError(genData.error || "فشل إنشاء الترخيص");
        return;
      }

      // The device code is actually the device fingerprint sent by the user via WhatsApp
      // In manual activation, admin enters the fingerprint directly
      setResult(genData.license);
    } catch {
      setError("فشل الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">تفعيل يدوي (واتساب)</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <h3 className="font-medium text-blue-800 mb-2">كيفية التفعيل اليدوي:</h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>المستخدم يرسل كود الجهاز عبر واتساب</li>
          <li>أدخل كود الجهاز ونوع الترخيص وبيانات العميل</li>
          <li>اضغط &quot;إنشاء ونسخ المفتاح&quot;</li>
          <li>أرسل المفتاح للمستخدم عبر واتساب</li>
          <li>المستخدم يدخل المفتاح في التطبيق</li>
        </ol>
      </div>

      {result ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-green-800">تم إنشاء المفتاح بنجاح!</h2>
          <div className="bg-white rounded-xl p-6 text-center">
            <p className="text-sm text-gray-500 mb-2">مفتاح الترخيص</p>
            <p className="text-3xl font-mono font-bold text-blue-600 tracking-wider" dir="ltr">{result.license_key as string}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(result.license_key as string);
                // Open WhatsApp with the key
                const phone = customerPhone.replace(/^0/, "967");
                const msg = encodeURIComponent(`مرحباً، مفتاح الترخيص الخاص بك هو:\n${result.license_key}\n\nأدخل المفتاح في التطبيق لتفعيل النسخة الكاملة.`);
                window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
              }}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.122 1.52 5.86L0 24l6.336-1.652A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.98 0-3.82-.558-5.39-1.52l-.386-.23-3.99 1.04 1.063-3.895-.252-.4A9.718 9.718 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/></svg>
              إرسال عبر واتساب
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(result.license_key as string); }}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
            >
              نسخ المفتاح
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleActivate} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كود الجهاز (من واتساب)</label>
            <input
              type="text"
              value={deviceCode}
              onChange={(e) => setDeviceCode(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="بصمة الجهاز أو الكود المرسل"
              dir="ltr"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نوع الترخيص</label>
            <select
              value={licenseType}
              onChange={(e) => setLicenseType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="trial">تجريبي (14 يوم)</option>
              <option value="monthly">شهري (30 يوم)</option>
              <option value="yearly">سنوي (365 يوم)</option>
              <option value="lifetime">دائم</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم العميل</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="اسم العميل"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم واتساب العميل</label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="967XXXXXXXXX"
              dir="ltr"
            />
          </div>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? "جاري الإنشاء..." : "إنشاء ونسخ المفتاح"}
          </button>
        </form>
      )}
    </div>
  );
}
