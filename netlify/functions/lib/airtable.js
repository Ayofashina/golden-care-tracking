// Minimal Airtable REST API helper used by all Netlify Functions in this app.
// Reads credentials from environment variables — NEVER hardcode a token here.
//
// Required environment variables (set in Netlify site settings, NOT in this repo):
//   AIRTABLE_TOKEN    - a personal access token with data.records:read / data.records:write
//                        scope on the "Golden Care Tracking" base.
//   AIRTABLE_BASE_ID  - the base id, e.g. appVp4KY7nSwwpsXD

const API_ROOT = 'https://api.airtable.com/v0';

function getConfig() {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!token || !baseId) {
    throw new Error('Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID environment variable');
  }
  return { token, baseId };
}

async function airtableFetch(path, options = {}) {
  const { token, baseId } = getConfig();
  const url = `${API_ROOT}/${baseId}/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`Airtable API error ${res.status}: ${JSON.stringify(data)}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// List all records in a table, optionally filtered with a formula.
// Handles pagination automatically.
async function listAll(tableName, { filterByFormula, fields } = {}) {
  let records = [];
  let offset;
  do {
    const params = new URLSearchParams();
    if (filterByFormula) params.set('filterByFormula', filterByFormula);
    if (fields) fields.forEach(f => params.append('fields[]', f));
    if (offset) params.set('offset', offset);
    const qs = params.toString();
    const data = await airtableFetch(`${encodeURIComponent(tableName)}${qs ? '?' + qs : ''}`);
    records = records.concat(data.records || []);
    offset = data.offset;
  } while (offset);
  return records;
}

async function createRecords(tableName, records) {
  // Airtable allows max 10 records per POST.
  const out = [];
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    const data = await airtableFetch(encodeURIComponent(tableName), {
      method: 'POST',
      body: JSON.stringify({ records: batch, typecast: true }),
    });
    out.push(...(data.records || []));
  }
  return out;
}

async function updateRecords(tableName, records) {
  // records: [{id, fields}]
  const out = [];
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    const data = await airtableFetch(encodeURIComponent(tableName), {
      method: 'PATCH',
      body: JSON.stringify({ records: batch, typecast: true }),
    });
    out.push(...(data.records || []));
  }
  return out;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(body),
  };
}

module.exports = { airtableFetch, listAll, createRecords, updateRecords, json };
