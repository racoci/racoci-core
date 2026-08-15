// TextMateLexer.ts - Lightweight Regular-Expression based TextMate Scope Lexer
export interface HighlightToken {
  content: string;
  scopes: string[];
}

export interface TextMatePattern {
  name: string;
  match: string;
}

export interface TextMateGrammar {
  scopeName: string;
  patterns: TextMatePattern[];
}

export class TextMateLexer {
  private baseScope: string;
  private patterns: { scope: string; regex: RegExp }[] = [];

  constructor(grammar: TextMateGrammar) {
    this.baseScope = grammar.scopeName || 'source';
    if (grammar.patterns) {
      grammar.patterns.forEach(p => {
        if (p.match && p.name) {
          try {
            // Compile regular expression with global flag to find all match offsets
            this.patterns.push({
              scope: p.name,
              regex: new RegExp(p.match, 'g')
            });
          } catch (e) {
            console.error(`Failed to compile TextMate regex pattern: ${p.match}`, e);
          }
        }
      });
    }
  }

  /**
   * Tokenize input text into a list of non-overlapping tokens mapped to semantic scopes.
   */
  tokenize(text: string): HighlightToken[] {
    if (!text) return [];

    interface MatchRecord {
      start: number;
      end: number;
      scope: string;
      content: string;
    }
    const matches: MatchRecord[] = [];

    // 1. Collect all matches of all regular expressions
    this.patterns.forEach(p => {
      p.regex.lastIndex = 0;
      let m;
      while ((m = p.regex.exec(text)) !== null) {
        const start = m.index;
        const end = p.regex.lastIndex;
        if (start === end) {
          // Avoid infinite loops for zero-width assertions (like boundaries)
          p.regex.lastIndex++;
          continue;
        }
        matches.push({
          start,
          end,
          scope: p.scope,
          content: m[0]
        });
      }
    });

    // 2. Sort matches: earliest start first; on tie, longest match first
    matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return (b.end - b.start) - (a.end - a.start);
    });

    // 3. Resolve overlaps (first non-overlapping match wins)
    const activeMatches: MatchRecord[] = [];
    let lastIdx = 0;

    matches.forEach(m => {
      if (m.start >= lastIdx) {
        activeMatches.push(m);
        lastIdx = m.end;
      }
    });

    // 4. Build output tokens list, inserting plain text fallback tokens for gaps
    const tokens: HighlightToken[] = [];
    let currentIdx = 0;

    activeMatches.forEach(m => {
      if (m.start > currentIdx) {
        // Plain text gap token inheriting the grammar base scope
        tokens.push({
          content: text.slice(currentIdx, m.start),
          scopes: [this.baseScope]
        });
      }
      tokens.push({
        content: m.content,
        scopes: [m.scope]
      });
      currentIdx = m.end;
    });

    // Any remaining trailing characters get grouped into a final plain text token
    if (currentIdx < text.length) {
      tokens.push({
        content: text.slice(currentIdx),
        scopes: [this.baseScope]
      });
    }

    return tokens;
  }
}
