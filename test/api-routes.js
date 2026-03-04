/**
 * Test API route resolution (buildApiRoutes + matchRoute) without starting the server.
 * Run from project root: node test/api-routes.js  or  npm run test:api
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { buildApiRoutes, matchRoute } from '../lib/ssr-api.js';
import { green, red } from '../lib/console-colors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

let failed = 0;

function ok(name, condition) {
  if (condition) {
    console.log(`  ${green('ok')} ${name}`);
  } else {
    console.log(`  ${red('FAIL')} ${name}`);
    failed++;
  }
}

console.log('API route tests (buildApiRoutes + matchRoute)\n');

const routes = buildApiRoutes(root);

ok('buildApiRoutes returns array', Array.isArray(routes));
ok('has at least one route', routes.length >= 1);

const formExampleRoute = routes.find((r) => r.segments.join('/') === 'form-example');
ok('finds static route form-example', !!formExampleRoute);

const matchForm = matchRoute(routes, ['form-example']);
ok('matchRoute(["form-example"]) returns match', !!matchForm);
if (matchForm) {
  ok('match /api/form-example has no params', Object.keys(matchForm.params).length === 0);
  ok('match /api/form-example is static file', matchForm.route.segments[0] === 'form-example');
}

const noMatchRandom = matchRoute(routes, ['nonexistent']);
ok('matchRoute(["nonexistent"]) returns null', noMatchRandom === null);

console.log('');
if (failed > 0) {
  console.log(`${red(String(failed))} test(s) failed.`);
  process.exit(1);
}
console.log(`${green('All route tests passed.')}`);
process.exit(0);
