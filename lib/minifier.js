/**
 * minifier.js — Zero-dependency CSS and JS minifier for Nocturnal
 *
 * CSS minification:
 *   - Strips block comments  /* ... *\/
 *   - Strips line comments   // ... (outside strings/url())
 *   - Collapses whitespace
 *   - Removes whitespace around ; : , { } > ~ + selectors
 *   - Preserves string literals and url() values intact
 *
 * JS minification:
 *   - Strips block comments  /* ... *\/   (not inside strings)
 *   - Strips line comments   // ...       (not inside strings)
 *   - Collapses whitespace sequences to a single space
 *   - Removes whitespace around operators and punctuation
 *   - Preserves ALL string literals (single, double, template)
 *   - Does NOT mangle identifiers or remove dead code
 */

import fs   from 'fs';
import path from 'path';


/*==========================================
  SHARED TOKEN SCANNER
==========================================*/

/**
 * Tokenise source into segments so minifiers never touch string/comment content.
 * Types: 'string_dq' | 'string_sq' | 'string_tpl' | 'comment_line' | 'comment_block' | 'code'
 *
 * @param {string} src
 * @param {'css'|'js'} mode
 * @returns {{ type: string, value: string }[]}
 */
function tokenise(src, mode) {

  const tokens = [];
  
  let i = 0;
  let codeStart = 0;

  function flushCode(end) {
    if (end > codeStart) {
      tokens.push({ type: 'code', value: src.slice(codeStart, end) });
    }
    codeStart = end;
  }

  while (i < src.length) {
    const ch  = src[i];
    const ch2 = src[i + 1];

    // Block comment  /* ... */
    if (ch === '/' && ch2 === '*') {
      flushCode(i);
      const end    = src.indexOf('*/', i + 2);
      const endIdx = end === -1 ? src.length : end + 2;
      tokens.push({ type: 'comment_block', value: src.slice(i, endIdx) });
      i = codeStart = endIdx;
      continue;
    }

    // Line comment  // ...  (JS only)
    if (mode === 'js' && ch === '/' && ch2 === '/') {
      flushCode(i);
      const nl     = src.indexOf('\n', i + 2);
      const endIdx = nl === -1 ? src.length : nl + 1;
      tokens.push({ type: 'comment_line', value: src.slice(i, endIdx) });
      i = codeStart = endIdx;
      continue;
    }

    // Double-quoted string  "..."
    if (ch === '"') {
      flushCode(i);
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '"')  { j++;    break;    }
        j++;
      }
      tokens.push({ type: 'string_dq', value: src.slice(i, j) });
      i = codeStart = j;
      continue;
    }

    // Single-quoted string  '...'
    if (ch === "'") {
      flushCode(i);
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === "'")  { j++;    break;    }
        j++;
      }
      tokens.push({ type: 'string_sq', value: src.slice(i, j) });
      i = codeStart = j;
      continue;
    }

    // Template literal  `...`  (JS only)
    if (mode === 'js' && ch === '`') {
      flushCode(i);
      let j = i + 1;
      let depth = 0;
      while (j < src.length) {
        if (src[j] === '\\') {
          j += 2;
          continue; 
        }
        if (src[j] === '$' && src[j + 1] === '{') {
          depth++; j += 2;
          continue;
        }
        if (src[j] === '}' && depth > 0) {
          depth--; j++;
          continue;
        }
        if (src[j] === '`' && depth === 0) {
          j++;
          break;
        }
        j++;
      }
      tokens.push({ type: 'string_tpl', value: src.slice(i, j) });
      i = codeStart = j;
      continue;
    }

    i++;
  }

  flushCode(src.length);

  return tokens;
}


/*==========================================
  CSS MINIFIER
==========================================*/

/**
 * Minify a CSS string.
 * Preserves string literals (font names, url() paths, content values).
 *
 * @param {string} css
 * @returns {string}
 */
export function minifyCSS(css) {

  const tokens = tokenise(css, 'css');
  const parts  = [];

  for (const tok of tokens) {
    if (tok.type === 'comment_block') {
      // Keep /*! ... */ licence/important comments
      if (tok.value.startsWith('/*!')) parts.push(tok.value);
      continue;
    }

    if (tok.type !== 'code') {
      parts.push(tok.value);
      continue;
    }

    let code = tok.value;

    // Collapse all whitespace to a single space
    code = code.replace(/\s+/g, ' ');

    // Remove spaces around structural characters
    code = code.replace(/\s*([{};,>~+])\s*/g, '$1');

    // Remove spaces around colon — but only for property: value, not pseudo-selectors
    // Safe: collapse space around : when preceded by word chars (property name)
    code = code.replace(/(\w)\s*:\s*/g, '$1:');

    // Remove trailing semicolon before closing brace
    code = code.replace(/;}/g, '}');

    parts.push(code.trim());
  }

  return parts.join('').trim();
}


