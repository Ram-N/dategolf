#!/usr/bin/env node
// Validation script for src/data/relationships.json (DateFlow Connections, doc 09 Phase 8)
// Run: node scripts/validate-relationships.cjs

const fs = require('fs')
const path = require('path')

const read = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data', f), 'utf8'))
const { types, links } = read('relationships.json')
const ids = new Set([...read('events.json'), ...read('durations.json')].map((x) => x.id))

let errors = 0
const fail = (msg) => {
  console.error(`  ✗ ${msg}`)
  errors++
}
const pass = (msg) => console.log(`  ✓ ${msg}`)

console.log(`\nValidating ${links.length} links...\n`)

// 1. Every type has both readings
for (const [t, def] of Object.entries(types)) {
  if (!def.label || !def.inverse) fail(`Type ${t} needs a label and an inverse`)
}
pass('Every type has a label and an inverse')

// 2. Every link: known type, both ends exist, not a self-link, has a why
const seen = new Set()
for (const l of links) {
  const where = `${l.source} ${l.type} ${l.target}`
  if (!types[l.type]) fail(`${where}: unknown type`)
  for (const end of [l.source, l.target]) if (!ids.has(end)) fail(`${where}: ${end} is not in events.json or durations.json`)
  if (l.source === l.target) fail(`${where}: links to itself`)
  if (!l.why) fail(`${where}: no why`)
  if (seen.has(where)) fail(`${where}: duplicate`)
  seen.add(where)
}
pass('Every link has a known type, a why, and ends that exist')

if (errors) {
  console.error(`\n${errors} error(s)\n`)
  process.exit(1)
}
console.log('\nAll checks passed.\n')
