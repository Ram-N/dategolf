#!/usr/bin/env node
// Validation script for src/data/events.json
// Run: node scripts/validate-events.js

const fs = require('fs')
const path = require('path')

const eventsPath = path.join(__dirname, '../src/data/events.json')
const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'))

let errors = 0

function fail(msg) {
  console.error(`  ✗ ${msg}`)
  errors++
}

function pass(msg) {
  console.log(`  ✓ ${msg}`)
}

console.log(`\nValidating ${events.length} events...\n`)

// 1. Unique IDs
const ids = events.map(e => e.id)
const uniqueIds = new Set(ids)
if (uniqueIds.size === ids.length) {
  pass(`All ${ids.length} IDs are unique`)
} else {
  const seen = new Set()
  ids.forEach(id => {
    if (seen.has(id)) fail(`Duplicate ID: ${id}`)
    seen.add(id)
  })
}

// 2. Unique canonical names
const names = events.map(e => e.name)
const uniqueNames = new Set(names)
if (uniqueNames.size === names.length) {
  pass(`All ${names.length} names are unique`)
} else {
  const seen = new Set()
  names.forEach(n => {
    if (seen.has(n)) fail(`Duplicate name: ${n}`)
    seen.add(n)
  })
}

// 3. Valid years
const YEAR_MIN = -4000
const YEAR_MAX = new Date().getFullYear()
events.forEach(e => {
  if (typeof e.year !== 'number' || !Number.isInteger(e.year)) {
    fail(`Non-integer year: ${e.id} → ${e.year}`)
  } else if (e.year < YEAR_MIN || e.year > YEAR_MAX) {
    fail(`Year out of range [${YEAR_MIN}, ${YEAR_MAX}]: ${e.id} → ${e.year}`)
  }
})
pass('Year range check passed')

// 4. Required fields present
const REQUIRED = ['id', 'name', 'year', 'categories', 'region', 'aliases', 'description', 'difficulty', 'importance']
events.forEach(e => {
  for (const field of REQUIRED) {
    if (e[field] === undefined || e[field] === null || e[field] === '') {
      fail(`Missing field "${field}" on event: ${e.id}`)
    }
  }
  if (!Array.isArray(e.categories) || e.categories.length === 0) {
    fail(`Empty categories on: ${e.id}`)
  }
})
pass('Required fields check passed')

// 5. No date leakage in names (flag 4-digit years or "20th century" etc.)
const YEAR_PATTERN = /\b\d{4}\b/
const CENTURY_PATTERN = /\d+(st|nd|rd|th)\s+century/i
events.forEach(e => {
  if (YEAR_PATTERN.test(e.name)) {
    fail(`Year leaked in name: ${e.id} → "${e.name}"`)
  }
  if (CENTURY_PATTERN.test(e.name)) {
    fail(`Century reference in name: ${e.id} → "${e.name}"`)
  }
})
pass('Date leakage check passed')

// 6. Valid difficulty and importance
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard']
const VALID_IMPORTANCE = [1, 2, 3, 4, 5]
events.forEach(e => {
  if (!VALID_DIFFICULTIES.includes(e.difficulty)) {
    fail(`Invalid difficulty: ${e.id} → ${e.difficulty}`)
  }
  if (!VALID_IMPORTANCE.includes(e.importance)) {
    fail(`Invalid importance: ${e.id} → ${e.importance}`)
  }
})
pass('Difficulty and importance check passed')

// 7. Non-empty name and id
events.forEach(e => {
  if (!e.id || !e.id.trim()) fail(`Empty id`)
  if (!e.name || !e.name.trim()) fail(`Empty name on: ${e.id}`)
})
pass('Non-empty name/id check passed')

// Summary
console.log(`\n${'─'.repeat(40)}`)
if (errors === 0) {
  console.log(`✅ All checks passed! ${events.length} events are valid.\n`)
  process.exit(0)
} else {
  console.log(`❌ ${errors} error(s) found. Fix before shipping.\n`)
  process.exit(1)
}
