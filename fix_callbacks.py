import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# The sed command already changed the signature to `const persist... = useCallback((updated...`
# We just need to find the matching `  };` and change it to `  }, [user]);` for these 7 functions.

patterns = [
    'persistPlatforms',
    'persistTimeframes',
    'persistHtfTimeframes',
    'persistConfirmations',
    'persistConcepts',
    'persistSessions',
    'persistAssets'
]

for p in patterns:
    # Find the declaration
    decl_idx = content.find(f'const {p} = useCallback')
    if decl_idx == -1: continue
    # Find the next `  };\n` after decl_idx
    end_idx = content.find('  };\n', decl_idx)
    if end_idx != -1:
        # replace `  };\n` with `  }, [user]);\n`
        content = content[:end_idx] + '  }, [user]);\n' + content[end_idx+5:]

with open('src/App.tsx', 'w') as f:
    f.write(content)
