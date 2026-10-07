"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth/actions";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      // The session store has emitted by now, so the guard on /admin
      // will let the navigation through.
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-shade-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-700 flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
            AE
          </div>
          <h1 className="text-white text-xl font-bold">Agri-Energy Desk</h1>
          <p className="text-shade-400 text-sm mt-1">Admin Portal</p>
        </div>

        {/* Form */}
        <div className="bg-shade-900 rounded-2xl border border-shade-800 p-6">
          <h2 className="text-white font-semibold mb-5">Sign In</h2>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-3 py-2.5 text-sm mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-semibold text-shade-400 mb-1">Email or username</label>
              <input
                id="admin-email"
                /* See the partner login form — the API takes either. */
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-3 py-2.5 bg-shade-800 border border-shade-700 rounded-lg text-white text-sm placeholder-shade-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                placeholder="email@example.com"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-xs font-semibold text-shade-400 mb-1">Password</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2.5 bg-shade-800 border border-shade-700 rounded-lg text-white text-sm placeholder-shade-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary-700 text-white font-bold rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-shade-400 text-xs mt-6">
          <Link href="/" className="hover:text-white transition-colors">← Back to Public Site</Link>
        </p>
      </div>
    </div>
  );
}
