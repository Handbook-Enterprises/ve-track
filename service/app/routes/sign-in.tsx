import { SignIn } from "@clerk/react-router";
import { Link } from "react-router";
import Logo from "~/components/common/logo";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-16 text-white">
      <div className="w-full max-w-md space-y-8">
        <Link to="/" className="flex items-center gap-3">
          <Logo />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#FF4D00]">
            Sign in
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Pick up where you left off. New here?{" "}
            <Link to="/sign-up" className="text-[#FF4D00] hover:underline">
              Create an account
            </Link>
            .
          </p>
        </div>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </main>
  );
}
