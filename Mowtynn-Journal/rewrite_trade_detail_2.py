import re

with open('src/components/TradeDetailModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make the notes section more readable
content = content.replace(
    'className="bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-2.5 text-xs leading-relaxed text-zinc-300 min-h-[70px] whitespace-pre-wrap font-sans"',
    'className="bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-5 text-[15px] sm:text-base leading-relaxed text-zinc-200 min-h-[100px] whitespace-pre-wrap font-sans"'
)

# Improve section titles
content = content.replace(
    'text-zinc-500 text-[9px] font-black mb-2 uppercase tracking-widest font-mono',
    'text-zinc-500 text-[11px] font-black mb-3 uppercase tracking-widest font-mono'
)

# Improve Date / Context text sizes
content = content.replace(
    'text-xs text-zinc-400 flex flex-col gap-1.5',
    'text-sm text-zinc-400 flex flex-col gap-2'
)

content = content.replace(
    'text-xs text-zinc-300 font-mono font-bold uppercase flex flex-col gap-1.5',
    'text-sm text-zinc-300 font-mono font-bold uppercase flex flex-col gap-2'
)

content = content.replace(
    'text-zinc-400 text-xs',
    'text-zinc-400 text-sm'
)

content = content.replace(
    'font-black text-sm text-emerald-400',
    'font-black text-xl text-emerald-400'
)

content = content.replace(
    'font-black text-sm text-rose-400',
    'font-black text-xl text-rose-400'
)

content = content.replace(
    'font-black text-sm text-zinc-500',
    'font-black text-xl text-zinc-500'
)

# Increase the screenshot max height
content = content.replace(
    'className="rounded-xl object-contain w-full max-h-[300px]"',
    'className="rounded-xl object-contain w-full max-h-[500px]"'
)

# Close button size
content = content.replace(
    'text-[10px] font-black tracking-widest px-5 py-2',
    'text-xs font-black tracking-widest px-6 py-2.5'
)

# Header "Sil" / "Düzenle" text size
content = content.replace('text-[10px] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 font-bold px-3.5 py-2 rounded-xl',
                          'text-xs bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 font-bold px-4 py-2 rounded-xl')
                          
content = content.replace('text-[10px] bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-bold px-4 py-2 rounded-xl',
                          'text-xs bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-bold px-4 py-2 rounded-xl')

with open('src/components/TradeDetailModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

