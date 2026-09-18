// Retain all original Panda regression checks, then exercise the new hit/dodge cases.
await import('./panda-browser-core.mjs');
if(!process.exitCode)await import('./panda-combat-browser.mjs');
