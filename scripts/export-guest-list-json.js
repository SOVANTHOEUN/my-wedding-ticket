#!/usr/bin/env node
/**
 * Export guest list as JSON for Vercel env var GUEST_LIST_JSON.
 * Run: node scripts/export-guest-list-json.js
 * Copy the output to Vercel dashboard > Project > Settings > Environment Variables
 */

const { GUEST_LIST } = require('../js/guests.js');
const json = JSON.stringify(GUEST_LIST);
console.log('Add this to Vercel env var GUEST_LIST_JSON:\n');
console.log(json);
