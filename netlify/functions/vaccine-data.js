// GET  /.netlify/functions/vaccine-data
//      -> { staff: [...], residents: [...] }  (same shape as the old VAX_DEFAULT /
//         localStorage "gcc_vaccine_data" object)
//
// POST /.netlify/functions/vaccine-data
//      body: { staff: [...], residents: [...] }
//      -> upserts every row (keyed by section + index) in Airtable.

const { listAll, createRecords, updateRecords, json } = require('./lib/airtable');

const TABLE = 'VaccineRecords';

const ROW_FIELDS = {
  name: 'Name',
  role: 'Role',
  fluStatus: 'FluStatus',
  fluDate: 'FluDate',
  fluMfr: 'FluMfr',
  covidStatus: 'CovidStatus',
  covidDate: 'CovidDate',
  covidMfr: 'CovidMfr',
  proof: 'Proof',
  verifiedBy: 'VerifiedBy',
};

function rowToFields(row, section, idx) {
  const fields = { RowKey: `${section}-${idx}`, Section: section, SortOrder: idx };
  for (const [jsKey, airtableField] of Object.entries(ROW_FIELDS)) {
    fields[airtableField] = row[jsKey] || '';
  }
  return fields;
}

function recordToRow(rec) {
  const f = rec.fields || {};
  const row = {};
  for (const [jsKey, airtableField] of Object.entries(ROW_FIELDS)) {
    row[jsKey] = f[airtableField] || '';
  }
  return row;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    if (event.httpMethod === 'GET') {
      const records = await listAll(TABLE);
      const staff = records
        .filter(r => (r.fields || {}).Section === 'staff')
        .sort((a, b) => (a.fields.SortOrder || 0) - (b.fields.SortOrder || 0))
        .map(recordToRow);
      const residents = records
        .filter(r => (r.fields || {}).Section === 'residents')
        .sort((a, b) => (a.fields.SortOrder || 0) - (b.fields.SortOrder || 0))
        .map(recordToRow);
      return json(200, { staff, residents });
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { staff = [], residents = [] } = body;
      const existing = await listAll(TABLE);
      const byRowKey = {};
      existing.forEach(rec => { byRowKey[(rec.fields || {}).RowKey] = rec; });

      const toCreate = [];
      const toUpdate = [];

      [['staff', staff], ['residents', residents]].forEach(([section, rows]) => {
        rows.forEach((row, idx) => {
          const rowKey = `${section}-${idx}`;
          const fields = rowToFields(row, section, idx);
          const existingRec = byRowKey[rowKey];
          if (existingRec) {
            toUpdate.push({ id: existingRec.id, fields });
          } else {
            toCreate.push({ fields });
          }
        });
      });

      if (toUpdate.length) await updateRecords(TABLE, toUpdate);
      if (toCreate.length) await createRecords(TABLE, toCreate);

      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
