import { Link } from "react-router";
import { ArrowUpLeft } from "lucide-react";
import Logo from "~/components/common/logo";
import NavAuthActions from "~/components/common/nav-auth-actions";

export default function DocsHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-white/10 bg-black/80 px-6 py-4 backdrop-blur-md sm:px-8">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center">
          <Logo type="logo" size={20} />
        </Link>
        <span className="h-5 w-px bg-white/15" />
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
          Docs
        </span>
      </div>
      <div className="flex items-center gap-5">
        <Link
          to="/"
          className="hidden items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-white/60 transition-colors hover:text-[#FF4D00] sm:flex"
        >
          <ArrowUpLeft className="h-3.5 w-3.5" />
          Back to site
        </Link>
        <NavAuthActions />
      </div>
    </header>
  );
}
