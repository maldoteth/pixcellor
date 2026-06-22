import fs from 'fs';

const filePath = 'src/data/packages.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace "—" with "\n" in the COMPARISON_ROWS values
// This targets strings like "—" or "—" and replaces them with "\n"
content = content.replace(/:\s*"—"/g, ': "\\n"');

fs.writeFileSync(filePath, content);
console.log('Successfully replaced "—" with "\\n"');
