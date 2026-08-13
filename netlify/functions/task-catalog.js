// GET /.netlify/functions/task-catalog
//     -> returns the 28-item compliance task catalog, read live from the
//        Airtable "TaskCatalog" table, shaped exactly like the old hardcoded
//        `TASKS` array in index.html:
//        [{ id, name, months: [1,2,...], cat, note, formId }, ...]
//
// Read-only: this data is meant to be edited directly in Airtable and show up
// on the site automatically. There is no corresponding save/edit UI on the
// site for task definitions, so no POST/PATCH is implemented here.

const { listAll, json } = require('./lib/airtable');

const TABLE = 'TaskCatalog';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    if (event.httpMethod === 'GET') {
      const records = await listAll(TABLE);
      const tasks = records.map(rec => {
        const f = rec.fields || {};
        let months = [];
        try { months = f.MonthsJSON ? JSON.parse(f.MonthsJSON) : []; } catch (e) { months = []; }
        return {
          id: f.TaskId,
          name: f.Name || '',
          months,
          cat: (f.Category && f.Category.name) || f.Category || '',
          note: f.Note || undefined,
          formId: f.FormId || null,
        };
      }).filter(t => t.id);
      return json(200, tasks);
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
