// GET  /.netlify/functions/calendar-checks
//      -> { "taskId_month_year": true|false, ... }  (replaces the old per-key
//         localStorage entries "gcc_calendar_<taskId>_<month>_<year>")
//
// POST /.netlify/functions/calendar-checks
//      body: { taskId, month, year, checked }
//      -> upserts a single calendar checkbox state.

const { listAll, createRecords, updateRecords, json } = require('./lib/airtable');

const TABLE = 'CalendarChecks';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    if (event.httpMethod === 'GET') {
      const records = await listAll(TABLE);
      const out = {};
      for (const rec of records) {
        const f = rec.fields || {};
        if (!f.TaskId) continue;
        out[`${f.TaskId}_${f.Month}_${f.Year}`] = !!f.Checked;
      }
      return json(200, out);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { taskId, month, year, checked } = body;
      if (!taskId || !month || !year) {
        return json(400, { error: 'taskId, month and year are required' });
      }
      const recordKey = `${taskId}_${month}_${year}`;
      const existing = await listAll(TABLE, {
        filterByFormula: `{RecordKey} = "${recordKey.replace(/"/g, '\\"')}"`,
      });
      const fields = {
        RecordKey: recordKey,
        TaskId: taskId,
        Month: Number(month),
        Year: Number(year),
        Checked: !!checked,
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
