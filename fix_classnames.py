import os
import re

directory = 'src/components'

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find elements with multiple className attributes
            # We can use regex to find `className="will-change-[opacity]"[\s\S]*?className="([^"]+)"` and merge them.
            
            def replace_func(match):
                # match.group(1) is the other className contents
                return f'className="will-change-[opacity] {match.group(1)}"'

            new_content = re.sub(r'className="will-change-\[opacity\]"\s*className="([^"]+)"', replace_func, content)
            
            # Also handle if the other one is first
            def replace_func2(match):
                return f'className="{match.group(1)} will-change-[opacity]"'
                
            new_content = re.sub(r'className="([^"]+)"\s*className="will-change-\[opacity\]"', replace_func2, new_content)
            
            # Sometimes there might be a click handler in between, like in the esbuild error logs:
            # className="will-change-[opacity]"
            # onClick={onClose}
            # className="..."
            # Let's just remove the first one and append the string to the second one
            
            def replace_complex(match):
                between = match.group(1)
                second_class = match.group(2)
                return f'{between} className="will-change-[opacity] {second_class}"'
                
            new_content = re.sub(r'className="will-change-\[opacity\]"([\s\S]{1,100}?)className="([^"]+)"', replace_complex, new_content)

            if content != new_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Fixed {filepath}")

