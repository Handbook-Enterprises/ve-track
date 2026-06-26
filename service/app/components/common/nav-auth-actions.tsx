import { Link } from "react-router";
import { SignedIn, SignedOut } from "@clerk/react-router";

export default function NavAuthActions() {
  return (
    <div className="flex items-center gap-3">
      <SignedIn>
        <Link
          to="/dashboard"
          className="border border-white bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black transition-colors hover:border-[#FF4D00] hover:bg-[#FF4D00] hover:text-black"
        >
          Dashboard
        </Link>
      </SignedIn>
      <SignedOut>
        <Link
          to="/sign-in"
          className="text-xs uppercase tracking-[0.12em] text-white/70 transition-colors hover:text-white"
        >
          Sign in
        </Link>
        <Link
          to="/sign-up"
          className="border border-white bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black transition-colors hover:border-[#FF4D00] hover:bg-[#FF4D00] hover:text-black"
        >
          Get started
        </Link>
      </SignedOut>
    </div>
  );
}
