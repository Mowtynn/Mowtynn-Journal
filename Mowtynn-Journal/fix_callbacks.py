import os
import re

DIR = 'src/components'
for file in os.listdir(DIR):
    if not file.endswith('.tsx'): continue
    path = os.path.join(DIR, file)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    orig = content
    
    # "bg-emerald-500/15 text-emerald-400" -> toggle-item-win
    # "bg-amber-500/15 text-amber-400" -> toggle-item-breakeven
    # "bg-rose-500/15 text-rose-400" -> toggle-item-loss
    
    content = re.sub(r'bg-emerald-500/1[05]\s+text-emerald-400(?:.*?shadow-\[.*?\])?', 'toggle-item-win', content)
    content = re.sub(r'bg-amber-500/1[05]\s+text-amber-400(?:.*?shadow-\[.*?\])?', 'toggle-item-breakeven', content)
    content = re.sub(r'bg-rose-500/1[05]\s+text-rose-400(?:.*?shadow-\[.*?\])?', 'toggle-item-loss', content)
    content = re.sub(r'bg-blue-500/1[05]\s+text-blue-400(?:.*?shadow-\[.*?\])?', 'toggle-item-brand', content)
    content = re.sub(r'bg-blue-500\s+text-white(?:.*?shadow-\[.*?\])?', 'toggle-item-brand', content)
    content = re.sub(r'bg-zinc-800/80\s+text-white', 'toggle-item-zinc', content)

    # Convert generic flex buttons to toggle-item
    content = re.sub(r'flex-1\s+text-\[10px\]\s+font-bold\s+uppercase\s+transition-colors\s+rounded-lg', 'toggle-item', content)

    if content != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed toggles in {file}")
