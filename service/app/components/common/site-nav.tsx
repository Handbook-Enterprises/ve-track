import { useEffect, useState } from "react";
import { Link } from "react-router";
import Logo from "~/components/common/logo";
import NavAuthActions from "~/components/common/nav-auth-actions";

const LINKS: Array<[string, string]> = [
  ["/#how", "How it works"],
  ["/#providers", "Providers"],
  ["/#pricing", "Pricing"],
  ["/docs", "Docs"],
];

export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b px-8 py-5 backdrop-blur-md transition-colors ${
        scrolled ? "border-white/10 bg-black/80" : "border-transparent bg-transparent"
      }`}
    >
      <Link to="/" className="flex items-center">
        <Logo type="logo" size={20} />
      </Link>
      <div className="hidden items-center gap-10 md:flex">
        {LINKS.map(([href, label]) =>
          href.startsWith("/docs") ? (
            <Link
              key={href}
              to={href}
              className="text-xs uppercase tracking-[0.18em] text-white/60 transition-colors hover:text-[#FF4D00]"
            >
              {label}
            </Link>
          ) : (
            <a
              key={href}
              href={href}
              className="text-xs uppercase tracking-[0.18em] text-white/60 transition-colors hover:text-[#FF4D00]"
            >
              {label}
            </a>
          ),
        )}
      </div>
      <NavAuthActions />
    </nav>
  );
}
