import React from 'react';

const AppLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 512 512" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="40" y="240" width="432" height="180" rx="20" fill="#1e293b" />
    <path d="M40 340h432M140 240v180M370 240v180" stroke="#334155" strokeWidth="10" />
    <circle cx="120" cy="440" r="45" fill="#000" stroke="#334155" strokeWidth="5" />
    <circle cx="392" cy="440" r="45" fill="#000" stroke="#334155" strokeWidth="5" />
    <path d="M410 240l62 60v120h-40" fill="#1e293b" />
    <rect x="420" y="255" width="40" height="40" rx="5" fill="#38bdf8" />
    <path d="M40 140h340v100H40z" fill="#0369a1" />
  </svg>
);

export default AppLogo;