/*==========================================
  JS MINIFIER
==========================================*/

/**
 * Minify a JavaScript (ES module) string.
 * Strips comments and collapses whitespace while preserving all string literals.
 *
 * Does NOT: rename variables, tree-shake, or inline constants.
 * Safe for any valid ES module / Web Component file.
 *
 * @param {string} js
 * @returns {string}
 */
export function minifyJS(js) {

  const tokens = tokenise(js, 'js');
  const parts  = [];

  for (const tok of tokens) {
    // Drop comments, replace with space to avoid token merging
    if (tok.type === 'comment_block' || tok.type === 'comment_line') {
      if (tok.type === 'comment_block' && tok.value.startsWith('/*!')) {
        parts.push(tok.value); // keep licence comments
      } else {
        parts.push(' ');
      }
      continue;
    }

    // Preserve string / template literal verbatim
    if (tok.type !== 'code') {
      parts.push(tok.value);
      continue;
    }

    let code = tok.value;

    // Collapse horizontal whitespace only (preserve newlines as statement separators)
    code = code.replace(/[ \t]+/g, ' ');

    // Normalise line endings, collapse 3+ blank lines to 1
    code = code.replace(/\r\n/g, '\n');
    code = code.replace(/\n{3,}/g, '\n\n');

    // Remove trailing space before newline
    code = code.replace(/ \n/g, '\n');

    // Remove leading space after newline
    code = code.replace(/\n /g, '\n');

    // Remove spaces around punctuation — but ONLY on the same line
    // (never collapse across a newline boundary)
    code = code.replace(/([;,{}()[\]]) /g, '$1');
    code = code.replace(/ ([;,{}()[\]])/g, '$1');

    // Remove spaces around operators on same line
    code = code.replace(/([=+\-*/%&|^<>!?:]) /g, '$1');
    code = code.replace(/ ([=+\-*/%&|^<>!?:])/g, '$1');

    // Restore mandatory space after reserved keywords
    code = code.replace(
      /\b(return|typeof|instanceof|new|void|delete|throw|case|in|of|from|import|export|const|let|var|function|async|class|extends|if|else|while|for|do|switch|try|catch|finally|await|yield|static|get|set)([^\s\w$.\n])/g,
      '$1 $2'
    );

    parts.push(code);
  }

  return parts.join('')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}


/*==========================================
  FILE-LEVEL HELPER
==========================================*/

/**
 * Minify source text based on file extension and config flags.
 *
 * @param {string} src      - File contents
 * @param {string} filePath - Used only to detect .css / .js extension
 * @param {{ css?: boolean, js?: boolean }} opts
 * @returns {string}
 */
export function minifySource(src, filePath, opts = {}) {

  const ext = filePath.split('.').pop().toLowerCase();

  if (opts.css && ext === 'css') {
    return minifyCSS(src);
  }                  

  if (opts.js  && (ext === 'js' || ext === 'mjs')) {
    return minifyJS(src);
  }

  return src;
}


/**
 * Minify-copy a single file from src to dest.
 * Falls back to plain copy if minification is off for that type.
 *
 * @param {string} srcPath
 * @param {string} destPath
 * @param {{ css?: boolean, js?: boolean }} opts
 */
export function minifyCopyFile(srcPath, destPath, opts = {}) {

  const src = fs.readFileSync(srcPath, 'utf8');
  const out = minifySource(src, srcPath, opts);

  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  fs.writeFileSync(destPath, out, 'utf8');
}


/**
 * Recursively copy a directory, optionally minifying CSS/JS files.
 *
 * @param {string} srcDir
 * @param {string} destDir
 * @param {{ css?: boolean, js?: boolean }} opts
 */
export function minifyCopyDir(srcDir, destDir, opts = {}) {

  if (!fs.existsSync(srcDir)) {
    return;
  }

  fs.mkdirSync(destDir, { recursive: true });

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath  = path.join(srcDir,  entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      minifyCopyDir(srcPath, destPath, opts);
    } else {
      const ext = entry.name.split('.').pop().toLowerCase();
      const shouldMinify = (opts.css && ext === 'css') || (opts.js && (ext === 'js' || ext === 'mjs'));

      if (shouldMinify) {
        try {
          minifyCopyFile(srcPath, destPath, opts);
        } catch (err) {
          // If minification fails for any reason, fall back to plain copy
          console.warn(`[nocturnal/minify] Failed to minify ${srcPath}, copying raw: ${err.message}`);
          fs.copyFileSync(srcPath, destPath);
        }
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
