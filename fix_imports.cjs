const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const possibleIcons = ["CheckCircle2", "Minus", "ChevronDown", "ChevronUp", "ArrowUpDown", "ExternalLink", "Clock", "MinusCircle", "Sparkles", "X"];

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Find lucide-react import
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];/m;
  const match = content.match(importRegex);
  
  if (match) {
    let importedIcons = match[1].split(',').map(s => s.trim()).filter(Boolean);
    let changed = false;
    
    for (const icon of possibleIcons) {
      if (content.includes(`<${icon}`) && !importedIcons.includes(icon)) {
        importedIcons.push(icon);
        changed = true;
      }
    }
    
    if (changed) {
      const newImport = `import { ${importedIcons.join(', ')} } from 'lucide-react';`;
      content = content.replace(importRegex, newImport);
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Updated ${file}`);
    }
  } else {
    // If not found, check if we need to add a new import
    let needed = [];
    for (const icon of possibleIcons) {
      if (content.includes(`<${icon}`)) {
        needed.push(icon);
      }
    }
    if (needed.length > 0) {
      const newImport = `import { ${needed.join(', ')} } from 'lucide-react';\n`;
      content = newImport + content;
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Added import to ${file}`);
    }
  }
}
