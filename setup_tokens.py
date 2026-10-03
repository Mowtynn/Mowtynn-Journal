import os
import re

css = """
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&subset=latin,latin-ext&display=swap');
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@theme {
  --font-sans: "Plus Jakarta Sans", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: "Plus Jakarta Sans", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  
  /* Centralized Color Tokens */
  --color-brand: #3b82f6; /* blue-500 */
  --color-brand-hover: #2563eb; /* blue-600 */
  
  --color-win: #10b981; /* emerald-500 */
  --color-win-hover: #059669; /* emerald-600 */
  --color-win-bg: rgba(16, 185, 129, 0.1);
  --color-win-border: rgba(16, 185, 129, 0.2);
  
  --color-loss: #f43f5e; /* rose-500 */
  --color-loss-hover: #e11d48; /* rose-600 */
  --color-loss-bg: rgba(244, 63, 94, 0.1);
  --color-loss-border: rgba(244, 63, 94, 0.2);
  
  --color-breakeven: #f59e0b; /* amber-500 */
  --color-breakeven-bg: rgba(245, 158, 11, 0.1);
  --color-breakeven-border: rgba(245, 158, 11, 0.2);

  /* Backgrounds */
  --color-bg-base: #0a0a0c; /* main background */
  --color-bg-surface: #121214; /* secondary background (zinc-950) */
  --color-bg-card: rgba(24, 24, 27, 0.4); /* zinc-900/40 */
  --color-bg-card-hover: rgba(24, 24, 27, 0.6);
  --color-bg-modal: #0f0f11;
  --color-bg-input: #121214;
  
  /* Borders */
  --color-border-subtle: rgba(63, 63, 70, 0.3); /* zinc-700/30 */
  --color-border-card: rgba(63, 63, 70, 0.5); /* zinc-700/50 */
  --color-border-focus: rgba(59, 130, 246, 0.5); /* blue-500/50 */

  /* Text */
  --color-text-primary: #ffffff;
  --color-text-secondary: #a1a1aa; /* zinc-400 */
  --color-text-muted: #71717a; /* zinc-500 */
  
  /* Radii */
  --radius-sm: 0.5rem; /* 8px */
  --radius-md: 0.75rem; /* 12px */
  --radius-lg: 1rem; /* 16px */
  --radius-xl: 1.25rem; /* 20px */
  --radius-2xl: 1.5rem; /* 24px */
  
  /* Shadows */
  --shadow-card: 0 4px 20px -2px rgba(0, 0, 0, 0.4);
  --shadow-modal: 0 20px 40px -8px rgba(0, 0, 0, 0.7);
  --shadow-glow: 0 0 12px rgba(59, 130, 246, 0.4);
}

@layer components {
  /* ----- TYPOGRAPHY ----- */
  .heading-1 { 
    @apply text-xl sm:text-2xl font-black text-text-primary font-sans tracking-tight; 
  }
  .heading-2 { 
    @apply text-lg font-bold text-text-primary font-sans tracking-wide; 
  }
  .heading-3 { 
    @apply text-base font-bold text-text-primary font-sans; 
  }
  .card-title { 
    @apply text-[11px] font-bold text-text-muted font-mono uppercase tracking-widest flex items-center gap-2; 
  }
  .form-label { 
    @apply text-[10px] font-extrabold text-text-muted font-sans uppercase tracking-widest mb-1.5 block; 
  }
  .body-text {
    @apply text-sm text-text-secondary font-medium leading-relaxed;
  }
  .value-text {
    @apply text-base font-bold text-text-primary tabular-nums;
  }

  /* ----- CONTAINERS & CARDS ----- */
  .layout-base {
    @apply bg-bg-base text-text-primary min-h-screen selection:bg-brand/30 selection:text-white;
  }
  .card-base { 
    @apply bg-bg-card border border-border-card rounded-2xl shadow-card transition-all duration-200 hover:bg-bg-card-hover; 
  }
  .card-header {
    @apply flex items-center justify-between p-4 sm:p-5 border-b border-border-subtle;
  }
  .card-body {
    @apply p-4 sm:p-5;
  }
  
  /* ----- MODALS ----- */
  .modal-overlay { 
    @apply fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto; 
  }
  .modal-content { 
    @apply bg-bg-modal border border-border-card rounded-2xl shadow-modal w-full flex flex-col my-auto relative; 
  }
  .modal-header {
    @apply flex items-center justify-between px-6 py-5 border-b border-border-subtle bg-bg-surface;
  }
  .modal-body {
    @apply p-6;
  }
  
  /* ----- INPUTS & FORMS ----- */
  .input-base { 
    @apply w-full h-10 bg-bg-input border border-border-subtle hover:border-border-card focus:border-border-focus focus:ring-1 focus:ring-border-focus rounded-xl px-3 text-sm text-text-primary placeholder-text-muted outline-none transition-all; 
  }
  .input-icon-wrapper {
    @apply absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted;
  }
  .input-with-icon {
    @apply pl-9; /* Use with input-base */
  }

  /* ----- BUTTONS ----- */
  .btn-base {
    @apply inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 outline-none select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100;
  }
  .btn-primary {
    @apply btn-base bg-brand hover:bg-brand-hover text-white shadow-glow px-4 py-2 text-sm;
  }
  .btn-secondary {
    @apply btn-base bg-bg-surface border border-border-card hover:bg-bg-card text-text-primary px-4 py-2 text-sm;
  }
  .btn-icon {
    @apply flex items-center justify-center w-9 h-9 rounded-xl border border-border-subtle bg-bg-surface hover:bg-bg-card hover:text-white text-text-secondary transition-colors cursor-pointer shrink-0;
  }

  /* ----- TOGGLE GROUPS ----- */
  .toggle-group { 
    @apply flex flex-wrap gap-2 p-1 bg-bg-input border border-border-subtle rounded-xl; 
  }
  .toggle-group-grid {
    @apply grid gap-1.5 p-1 bg-bg-input border border-border-subtle rounded-xl;
  }
  .toggle-item { 
    @apply flex-1 sm:flex-none flex items-center justify-center rounded-lg py-2 px-3 text-[11px] font-bold font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer select-none border border-transparent; 
  }
  .toggle-item-inactive { 
    @apply text-text-muted hover:text-text-secondary hover:bg-bg-surface; 
  }
  /* Status Toggle Items */
  .toggle-item-brand { @apply bg-brand/10 border-brand/30 text-brand shadow-[0_0_10px_rgba(59,130,246,0.2)]; }
  .toggle-item-win { @apply bg-win-bg border-win-border text-win shadow-[0_0_10px_rgba(16,185,129,0.2)]; }
  .toggle-item-loss { @apply bg-loss-bg border-loss-border text-loss shadow-[0_0_10px_rgba(244,63,94,0.2)]; }
  .toggle-item-breakeven { @apply bg-breakeven-bg border-breakeven-border text-breakeven shadow-[0_0_10px_rgba(245,158,11,0.2)]; }
  .toggle-item-zinc { @apply bg-bg-surface border-border-card text-text-primary; }
  
  /* ----- BADGES ----- */
  .badge-base {
    @apply inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold;
  }
  .badge-win { @apply badge-base bg-win-bg text-win border border-win-border; }
  .badge-loss { @apply badge-base bg-loss-bg text-loss border border-loss-border; }
  .badge-breakeven { @apply badge-base bg-breakeven-bg text-breakeven border border-breakeven-border; }
  .badge-brand { @apply badge-base bg-brand/10 text-brand border border-brand/20; }
  .badge-neutral { @apply badge-base bg-bg-surface text-text-secondary border border-border-subtle; }
}

html {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: "tnum" 1, "locl" 1;
  font-language-override: "TRK";
  letter-spacing: -0.005em;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-bg-base);
  color: var(--color-text-primary);
  line-height: 1.55;
}

/* Base utility overrides */
* {
  -webkit-tap-highlight-color: transparent;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border-card) var(--color-bg-base);
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: var(--color-bg-base); 
}
::-webkit-scrollbar-thumb {
  background: var(--color-border-subtle); 
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-card); 
}
"""

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Created comprehensive design token CSS.")
