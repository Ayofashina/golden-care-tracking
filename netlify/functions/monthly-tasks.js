// GET  /.netlify/functions/monthly-tasks
//      -> returns the full checklist state object, same shape the app used to keep
//         in localStorage under the "goldencare" key:
//         { "2026-08": { "assessments-45d": { done, date, notes }, ... }, ... }
//
// POST /.netlify/functions/monthly-tasks
//      body: { key: "2026-08", taskId: "assessments-45d", data: { done, date, notes } }
//      -> upserts the single task-state record in Airtable.

const { listAll, createRecords, updateRecords, json } = require('./lib/airtable');

const TABLE = 'MonthlyTaskCompletions';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    if (event.httpMethod === 'GET') {
      const records = await listAll(TABLE);
      const state = {};
      for (const rec of records) {
        const f = rec.fields || {};
        const key = f.MonthKey;
        const taskId = f.TaskId;
        if (!key || !taskId) continue;
        if (!state[key]) state[key] = {};
        state[key][taskId] = {
          done: !!f.Done,
          date: f.Date || '',
          notes: f.Notes || '',
        };
      }
      return json(200, state);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { key, taskId, data } = body;
      if (!key || !taskId || !data) {
        return json(400, { error: 'key, taskId and data are required' });
      }
      const recordKey = `${key}_${taskId}`;
      const existing = await listAll(TABLE, {
        filterByFormula: `{RecordKey} = "${recordKey.replace(/"/g, '\\"')}"`,
      });
      const fields = {
        RecordKey: recordKey,
        MonthKey: key,
        TaskId: taskId,
        Done: !!data.done,
        Date: data.date || '',
        Notes: data.notes || '',
      };
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
