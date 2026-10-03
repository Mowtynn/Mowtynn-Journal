import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace shadows and specific styles with var()
# e.g., shadow-[0_0_10px_rgba(16,185,129,0.2)]
# Actually, the user wants muted tradingview styles, so maybe just shadow-xs or no glow.
# TradingView doesn't glow much. Let's remove the glow from the toggles.

content = re.sub(r'shadow-\[0_0_10px_[^\]]+\]', 'shadow-xs', content)

# update .toggle-item-brand etc
content = content.replace('bg-brand/10 border-brand/30 text-brand', 'bg-[var(--color-win-bg)] border-[var(--color-win-border)] text-brand') # wait, brand is blue
content = content.replace('.toggle-item-brand { @apply bg-brand/10 border-brand/30 text-brand shadow-[0_0_10px_rgba(59,130,246,0.2)]; }', 
                          '.toggle-item-brand { @apply bg-[color:var(--color-brand)]/10 border-[color:var(--color-brand)]/30 text-[color:var(--color-brand)]; }')

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
