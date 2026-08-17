// test-color-popover.js - TDD Unit Tests for Hex Color Detection and Inline Modification
import test from 'node:test';
import assert from 'node:assert';

test('▶ CyberEditor - Color Picker Detection Tests', async (t) => {
  await t.test('should accurately detect and extract hex colors under the cursor position', () => {
    const text = "MATCH (memory #ec4899) -[:SYNCS_WITH {color: '#00d2ff'}]-> (sync)";
    const hexColorRegex = /(#[0-9a-fA-F]{6})/g;
    
    // Simulate cursor positioned in the middle of '#ec4899' (index 18)
    const cursorPos = 18; 
    let match;
    let foundColor = null;
    let foundOffset = -1;

    hexColorRegex.lastIndex = 0; // reset
    while ((match = hexColorRegex.exec(text)) !== null) {
      const start = match.index;
      const end = hexColorRegex.lastIndex;
      
      if (cursorPos >= start && cursorPos <= end) {
        foundColor = match[1];
        foundOffset = start;
        break;
      }
    }

    assert.strictEqual(foundColor, '#ec4899', 'Should detect the pink hex color');
    assert.strictEqual(foundOffset, 14, 'Should identify the exact string offset of the color');
  });

  await t.test('should inject the new color and replace exactly 7 characters without altering surrounding text', () => {
    const text = "MATCH (memory #ec4899) -[:SYNCS_WITH]->";
    const start = 14;
    const newColor = "#ff0000";

    const updatedText = text.slice(0, start) + newColor + text.slice(start + 7);
    assert.strictEqual(updatedText, "MATCH (memory #ff0000) -[:SYNCS_WITH]->", "Should securely splice the new color in-place");
  });
});
