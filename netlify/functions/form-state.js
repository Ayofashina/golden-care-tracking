// GET  /.netlify/functions/form-state?formKey=<key>
//      -> { state: { ...checkbox state object... } }  (replaces the old
//         localStorage "gcb_<formKey>" entries used by the Generate Forms tab)
//
// POST /.netlify/functions/form-state
//      body: { formKey, state }
//      -> upserts the saved checkbox state for that form.

const { listAll, createRecords, updateRecords, json } = require('./lib/airtable');

const TABLE = 'FormCheckboxState';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    if (event.httpMethod === 'GET') {
      const formKey = (event.queryStringParameters || {}).formKey;
      if (!formKey) return json(400, { error: 'formKey query param is required' });
      const existing = await listAll(TABLE, {
        filterByFormula: `{FormKey} = "${formKey.replace(/"/g, '\\"')}"`,
      });
      if (!existing.length) return json(200, { state: null });
      let state = null;
      try { state = JSON.parse(existing[0].fields.StateJSON || 'null'); } catch (e) { state = null; }
      return json(200, { state });
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { formKey, state } = body;
      if (!formKey) return json(400, { error: 'formKey is required' });
      const existing = await listAll(TABLE, {
        filterByFormula: `{FormKey} = "${formKey.replace(/"/g, '\\"')}"`,
      });
      const fields = { FormKey: formKey, StateJSON: JSON.stringify(state || {}) };
      if (existing.length) {
        await updateRecords(TABLE, [{ id: existing[0].id, fields }]);
      } else {
        await createRecords(TABLE, [{ fields }]);
      }
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
