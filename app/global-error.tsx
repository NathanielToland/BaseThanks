"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen bg-[#fff5ed] px-5 py-8 text-[#342621]">
          <section className="mx-auto max-w-xl rounded-lg border border-[#ecd7cd] bg-[#fffaf4] p-6 shadow-sm">
            <h1 className="text-2xl font-semibold">BaseKudos could not load.</h1>
            <p className="mt-3 text-sm text-[#806d65]">A global error was captured. Please retry the app.</p>
            <button className="mt-5 rounded-md bg-[#df6f5f] px-4 py-2 text-sm font-semibold text-white" onClick={reset} type="button">
              Retry
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
