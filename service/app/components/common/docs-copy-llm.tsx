import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import readme from "../../../../README.md?raw";

export default function DocsCopyForLLM() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(readme);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-[#FF4D00] hover:text-[#FF4D00]"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" /> Copied for LLM
        </>
      ) : (
        <>
          <Sparkles className="h-3.5 w-3.5" /> Copy for LLM
        </>
      )}
    </button>
  );
}
