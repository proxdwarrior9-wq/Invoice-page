export function Footer() {
  return (
    <footer className="border-t border-[#14192d] bg-[#060812] py-10 px-4 sm:px-6 no-print">
      <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="max-w-lg">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#4f46e5] flex items-center justify-center text-white text-xs font-extrabold tracking-tight">
              SC
            </span>
            <span className="text-base font-bold tracking-tight text-white">
              Skyra<span className="text-[#818cf8]">Cloud</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            SkyraCloud provides Minecraft, VPS and Bot hosting in India with advanced DDoS
            protection and 24/7 support.
          </p>
        </div>

        <div className="text-xs text-slate-500 space-y-1 sm:text-right">
          <p>Mumbai &amp; Delhi Nodes · UPI / Card Billing</p>
          <p>© {new Date().getFullYear()} SkyraCloud Hosting. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
