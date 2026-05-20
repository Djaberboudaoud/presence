const fs = require('fs');
const path = require('path');

let hasError = false;

function checkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      checkDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const importRegex = /import.*?from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.') || importPath.startsWith('..')) {
          const resolvedPath = path.resolve(dir, importPath);
          try {
            const dirName = path.dirname(resolvedPath);
            const baseName = path.basename(resolvedPath);
            if (fs.existsSync(dirName)) {
              const actualFiles = fs.readdirSync(dirName);
              // Find matching file ignoring extension if omitted
              const matchFile = actualFiles.find(f => {
                return f === baseName || f.replace(/\.(ts|tsx|js|jsx)$/, '') === baseName;
              });
              if (!matchFile) {
                // Check if it matches case-insensitively to prove it's a case issue
                const ciMatch = actualFiles.find(f => f.toLowerCase().replace(/\.(ts|tsx|js|jsx)$/, '') === baseName.toLowerCase());
                if (ciMatch) {
                  console.log(`CASE MISMATCH: ${fullPath} imports '${importPath}' (expected '${ciMatch}')`);
                  hasError = true;
                }
              }
            }
          } catch(e) {}
        }
      }
    }
  }
}

// Check src directory
checkDir(path.join(__dirname, 'src'));

if (!hasError) {
  console.log('No case mismatches found.');
} else {
  process.exit(1);
}
