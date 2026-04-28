"use client";

import { useState, useEffect } from "react";
import { User, Bell, Lock, Palette, Phone, Mail, Building, Save, Loader2, CheckCircle, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [form, setForm] = useState({
    businessName: "גנן Pro",
    ownerName: "אריאל חסין",
    phone: "",
    email: "",
    city: "",
    notifications_email: true,
    notifications_whatsapp: true,
    notifications_reminders: true,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email ?? "");
        setForm(f => ({ ...f, email: data.user!.email ?? "" }));
      }
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    // Save to localStorage for now (can be expanded to a settings table)
    localStorage.setItem("garden_settings", JSON.stringify(form));
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div dir="rtl" className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 active:bg-gray-200 active:scale-95 transition-all duration-100">
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">הגדרות</h1>
          <p className="text-sm text-gray-500 mt-0.5">ניהול פרטי עסק והעדפות מערכת</p>
        </div>
      </div>

      {/* Business Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <Building className="w-4 h-4 text-green-600" />
          </div>
          <h2 className="font-bold text-gray-900">פרטי העסק</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם העסק</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                value={form.businessName}
                onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם הבעלים</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                value={form.ownerName}
                onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
              <input
                type="tel"
                placeholder="054-1234567"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">עיר</label>
              <input
                type="text"
                placeholder="תל אביב"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="font-bold text-gray-900">חשבון</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input
              type="email"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              value={userEmail}
              disabled
            />
            <p className="text-xs text-gray-400 mt-1">לא ניתן לשינוי</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">איפוס סיסמה</label>
            <button
              onClick={async () => {
                if (!userEmail) return;
                await supabase.auth.resetPasswordForEmail(userEmail);
                alert("נשלח קישור לאיפוס סיסמה לאימייל שלך");
              }}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 px-4 py-2 rounded-xl transition-colors"
            >
              <Lock className="w-4 h-4" />
              שלח קישור לאיפוס סיסמה
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-orange-600" />
          </div>
          <h2 className="font-bold text-gray-900">התראות</h2>
        </div>
        <div className="p-6 space-y-4">
          {[
            { key: "notifications_email", label: "התראות באימייל", desc: "קבל עדכונים על לקוחות ועבודות" },
            { key: "notifications_whatsapp", label: "תזכורות וואטסאפ", desc: "שלח תזכורות ללקוחות דרך וואטסאפ" },
            { key: "notifications_reminders", label: "תזכורות עבודה", desc: "קבל תזכורת לפני כל עבודה" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, [key]: !f[key as keyof typeof f] }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  form[key as keyof typeof form] ? "bg-green-500" : "bg-gray-200"
                }`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form[key as keyof typeof form] ? "translate-x-0.5" : "translate-x-5"
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? "שומר..." : saved ? "נשמר!" : "שמור הגדרות"}
        </button>
      </div>
    </div>
  );
}
