import os
import re

DIR = 'src/components'

def run():
    for f in os.listdir(DIR):
        if not f.endswith('.tsx'): continue
        path = os.path.join(DIR, f)
        with open(path, 'r', encoding='utf-8') as file:
            content = file.read()
            
        orig = content
        
        # Replace remaining generic modal patterns with the new tokens
        content = content.replace('bg-[#0a0a0c] border border-zinc-800/80 rounded-2xl shadow-2xl flex flex-col', 'modal-content')
        content = content.replace('fixed inset-0 z-[1100] bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6', 'modal-overlay')
        content = content.replace('bg-zinc-950 border border-zinc-700/60 rounded-xl', 'toggle-group')
        content = content.replace('flex justify-between items-center px-6 py-5 border-b border-zinc-800/80 bg-zinc-950/50 shrink-0', 'modal-header')
        content = content.replace('flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-zinc-400 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white border-zinc-700/50', 'btn-icon')
        
        # Text
        content = re.sub(r'text-\[10px\]\s+text-zinc-500\s+font-bold\s+uppercase\s+tracking-widest(?:.*?)font-mono', 'card-title', content)
        
        # Specific Badge Replacements
        content = content.replace("badge-base bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", "badge-win")
        content = content.replace("badge-base bg-rose-500/10 text-rose-400 border border-rose-500/20", "badge-loss")
        content = content.replace("px-2.5 py-1 rounded-lg text-xs font-black tracking-widest font-mono", "badge-base")
        
        if orig != content:
            with open(path, 'w', encoding='utf-8') as file:
                file.write(content)
            print(f"Cleaned up {f}")

run()
