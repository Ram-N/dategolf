#!/usr/bin/env node
// Validation script for src/data/durations.json (DateFlow duration bars)
// Run: node scripts/validate-durations.cjs

const fs = require('fs')
const path = require('path')

const durations = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/durations.json'), 'utf8'))

let errors = 0
const fail = (msg) => {
  console.error(`  ✗ ${msg}`)
  errors++
}
const pass = (msg) => console.log(`  ✓ ${msg}`)

console.log(`\nValidating ${durations.length} durations...\n`)

// 1. Unique IDs and names
for (const field of ['id', 'name']) {
  const seen = new Set()
  durations.forEach((d) => {
    if (seen.has(d[field])) fail(`Duplicate ${field}: ${d[field]}`)
    seen.add(d[field])
  })
}
pass('IDs and names are unique')

// 2. Required fields
const REQUIRED = ['id', 'name', 'startYear', 'endYear', 'description', 'categories', 'region', 'importance', 'kind']
durations.forEach((d) => {
  for (const field of REQUIRED) {
    if (d[field] === undefined || d[field] === null || d[field] === '') fail(`Missing "${field}" on: ${d.id}`)
  }
  if (!Array.isArray(d.categories) || d.categories.length === 0) fail(`Empty categories on: ${d.id}`)
})
pass('Required fields check passed')

// 3. Years: integers, in range, start ≤ end
const YEAR_MIN = -4000
const YEAR_MAX = new Date().getFullYear()
durations.forEach((d) => {
  for (const f of ['startYear', 'endYear']) {
    if (!Number.isInteger(d[f]) || d[f] < YEAR_MIN || d[f] > YEAR_MAX) fail(`Bad ${f}: ${d.id} → ${d[f]}`)
  }
  if (d.startYear > d.endYear) fail(`startYear after endYear: ${d.id}`)
})
pass('Year checks passed')

// 4. Kind, importance, approximate flag
durations.forEach((d) => {
  if (!['state', 'period'].includes(d.kind)) fail(`Invalid kind: ${d.id} → ${d.kind}`)
  if (!Number.isInteger(d.importance) || d.importance < 1 || d.importance > 9) fail(`Invalid importance: ${d.id} → ${d.importance}`)
  if (d.approximate !== undefined && typeof d.approximate !== 'boolean') fail(`approximate must be boolean: ${d.id}`)
  if (d.significance !== undefined && (typeof d.significance !== 'string' || !d.significance.trim()))
    fail(`Empty or non-text significance on: ${d.id}`)
})
pass('Kind / importance checks passed')

// 5. Life-cycle phases (Phase 12): contiguous, covering the span, neutral kinds
const PHASE_KINDS = ['foundation', 'expansion', 'consolidation', 'height', 'transformation', 'contraction', 'end']
durations.forEach((d) => {
  if (d.phases === undefined) return
  const p = d.phases
  if (!Array.isArray(p) || p.length < 2) return fail(`phases must be a list of 2 or more: ${d.id}`)
  if (p[0].start !== d.startYear || p[p.length - 1].end !== d.endYear) fail(`phases don't cover the span: ${d.id}`)
  p.forEach((x, i) => {
    if (!PHASE_KINDS.includes(x.kind)) fail(`Invalid phase kind on ${d.id}: ${x.kind}`)
    if (!x.title || !x.description) fail(`Phase without a title or description on: ${d.id}`)
    if (!(x.start < x.end)) fail(`Phase starts after it ends on: ${d.id}`)
    if (i > 0 && x.start !== p[i - 1].end) fail(`Phases not contiguous on: ${d.id} (${p[i - 1].end} → ${x.start})`)
  })
})
pass('Phase checks passed')

// 6. People (Phase 13): a flag and an optional role
durations.forEach((d) => {
  if (d.person !== undefined && d.person !== true) fail(`person must be true when present: ${d.id}`)
  if (d.role !== undefined && (!d.person || typeof d.role !== 'string' || !d.role.trim())) fail(`role without a person, or empty: ${d.id}`)
})
pass('People checks passed')

console.log(errors === 0 ? '\n✅ All checks passed\n' : `\n❌ ${errors} error(s)\n`)
process.exit(errors === 0 ? 0 : 1)
