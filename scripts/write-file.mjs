import fs from 'fs';
import path from 'path';

const [,, targetPath] = process.argv;
if (!targetPath) {
  console.error("Usage: node write-file.mjs <targetPath>");
  process.exit(1);
}

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  const fullPath = path.resolve(targetPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, data, 'utf8');
  console.log(`Wrote ${fullPath} (${data.length} chars)`);
});