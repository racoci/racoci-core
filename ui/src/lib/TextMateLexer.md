# TextMateLexer Specification

`TextMateLexer` is a highly optimized, lightweight regular-expression based syntax highlighter that parses text using standard `.tmLanguage.json` schema definitions.

## Key Architecture

### 1. Regex Token Compilation
During instantiation, the lexer reads a JSON-based grammar dictionary, parses each matching rule, and compiles them into global, stateful Javascript `RegExp` objects:
```typescript
new RegExp(pattern.match, 'g');
```

### 2. Overlap Resolution Algorithm
Since multiple regexes can compete for the same offsets (e.g. `MATCH` can match the keyword rule, but a comment `// MATCH` would also capture it), the lexer applies a deterministic sorting and overlap resolution algorithm:
1. **Match Phase:** Collects all matches across all compiled patterns with starting/ending offsets.
2. **Sorting Phase:** Sorts matches by starting index ascending. If there is a tie, it sorts by matching length descending (longest match wins).
3. **Sifting Phase:** Iterates over sorted matches and discards any match that overlaps with an already selected token.
4. **Token Assembly:** Iterates over the selected non-overlapping matches, injecting base-scope plain text tokens to cover any gaps.

## Usage Example
```typescript
import { TextMateLexer } from './TextMateLexer';

const lexer = new TextMateLexer({
  scopeName: 'source.hcypher',
  patterns: [
    { name: 'keyword.control', match: '\\bMATCH\\b' }
  ]
});

const tokens = lexer.tokenize('MATCH (kernel)');
```
