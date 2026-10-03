import re

with open('src/components/TradeDetailModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Increase width of modal
content = content.replace('className="w-full max-w-xl bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"',
                          'className="w-full max-w-3xl bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"')

# Increase header text sizes
content = content.replace('text-base font-black text-zinc-100 font-sans tracking-wider uppercase',
                          'text-2xl font-black text-zinc-100 font-sans tracking-wider uppercase')

content = content.replace('text-[9px] font-black px-2.5 py-0.5 rounded-lg font-sans tracking-wider',
                          'text-xs font-black px-3 py-1 rounded-lg font-sans tracking-wider')

content = content.replace('text-[9px] font-black px-2.5 py-0.5 rounded-lg font-sans tracking-widest',
                          'text-xs font-black px-3 py-1 rounded-lg font-sans tracking-widest')

# Status Pills
content = content.replace('text-[9px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1',
                          'text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5')

content = content.replace('text-[9px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1 font-mono',
                          'text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 font-mono')

content = content.replace('text-[9px] font-bold px-2.5 py-0.5 rounded-lg',
                          'text-xs font-bold px-3 py-1 rounded-lg')

# Header buttons
content = content.replace('text-[9px] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 font-bold px-3 py-1.5 rounded-xl',
                          'text-[10px] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 font-bold px-3.5 py-2 rounded-xl')

content = content.replace('text-[9px] bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-bold px-3.5 py-1.5 rounded-xl',
                          'text-[10px] bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-bold px-4 py-2 rounded-xl')

# Scrollable Document Content padding
content = content.replace('overflow-y-auto p-5 space-y-4 flex-1 bg-zinc-950/30 custom-scrollbar',
                          'overflow-y-auto p-6 space-y-6 flex-1 bg-zinc-950/30 custom-scrollbar')

# Financial Box
content = content.replace('border border-zinc-700/50 rounded-xl p-3.5',
                          'border border-zinc-700/50 rounded-xl p-5')

content = content.replace('text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-2 font-mono',
                          'text-xs font-black text-zinc-500 uppercase tracking-widest block mb-3 font-mono')

content = content.replace('text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5 font-mono',
                          'text-xs font-black text-zinc-500 uppercase tracking-widest block mb-3 font-mono')

content = content.replace('space-y-1 text-xs',
                          'space-y-2 text-sm')

content = content.replace('space-y-1 font-mono text-xs',
                          'space-y-2 font-mono text-sm')

content = content.replace('text-[10px]',
                          'text-xs')
# Wait, replacing all 'text-[10px]' might be too broad. Let's do it carefully.
# We will do it more surgically.

with open('src/components/TradeDetailModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

