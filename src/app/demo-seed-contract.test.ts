import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const seedScriptPath = path.join(process.cwd(), 'src/scripts/seed.ts');
const seedRoutePath = path.join(process.cwd(), 'src/app/api/assignments/seed/route.ts');
const landingPagePath = path.join(process.cwd(), 'src/app/page.tsx');
const landingComponentPath = path.join(process.cwd(), 'src/components/landing/landing-page.tsx');
const demoCtaPath = path.join(process.cwd(), 'src/components/demo-seed-cta.tsx');

test('demo seed script exposes reusable idempotent seeding function', async () => {
  const source = await readFile(seedScriptPath, 'utf8');

  assert.match(source, /export\s+async\s+function\s+seedDemoAssignmentDataset\s*\(/);
  assert.match(source, /const\s+DEMO_SEED_MARKER\s*=\s*'wave2-2-1-demo-seed'/);
  assert.match(source, /mongoose\.startSession\(\)/);
  assert.match(source, /\.withTransaction\(/);
  assert.match(source, /Assignment\.find\(\{\s*seedMarker:\s*DEMO_SEED_MARKER\s*\}/);
  assert.match(source, /Assignment\.deleteMany\([\s\S]*\{\s*session\s*\}\)/);
  assert.match(source, /Submission\.insertMany\([\s\S]*\{\s*session\s*\}\)/);
  assert.match(source, /Cluster\.insertMany\([\s\S]*\{\s*session\s*\}\)/);
  assert.match(source, /Submission\.bulkWrite\([\s\S]*\{\s*session\s*\}\)/);
  assert.match(source, /assignment\.save\(\{\s*session\s*\}\)/);
  assert.doesNotMatch(source, /title:\s*\/\^\\\[DEMO\\\]\//);
  assert.match(source, /return\s*\{\s*assignmentId:/);
});

test('POST /api/assignments/seed returns assignment id and handles failures as JSON', async () => {
  const source = await readFile(seedRoutePath, 'utf8');

  assert.match(source, /export\s+async\s+function\s+POST\s*\(/);
  assert.match(source, /request\.headers\.get\('x-demo-token'\)/);
  assert.match(source, /process\.env\.DEMO_SEED_TOKEN/);
  assert.match(source, /if\s*\(!expectedToken\s*\|\|\s*!providedToken\s*\|\|\s*providedToken\s*!==\s*expectedToken\)/);
  assert.match(source, /process\.env\.ALLOW_DEMO_SEED/);
  assert.match(source, /process\.env\.NODE_ENV\s*===\s*'production'/);
  assert.match(source, /Response\.json\(\s*\{\s*error:\s*'Demo lähtestamine on tootmises keelatud\.'\s*\},\s*\{\s*status:\s*403\s*\}\s*\)/);
  assert.match(source, /seedDemoAssignmentDataset\(/);
  assert.match(source, /Response\.json\(\{\s*assignmentId\s*\},\s*\{\s*status:\s*201/);
  assert.match(source, /Demo lähtestamise võti on puudu või vale\./);
  assert.match(source, /Response\.json\(\{\s*error:\s*'Demo andmestiku loomine ebaõnnestus\.'\s*\},\s*\{\s*status:\s*500\s*\}\)/);
});

test('landing page demo CTA posts to seed endpoint and redirects to assignment', async () => {
  const [landingPageSource, landingComponentSource, demoCtaSource] = await Promise.all([
    readFile(landingPagePath, 'utf8'),
    readFile(landingComponentPath, 'utf8'),
    readFile(demoCtaPath, 'utf8'),
  ]);

  assert.match(landingPageSource, /LandingPage/);
  assert.match(landingComponentSource, /DemoSeedCta/);
  assert.match(demoCtaSource, /Proovi demot/);
  assert.match(demoCtaSource, /fetch\('\/api\/assignments\/seed',\s*\{\s*method:\s*'POST'/);
  assert.match(demoCtaSource, /headers:\s*demoSeedToken\s*\?/);
  assert.match(demoCtaSource, /'x-demo-token': demoSeedToken/);
  assert.match(demoCtaSource, /payload\.error\s*\|\|\s*'Demo andmestiku loomine ebaõnnestus\.'/);
  assert.match(demoCtaSource, /router\.push\(`\/teacher\/assignment\/\$\{assignmentId\}`\)/);
  assert.doesNotMatch(demoCtaSource, /Demo nupp ei ole seadistatud\./);
});
