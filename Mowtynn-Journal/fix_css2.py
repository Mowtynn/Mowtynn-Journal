import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

badge_base = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
css = css.replace('@apply badge-base', f'@apply {badge_base}')

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)
