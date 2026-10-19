import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace @apply btn-base with its actual contents
btn_base = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 outline-none select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100"

css = css.replace('@apply btn-base', f'@apply {btn_base}')

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)
