import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

page_title_css = "\n  .page-title { @apply text-xs sm:text-sm font-bold text-text-primary uppercase tracking-wider font-mono; }\n"

if ".page-title" not in content:
    content = content.replace("  .heading-1", page_title_css + "  .heading-1")
    with open('src/index.css', 'w', encoding='utf-8') as f:
        f.write(content)
