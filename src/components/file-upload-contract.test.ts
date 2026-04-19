import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const fileUploadPath = new URL("./file-upload.tsx", import.meta.url);

test("file upload copy is localized to Estonian and keeps accessibility affordances", async () => {
  const source = await readFile(fileUploadPath, "utf8");

  assert.match(source, /Lisa foto/);
  assert.match(source, /Lohista siia või vali fail \(max 5 MB\)\./);
  assert.match(source, /Vali fail/);
  assert.match(source, /Kasuta kaamerat/);
  assert.match(source, /Eelvaade/);
  assert.match(source, /Üles laaditud lahenduse eelvaade/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /aria-atomic="true"/);
  assert.match(source, /onClick=\{\(\) => fileInputRef\.current\?\.click\(\)\}/);
  assert.match(source, /onClick=\{\(\) => cameraInputRef\.current\?\.click\(\)\}/);
  assert.match(source, /ref=\{cameraInputRef\}[\s\S]*capture="environment"/);
  assert.match(source, /var\(--color-(brand|surface|text|border)\)/);
  assert.doesNotMatch(source, /<label[\s\S]*Kasuta kaamerat/);
  assert.doesNotMatch(source, /(zinc|rose|indigo)-\d{2,3}/);

  assert.doesNotMatch(source, /Upload a photo of your work/);
  assert.doesNotMatch(source, /Drag and drop an image here, or choose one from your device\. Max 5MB\./);
  assert.doesNotMatch(source, /Choose file/);
  assert.doesNotMatch(source, /Use camera/);
  assert.doesNotMatch(source, /Preview/);
  assert.doesNotMatch(source, /Uploaded work preview/);
});
