import { useState } from "react";
import { platformAdminLogin } from "../../api/platformAdminApi";
import { ShieldCheck, Mail, Lock, Loader2, AlertCircle } from "lucide-react";

interface Props {
  onLoginSuccess: () => void;
}

export default function PlatformAdminLogin({ onLoginSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await platformAdminLogin(email, password);
      localStorage.setItem("platformAdminToken", data.token);
      localStorage.setItem("platformAdminUser", JSON.stringify(data.user));
      onLoginSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid credentials or unauthorized access.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url('/admin-bg.jpg')` }} // Ensure the extension matches your file
    >
      {/* Dark Overlay to improve contrast against admin-bg */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />

      <div className="relative w-full max-w-md">
        {/* Glassmorphic Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          <div className="p-10">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500 rounded-2xl shadow-xl shadow-emerald-500/20 mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
                <ShieldCheck className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Platform Admin</h1>
              <p className="text-slate-500 text-sm mt-2 font-medium">Secure Terminal Access</p>
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-xl mb-6 text-xs font-bold animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Admin Identifier
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-100/50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="name@desis.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Security Code
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-slate-100/50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] disabled:opacity-70 mt-4 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Establishing Link...
                  </>
                ) : (
                  "Authorize Session"
                )}
              </button>
            </form>
          </div>

          {/* Footer Decoration */}
          <div className="bg-slate-50 py-4 px-10 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Encrypted Connection</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse delay-75" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse delay-150" />
            </div>
          </div>
        </div>
        
        <p className="text-center mt-8 text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">
          Internal Use Only • Desis Platform 2026
        </p>
      </div>
    </div>
  );
}