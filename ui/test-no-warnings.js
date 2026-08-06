// test-no-warnings.js - Production Build Compiler Warnings & Deprecations Gate Test
import { execSync } from 'child_process';
import test from 'node:test';
import assert from 'node:assert';

test('▶ Holds Svelte Compiler - Warnings & Deprecations Gating', () => {
  console.log("RUNNING VITE PRODUCTION BUILD TO CAPTURE COMPILE WARNINGS...");
  
  try {
    const output = execSync('npm run build', { encoding: 'utf-8', stdio: 'pipe' });
    
    // Check if there are any svelte compiler warnings, deprecations, or a11y warnings in the output
    const hasWarnings = output.includes('Using `on:') || 
                        output.toLowerCase().includes('deprecated') || 
                        output.toLowerCase().includes('must have an aria role') ||
                        output.toLowerCase().includes('a11y_');
    
    if (hasWarnings) {
      console.error("\n❌ COMPILER WARNINGS DETECTED IN VITE BUILD OUTPUT:\n", output);
    }
    
    assert.strictEqual(hasWarnings, false, "Production build must compile cleanly with 0 Svelte compiler warnings, deprecations, or a11y warnings!");
    console.log("🟢 VITE BUILD COMPILED SUCCESSFULLY WITH 0 COMPILER WARNINGS!");
  } catch (error) {
    const fullOutput = (error.stdout || '') + "\n" + (error.stderr || '');
    const hasWarnings = fullOutput.includes('Using `on:') || 
                        fullOutput.toLowerCase().includes('deprecated') || 
                        fullOutput.toLowerCase().includes('must have an aria role') ||
                        fullOutput.toLowerCase().includes('a11y_');
                        
    if (hasWarnings) {
      assert.fail("Production build contains Svelte compiler warnings or deprecations!\n" + fullOutput);
    } else {
      assert.fail("Production build failed to execute:\n" + fullOutput);
    }
  }
});