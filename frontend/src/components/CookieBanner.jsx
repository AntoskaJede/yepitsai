import React, { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('cookie_consent');
    if (!dismissed) {
      // Small delay so it doesn't flash before page loads
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('cookie_consent', 'dismissed');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white px-4 py-4 shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm text-slate-200">
          We use one essential cookie for authentication. No tracking, no ads.{' '}
          <a href="/cookies" className="text-indigo-400 hover:underline">Cookie Policy</a>
        </p>
        <button
          onClick={handleDismiss}
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
