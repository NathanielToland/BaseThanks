"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen px-5 py-8">
      <section className="mx-auto max-w-xl rounded-lg border border-[#ecd7cd] bg-[#fffaf4] p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#342621]">BaseThanks needs a refresh.</h1>
        <p className="mt-3 text-sm text-[#806d65]">
          The app caught a client error instead of crashing the page. Please try again.
        </p>
        <button
          className="focus-ring mt-5 rounded-md bg-[#df6f5f] px-4 py-2 text-sm font-semibold text-white"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
