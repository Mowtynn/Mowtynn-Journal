import re
text = 'text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-mono'
pattern = r'text-\[1[012]px\]\s+font-(?:bold|extrabold)\s+(?:uppercase\s+tracking-wides?t?|tracking-wides?t?\s+uppercase)\s+text-zinc-[456]00\s+font-(?:mono|sans)'
print(re.sub(pattern, 'card-title', text))
