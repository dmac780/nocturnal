/**
 * console-colors.js — ANSI color helpers for CLI/build output.
 * No-op when stdout is not a TTY or NO_COLOR is set (https://no-color.org).
 */

const enabled = process.stdout.isTTY && process.env.NO_COLOR == null;
const reset = '\x1b[0m';


/**
 * Wrap text in a color
 * @param {number} code - The color code
 * @param {string} text - The text to wrap
 * @returns {string} The wrapped text
 */
function wrap(code, text) {
  return enabled ? `\x1b[${code}m${text}${reset}` : text;
}


/**
 * Wrap text in green color
 * @param {string} text - The text to wrap
 * @returns {string} The wrapped text
 */
export function green(text) {
  return wrap(32, text);
}


/**
 * Wrap text in red color
 * @param {string} text - The text to wrap
 * @returns {string} The wrapped text
 */
export function red(text) {
  return wrap(31, text);
}


/**
 * Wrap text in yellow color
 * @param {string} text - The text to wrap
 * @returns {string} The wrapped text
 */
export function yellow(text) {
  return wrap(33, text);
}


/**
 * Wrap text in dim color
 * @param {string} text - The text to wrap
 * @returns {string} The wrapped text
 */
export function dim(text) {
  return wrap(2, text);
}
