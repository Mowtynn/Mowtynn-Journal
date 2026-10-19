import os
import re

DIR = 'src/components'

def refactor(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    orig = content
    
    # Buttons
    content = re.sub(r'bg-blue-600\s+hover:bg-blue-700\s+text-white\s+shadow-\[.*?\]\s+px-.*?\s+rounded-xl\s+font-bold\s+transition-all\s+flex\s+items-center\s+gap-2', 'btn-primary', content)
    content = re.sub(r'bg-blue-500\s+hover:bg-blue-600\s+text-white\s+px-.*?\s+rounded-xl\s+font-bold\s+transition-all\s+shadow-\[.*?\]\s+flex\s+items-center\s+gap-2', 'btn-primary', content)
    
    # Toggle items
    # Inactive
    content = re.sub(r'text-zinc-500\s+hover:text-zinc-300\s+hover:bg-zinc-800/50', 'toggle-item-inactive', content)
    # Win / Loss / etc
    content = re.sub(r'bg-emerald-500/10\s+border\s+border-emerald-500/30\s+text-emerald-400\s+shadow-\[.*?\]', 'toggle-item-win', content)
    content = re.sub(r'bg-rose-500/10\s+border\s+border-rose-500/30\s+text-rose-400\s+shadow-\[.*?\]', 'toggle-item-loss', content)
    content = re.sub(r'bg-amber-500/10\s+border\s+border-amber-500/30\s+text-amber-400\s+shadow-\[.*?\]', 'toggle-item-breakeven', content)
    content = re.sub(r'bg-blue-500/10\s+border\s+border-blue-500/30\s+text-blue-400\s+shadow-\[.*?\]', 'toggle-item-brand', content)
    content = re.sub(r'bg-blue-500\s+text-white\s+shadow-\[.*?\]', 'toggle-item-brand', content) # fallback for active generic
    
    # Badges
    content = re.sub(r'bg-emerald-500/10\s+text-emerald-400\s+border\s+border-emerald-500/20', 'badge-win', content)
    content = re.sub(r'bg-rose-500/10\s+text-rose-400\s+border\s+border-rose-500/20', 'badge-loss', content)
    content = re.sub(r'bg-amber-500/10\s+text-amber-400\s+border\s+border-amber-500/20', 'badge-breakeven', content)

    # General Modals
    content = re.sub(r'fixed\s+inset-0\s+z-\[100\]\s+flex\s+items-center\s+justify-center\s+p-4\s+sm:p-6\s+bg-zinc-950/80\s+backdrop-blur-sm', 'modal-overlay', content)
    content = re.sub(r'bg-\[\#0a0a0c\]\s+border\s+border-zinc-800/80\s+rounded-2xl\s+shadow-2xl\s+w-full\s+flex\s+flex-col\s+overflow-hidden', 'modal-content', content)
    
    # Cards
    content = re.sub(r'bg-zinc-900/40\s+border\s+border-zinc-800/60\s+rounded-2xl\s+p-[45]\s+flex\s+flex-col', 'card-base flex flex-col', content)
    content = re.sub(r'bg-zinc-900/40\s+border\s+border-zinc-800/60\s+rounded-2xl\s+flex\s+flex-col', 'card-base flex flex-col', content)

    if content != orig:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for filename in os.listdir(DIR):
    if filename.endswith('.tsx'):
        refactor(os.path.join(DIR, filename))
