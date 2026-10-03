import os
import re

DIR = 'src/components'

REPLACEMENTS = [
    # Card titles / labels
    (r'text-\[1[012]px\]\s+font-(?:bold|extrabold)\s+(?:uppercase\s+tracking-wides?t?|tracking-wides?t?\s+uppercase)\s+text-zinc-[456]00\s+font-(?:mono|sans)', 'card-title'),
    (r'text-\[1[012]px\]\s+font-(?:bold|extrabold)\s+text-zinc-[456]00\s+(?:uppercase\s+tracking-wides?t?|tracking-wides?t?\s+uppercase)\s+font-(?:mono|sans)', 'card-title'),
    (r'text-zinc-[456]00\s+text-\[1[012]px\]\s+font-(?:mono|sans)\s+font-(?:bold|extrabold)\s+uppercase\s+tracking-wides?t?', 'card-title'),
    
    # Form labels
    (r'text-\[10px\]\s+font-extrabold\s+text-zinc-500\s+uppercase\s+tracking-widest\s+mb-1\.5\s+font-sans', 'form-label'),
    (r'block\s+form-label', 'form-label'),
    
    # Panel/Modal titles
    (r'text-xl\s+sm:text-2xl\s+font-black\s+tracking-tight\s+text-white\s+font-sans', 'heading-1'),
    (r'text-lg\s+font-bold\s+text-white\s+font-sans\s+tracking-wide', 'heading-2'),
    
    # Inputs
    (r'bg-zinc-950\s+border\s+border-zinc-700/60\s+hover:border-zinc-600\s+focus:border-blue-500/80\s+focus:ring-1\s+focus:ring-blue-500/30\s+rounded-xl\s+text-sm\s+text-white\s+placeholder-zinc-600\s+outline-none\s+transition-all', 'input-base'),
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    orig_content = content
    for pattern, replacement in REPLACEMENTS:
        content = re.sub(pattern, replacement, content)
        
    if content != orig_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for filename in os.listdir(DIR):
    if filename.endswith('.tsx'):
        process_file(os.path.join(DIR, filename))
        
process_file('src/App.tsx')
