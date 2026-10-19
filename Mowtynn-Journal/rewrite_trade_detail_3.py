import re

with open('src/components/TradeDetailModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make financial numbers larger
content = content.replace(
    'font-black text-sm ${pnlColorClass}',
    'font-black text-xl sm:text-2xl ${pnlColorClass}'
)

content = content.replace(
    "font-black text-sm ${trade.rr !== undefined && trade.rr !== null && trade.rr >= 0 ? 'text-emerald-400' : 'text-rose-400'}",
    "font-black text-xl sm:text-2xl ${trade.rr !== undefined && trade.rr !== null && trade.rr >= 0 ? 'text-emerald-400' : 'text-rose-400'}"
)

# Pill tags like 15M, 5M should be slightly bigger, maybe text-[10px]
content = content.replace(
    'px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-wider font-bold',
    'px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold'
)
content = content.replace(
    'px-1.5 py-0.5 rounded-lg text-[9px] tracking-widest',
    'px-2 py-1 rounded-lg text-[10px] tracking-widest'
)

# Fix calendar icon
content = content.replace(
    '<Calendar size={11}',
    '<Calendar size={14}'
)

# Fix other icons if needed
content = content.replace(
    '<FileText size={11}',
    '<FileText size={14}'
)
content = content.replace(
    '<ImageIcon size={11}',
    '<ImageIcon size={14}'
)

with open('src/components/TradeDetailModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

