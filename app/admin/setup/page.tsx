"use client";

// Personal admin page — used once by the owner to bring the demo account
// online. Not linked from anywhere; you reach it manually at
// /admin/setup. Hits /api/setup-demo with a token entered locally
// (we don't ship the secret to clients).

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, CheckCircle, AlertCircle, ExternalLink, Copy, Check } from "lucide-react";

export default function AdminSetupPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function runSetup() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`/api/setup-demo?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? `HTTP ${res.status}`);
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const triggerSql = `drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();`;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={22} className="text-amber-500" />
            הקמת חשבון דמו
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            דף שירות פרטי — מקים את <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">demo@mygananpro.com</code> וממלא לו נתונים אמיתיים.
          </p>
        </div>

        {/* Step 1 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center justify-center">1</span>
            <h2 className="font-bold text-gray-900">הוסף משתנה ב-Vercel</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            לך ל-<a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-600 underline inline-flex items-center gap-0.5">Vercel Dashboard <ExternalLink size={11} /></a> → הפרויקט שלך → <strong>Settings → Environment Variables → Add New</strong>:
          </p>
          <ul className="text-sm space-y-1 mr-2 mb-3">
            <li><strong>Name:</strong> <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">CRON_SECRET</code></li>
            <li><strong>Value:</strong> כל מחרוזת שתבחר (לדוגמה: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">gnn-2026-x7k9</code>)</li>
            <li><strong>Environments:</strong> סמן את כל ה-3 (Production, Preview, Development)</li>
          </ul>
          <p className="text-sm text-gray-600">
            לחץ Save → לך ל-<strong>Deployments</strong> → 3 הנקודות ב-deploy האחרון → <strong>Redeploy</strong>.
          </p>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-3">
            ⏳ המתן לסיום ה-redeploy (~דקה) לפני שלב 2.
          </p>
        </div>

        {/* Step 2 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center justify-center">2</span>
            <h2 className="font-bold text-gray-900">הזן את המשתנה והרץ</h2>
          </div>
          <input
            type="text"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="הדבק כאן את הערך של CRON_SECRET"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 mb-3 font-mono"
            dir="ltr"
          />
          <button
            onClick={runSetup}
            disabled={loading || !token}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                מקים את הדמו...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                הקם את הדמו
              </>
            )}
          </button>
        </div>

        {/* Result */}
        {result !== null && typeof result === "object" && "ok" in (result as Record<string, unknown>) && (result as { ok: boolean }).ok && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={20} className="text-green-600" />
              <h3 className="font-bold text-green-900">הדמו פעיל!</h3>
            </div>
            <pre className="text-xs text-green-900 bg-white/60 rounded-lg p-3 overflow-x-auto" dir="ltr">{JSON.stringify(result, null, 2)}</pre>
            <Link href="/landing" className="inline-flex items-center gap-1 mt-3 text-sm font-bold text-green-700 hover:underline">
              לך ל-/landing ולחץ &quot;ראה את האפליקציה בלייב&quot; →
            </Link>
          </div>
        )}

        {/* Error — special handling for the trigger problem */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={20} className="text-red-600" />
              <h3 className="font-bold text-red-900">שגיאה</h3>
            </div>
            <p className="text-sm text-red-800 whitespace-pre-line mb-3">{error}</p>

            {/trigger|handle_new_user/i.test(error) && (
              <div className="bg-white rounded-xl border border-red-200 p-3 mt-3">
                <p className="text-xs font-bold text-gray-700 mb-2">העתק והרץ את ה-SQL הזה ב-Supabase SQL Editor, ואז נסה שוב:</p>
                <div className="relative">
                  <pre className="text-xs bg-gray-900 text-green-300 rounded-lg p-3 overflow-x-auto" dir="ltr">{triggerSql}</pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(triggerSql);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="absolute top-2 left-2 bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded text-xs flex items-center gap-1"
                  >
                    {copied ? <><Check size={11} /> הועתק</> : <><Copy size={11} /> העתק</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
