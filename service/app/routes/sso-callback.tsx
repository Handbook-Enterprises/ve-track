import { AuthenticateWithRedirectCallback } from "@clerk/react-router";
import LoadingElement from "~/components/elements/LoadingElement";

export default function SsoCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="flex flex-col items-center gap-4">
        <LoadingElement size={28} className="text-[#FF4D00]" />
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">
          Finishing sign-in…
        </p>
      </div>
      <AuthenticateWithRedirectCallback />
    </main>
  );
}
