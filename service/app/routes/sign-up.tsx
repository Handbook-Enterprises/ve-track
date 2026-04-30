import { SignUp } from "@clerk/react-router";
import { Link } from "react-router";
import Logo from "~/components/common/logo";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-16 text-white">
      <div className="w-full max-w-md space-y-8">
        <Link to="/" className="flex items-center gap-3">
          <Logo />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#FF4D00]">
            Sign up
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-tight">
            Start free.
          </h1>
          <p className="mt-2 text-sm text-white/60">
            100k events a month, every provider. Already have an account?{" "}
            <Link to="/sign-in" className="text-[#FF4D00] hover:underline">
              Sign in
            </Link>
            .
          </p>
        </div>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </main>
  );
}
