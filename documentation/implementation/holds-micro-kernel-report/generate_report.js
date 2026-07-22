#!/usr/bin/env node

/**
 * generate_report.js
 * Recursively generates report content section by section using the Gemini CLI.
 * Incorporates instructions, external reference files, and historical section cohesion context.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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

// Simple markdown parser to extract References and Instructions sections
function parseSectionReadme(content) {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : '';

  let references = [];
  const refSection = content.match(/##\s+References\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (refSection) {
    const lines = refSection[1].split('\n');
    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('-') || line.startsWith('*')) {
        const cleaned = line.replace(/^[-*]\s*/, '').replace(/`|"/g, '').trim();
        if (cleaned) references.push(cleaned);
      }
    }
  }

  let instructions = '';
  const instSection = content.match(/##\s+Instructions\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (instSection) {
    instructions = instSection[1].trim();
  }

  return { title, references, instructions };
}

function showHelp() {
  console.log(`
Usage: node generate_report.js [options]

Options:
  -f, --force            Regenerate all sections even if content.md already exists
  -s, --section <dir>    Generate content only for a specific section directory (e.g. 1-1-context)
  -h, --help             Show this help message
  `);
}

function main() {
  const args = process.argv.slice(2);
  let force = false;
  let singleSection = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-f' || args[i] === '--force') {
      force = true;
    } else if (args[i] === '-s' || args[i] === '--section') {
      singleSection = args[i + 1];
      i++;
    } else if (args[i] === '-h' || args[i] === '--help') {
      showHelp();
      process.exit(0);
    }
  }

  const rootDir = process.cwd();
  console.log(`🚀 Report Generator Started in: ${rootDir}`);

  // Read all items in the root directory
  const items = fs.readdirSync(rootDir);
  
  // Filter for section directories starting with numbers
  let sectionDirs = items.filter(item => {
    const itemPath = path.join(rootDir, item);
    if (!fs.statSync(itemPath).isDirectory()) return false;
    const nums = getNumericParts(item);
    return nums.length > 0;
  });

  // Sort them naturally
  sectionDirs.sort(compareFolders);

  if (singleSection) {
    if (!sectionDirs.includes(singleSection)) {
      console.error(`Error: Section directory "${singleSection}" not found in root.`);
      process.exit(1);
    }
    sectionDirs = [singleSection];
    console.log(`Targeting single section: ${singleSection}`);
  }

  if (sectionDirs.length === 0) {
    console.error('No section directories found to generate.');
    process.exit(1);
  }

  let previousContent = '';

  for (let index = 0; index < sectionDirs.length; index++) {
    const dir = sectionDirs[index];
    const dirPath = path.join(rootDir, dir);
    const contentPath = path.join(dirPath, 'content.md');
    const readmePath = path.join(dirPath, 'README.md');

    if (!fs.existsSync(readmePath)) {
      console.log(`⚠️  Skipping folder "${dir}" - No README.md outline found.`);
      continue;
    }

    // Check if content exists and if we should skip
    if (fs.existsSync(contentPath) && !force) {
      console.log(`⏭️  Skipping "${dir}" - content.md already exists (use --force to regenerate).`);
      previousContent = fs.readFileSync(contentPath, 'utf8');
      continue;
    }

    console.log(`\n==================================================`);
    console.log(`[${index + 1}/${sectionDirs.length}] Generating content for: ${dir}...`);
    console.log(`==================================================`);

    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    const { title, references, instructions } = parseSectionReadme(readmeContent);

    console.log(`Title: "${title || dir}"`);
    console.log(`Instructions length: ${instructions.length} chars`);
    if (references.length > 0) {
      console.log(`Found references: ${references.join(', ')}`);
    }

    // Load reference files
    const referencesData = [];
    for (const refPath of references) {
      // Resolve path: absolute, relative to report root, or relative to section folder
      let resolved = refPath;
      if (!path.isAbsolute(resolved)) {
        // Try relative to section directory first
        const trySec = path.resolve(dirPath, refPath);
        if (fs.existsSync(trySec)) {
          resolved = trySec;
        } else {
          // Fall back to relative to report root
          resolved = path.resolve(rootDir, refPath);
        }
      }

      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        try {
          const content = fs.readFileSync(resolved, 'utf8');
          referencesData.push({ path: refPath, content });
          console.log(`  Loaded reference: ${refPath} (${content.length} chars)`);
        } catch (err) {
          console.warn(`  ⚠️ Failed to read reference file "${refPath}": ${err.message}`);
        }
      } else {
        console.warn(`  ⚠️ Reference file "${refPath}" could not be resolved or found.`);
      }
    }

    // Construct the context to feed into standard input
    let stdinContent = `SECTION TITLE: ${title || dir}\n\n`;
    
    if (previousContent) {
      // Give the model some trailing lines of the previous section to maintain cohesive transitions
      const lastLines = previousContent.trim().split('\n').slice(-30).join('\n');
      stdinContent += `--- TRANSITION COHESION (END OF PREVIOUS SECTION) ---\n${lastLines}\n\n`;
    }

    stdinContent += `--- GENERATION INSTRUCTIONS ---\n${instructions || 'Write a comprehensive and highly detailed section for this topic.'}\n\n`;

    if (referencesData.length > 0) {
      stdinContent += `--- REFERENCE MATERIALS AND SOURCE DATA ---\n`;
      for (const ref of referencesData) {
        stdinContent += `[File: ${ref.path}]\n${ref.content}\n\n`;
      }
    }

    // Assemble the prompt for the gemini binary
    const prompt = `You are a highly skilled professional technical writer. 
Generate a comprehensive, deeply-researched, and extremely polished report section for "${title || dir}".
Utilize the detailed instructions, context cohesion, and raw source reference material provided in standard input (stdin) to craft the content.

CRITICAL FORMATTING RULES:
1. Always start directly with the appropriate markdown heading (e.g., "# ${title}" or "## ${title}").
2. Ensure there are no introductory sentences like "Here is the content..." or meta-commentary. Write ONLY the final publication-ready report section text.
3. Keep the markdown clean and perfectly structured. Use bold text, tables, blockquotes, and bullet points where they enrich readability.
4. Integrate details from the reference files accurately. Do not generalize; use concrete facts, configurations, and figures where present in the references.`;

    console.log(`Invoking Gemini CLI to generate section...`);
    
    const start = Date.now();
    const result = spawnSync('gemini', ['-p', prompt], {
      input: stdinContent,
      encoding: 'utf-8',
      maxBuffer: 15 * 1024 * 1024 // 15MB buffer limit
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (result.error) {
      console.error(`❌ Process Error during generation: ${result.error.message}`);
      continue;
    }

    if (result.status !== 0) {
      console.error(`❌ Generation failed with exit code ${result.status}`);
      console.error(`Error details: ${result.stderr || 'Unknown'}`);
      continue;
    }

    const generatedText = result.stdout ? result.stdout.trim() : '';
    if (!generatedText) {
      console.error(`❌ Received empty content from Gemini CLI.`);
      continue;
    }

    // Save generated content
    fs.writeFileSync(contentPath, generatedText + '\n', 'utf8');
    console.log(`✅ Success! Generated section saved to: ${dir}/content.md (${generatedText.length} characters) in ${elapsed}s`);

    previousContent = generatedText;
  }

  console.log(`\n🎉 Content generation run completed!`);
}

main();
