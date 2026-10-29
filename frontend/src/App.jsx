import { useState } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('')

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-8 sm:py-16">
      {/* Header */}
      <header className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4 shadow-lg shadow-primary/25">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Scam Shield
        </h1>
        <p className="mt-2 text-text-muted text-sm sm:text-base max-w-md">
          Paste a suspicious message to check if it&apos;s a scam.
          We&apos;ll highlight red flags and tell you what to do.
        </p>
      </header>

      {/* Input card */}
      <main className="w-full max-w-lg">
        <div className="rounded-2xl bg-surface-card border border-white/10 p-5 sm:p-6 shadow-xl backdrop-blur-sm">
          <label htmlFor="message-input" className="block text-sm font-medium text-text-muted mb-2">
            Suspicious message
          </label>
          <textarea
            id="message-input"
            className="w-full h-36 sm:h-44 resize-none rounded-xl bg-surface border border-white/10 px-4 py-3 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow text-sm sm:text-base"
            placeholder="Paste SMS, WhatsApp message, or call transcript here…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <button
            id="check-button"
            disabled
            className="mt-4 w-full py-3 rounded-xl font-semibold text-sm sm:text-base bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-primary/40 cursor-pointer"
          >
            Check Message
          </button>

          <p className="mt-3 text-xs text-text-muted text-center">
            Your message is processed locally and never stored.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto pt-8 pb-4 text-center text-xs text-text-muted/60">
        Scam Shield &middot; Stay safe, stay aware
      </footer>
    </div>
  )
}

export default App
