import React from 'react';

export default function Loading() {
  return (
    <div className="w-full max-w-2xl text-center">
      <div className="inline-flex items-center justify-center mb-8">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-[3px] border-indigo-50"></div>
          <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-indigo-500 animate-spin"></div>
        </div>
      </div>
      <h2 className="text-xl font-semibold text-slate-text mb-2">
        Summarizing...
      </h2>
      <p className="text-sm text-slate-dim">
        Reading the transcript and extracting key points. This takes a few seconds.
      </p>
    </div>
  );
}
