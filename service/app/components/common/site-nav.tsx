import { useEffect, useState } from "react";
import { Link } from "react-router";

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
      <Link to="/" className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full bg-[#FF4D00]" />
        <span className="font-display text-lg font-bold uppercase tracking-tight">
          ve-track
        </span>
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
      <div className="flex items-center gap-3">
        <Link
          to="/sign-in"
          className="text-xs uppercase tracking-[0.18em] text-white/70 transition-colors hover:text-white"
        >
          Sign in
        </Link>
        <Link
          to="/sign-up"
          className="border border-white bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black transition-colors hover:border-[#FF4D00] hover:bg-[#FF4D00] hover:text-black"
        >
          Get started
        </Link>
      </div>
    </nav>
  );
}
