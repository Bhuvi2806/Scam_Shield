import { HomePage } from "./pages/HomePage";
import "./App.css";

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-3.5 sm:px-6 py-6 sm:py-10 bg-surface text-text">
      {/* Header */}
      <header className="text-center mb-6 sm:mb-8 w-full max-w-3xl">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-3 shadow-lg shadow-primary/25">
          <svg className="w-7 h-7 sm:w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-accent to-white bg-clip-text text-transparent">
          Scam Shield
        </h1>
        <p className="mt-1.5 text-text-muted text-xs sm:text-base max-w-md mx-auto">
          Detect scam messages. Protect your family.
          <span className="block text-xs text-text-muted/70 mt-0.5">
            संदेश जांचें और ऑनलाइन धोखाधड़ी से सुरक्षित रहें।
          </span>
        </p>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-3xl flex-1">
        <HomePage />
      </main>

      {/* Footer */}
      <footer className="mt-12 pt-6 pb-4 border-t border-white/5 w-full max-w-3xl text-center text-xs text-text-muted/60 space-y-1">
        <p>
          Scam Shield &middot; Processed strictly in memory &middot; Never stored or logged.
        </p>
        <p>
          In case of financial fraud, call the National Helpline{" "}
          <a href="tel:1930" className="text-primary hover:underline font-semibold">
            1930
          </a>{" "}
          or report at{" "}
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-semibold"
          >
            cybercrime.gov.in
          </a>
          .
        </p>
      </footer>
    </div>
  );
}

export default App;
