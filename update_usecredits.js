const fs = require('fs');
const filePath = 'src/hooks/useCredits.ts';

let content = fs.readFileSync(filePath, 'utf8');
let newContent = content
  .replace(/coins/g, 'credits')
  .replace(/Coins/g, 'Credits')
  .replace(/coin/g, 'credit')
  .replace(/Coin/g, 'Credit')
  .replace(/코인/g, '크레딧');

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Updated useCredits.ts');
