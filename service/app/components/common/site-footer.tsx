import { Link } from "react-router";
import Logo from "~/components/common/logo";

export default function SiteFooter() {
  return (
    <footer className="px-6 py-16">
      <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-12 border-t border-white/10 pt-12">
        <div>
          <Logo type="logo" size={22} />
          <p className="mt-3 max-w-xs text-xs text-white/50">
            The cost attribution layer for AI shaped apps. Built by ViewEngine.
          </p>
        </div>
        <div className="flex flex-wrap gap-8 text-xs uppercase tracking-[0.16em] text-white/50">
          <a href="/#how" className="hover:text-[#FF4D00]">
            How it works
          </a>
          <a href="/#providers" className="hover:text-[#FF4D00]">
            Providers
          </a>
          <a href="/#pricing" className="hover:text-[#FF4D00]">
            Pricing
          </a>
          <Link to="/docs" className="hover:text-[#FF4D00]">
            Docs
          </Link>
          <Link to="/sign-in" className="hover:text-[#FF4D00]">
            Sign in
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl items-center justify-between text-[11px] uppercase tracking-[0.16em] text-white/30">
        <span>© 2026 ViewEngine Inc.</span>
        <span>System online · scanning</span>
      </div>
    </footer>
  );
}
