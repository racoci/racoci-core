#!/usr/bin/env node

/**
 * merge_report.js
 * Automatically merges recursively generated report sections into a single cohesive markdown document.
 * Keeps hierarchical enumeration in order (e.g., 1, 1.1, 1.2, 2, 2.1, 10).
 */

const fs = require('fs');
const path = require('path');

// Helper to extract numeric parts for natural sorting
function getNumericParts(name) {
  const parts = name.split('-');
  const numbers = [];
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      numbers.push(parseInt(part, 10));
    } else {
      break;
    }
  }
  return numbers;
}

// Compare function for hierarchical folder names
function compareFolders(a, b) {
  const numsA = getNumericParts(a);
  const numsB = getNumericParts(b);
  const len = Math.max(numsA.length, numsB.length);
  for (let i = 0; i < len; i++) {
    const valA = numsA[i] !== undefined ? numsA[i] : -1;
    const valB = numsB[i] !== undefined ? numsB[i] : -1;
    if (valA !== valB) {
      return valA - valB;
    }
  }
  return a.localeCompare(b);
}

function showHelp() {
  console.log(`
Usage: node merge_report.js [options]

Options:
  -o, --output <file>    Specify the output markdown file (default: merged_report.md)
  -h, --help             Show this help message
  `);
}

function main() {
  const args = process.argv.slice(2);
  let outputFile = 'merged_report.md';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-o' || args[i] === '--output') {
      outputFile = args[i + 1] || outputFile;
      i++;
    } else if (args[i] === '-h' || args[i] === '--help') {
      showHelp();
      process.exit(0);
    }
  }

  const rootDir = process.cwd();
  console.log(`Scanning directory: ${rootDir}`);

  // Read all items in the root directory
  const items = fs.readdirSync(rootDir);
  
  // Filter for directories starting with numbers (the section folders)
  const sectionDirs = items.filter(item => {
    const itemPath = path.join(rootDir, item);
    if (!fs.statSync(itemPath).isDirectory()) return false;
    const nums = getNumericParts(item);
    return nums.length > 0;
  });

  // Sort them naturally
  sectionDirs.sort(compareFolders);

  if (sectionDirs.length === 0) {
    console.error('No section directories found starting with numbers.');
    process.exit(1);
  }

  console.log(`Found ${sectionDirs.length} sections to merge.`);
  let mergedContent = '';

  // Append a title if there is a main README.md in the root
  const rootReadmePath = path.join(rootDir, 'README.md');
  if (fs.existsSync(rootReadmePath)) {
    const rootReadme = fs.readFileSync(rootReadmePath, 'utf8');
    // Extract title if exists
    const titleMatch = rootReadme.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      mergedContent += `# ${titleMatch[1]}\n\n---\n\n`;
    }
  }

  for (const dir of sectionDirs) {
    const dirPath = path.join(rootDir, dir);
    const contentPath = path.join(dirPath, 'content.md');
    const readmePath = path.join(dirPath, 'README.md');

    let sectionText = '';
    let sourceFile = '';

    if (fs.existsSync(contentPath)) {
      sectionText = fs.readFileSync(contentPath, 'utf8').trim();
      sourceFile = 'content.md';
    } else if (fs.existsSync(readmePath)) {
      // Fallback to README outline if content.md is not yet generated
      sectionText = fs.readFileSync(readmePath, 'utf8').trim();
      sourceFile = 'README.md (Fallback - outline only)';
    }

    if (sectionText) {
      console.log(` Merging ${dir} (${sourceFile})...`);
      mergedContent += sectionText + '\n\n';
    } else {
      console.log(`⚠️  Skipping ${dir} - No content found.`);
    }
  }

  fs.writeFileSync(path.join(rootDir, outputFile), mergedContent.trim() + '\n', 'utf8');
  console.log(`\n🎉 Success! Combined report written to: ${path.join(rootDir, outputFile)}`);
}

main();
