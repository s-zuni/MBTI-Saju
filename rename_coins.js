const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const apiDir = path.join(__dirname, 'api');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDir = fs.statSync(dirPath).isDirectory();
    isDir ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;
  // Ignore the script itself
  if (filePath.includes('rename.js') || filePath.includes('node_modules') || filePath.includes('.git')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content
    .replace(/CoinPurchaseModal/g, 'CreditPurchaseModal')
    .replace(/CoinDisplay/g, 'CreditDisplay')
    .replace(/coinConfig/g, 'creditConfig')
    .replace(/useCoins/g, 'useCredits') // Will be a bit messy but we'll clean up
    .replace(/useCoin/g, 'useCredit')
    .replace(/coins/g, 'credits')
    .replace(/Coins/g, 'Credits')
    .replace(/coin/g, 'credit')
    .replace(/Coin/g, 'Credit')
    .replace(/코인/g, '크레딧');

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated contents: ${filePath}`);
  }

  // Rename the file if needed
  const filename = path.basename(filePath);
  let newFilename = filename
    .replace(/CoinPurchaseModal/g, 'CreditPurchaseModal')
    .replace(/CoinDisplay/g, 'CreditDisplay')
    .replace(/coinConfig/g, 'creditConfig')
    .replace(/useCoins/g, 'useCredits'); // Actually we wait, we will delete useCoins.ts

  if (filename !== newFilename) {
    const newPath = path.join(path.dirname(filePath), newFilename);
    fs.renameSync(filePath, newPath);
    console.log(`Renamed: ${filePath} -> ${newPath}`);
  }
}

walkDir(srcDir, processFile);
walkDir(apiDir, processFile);
