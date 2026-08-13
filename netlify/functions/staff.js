// GET /.netlify/functions/staff
//     -> returns staff roster, read live from the Airtable "Staff" table:
//        [{ id, name, fullName, role, dob }, ...]
//
//     `id` is the StaffKey field, which the front-end also uses as a stable
//     lookup key in a couple of places (e.g. matching signature images to a
//     specific staff member) — it must stay in sync with what's in Airtable.
//
// Read-only: staff records are edited directly in Airtable. There is no
// staff-edit/save UI on the site itself (the site only consumes staff data
// to pre-fill forms), so no POST/PATCH is implemented here.

const { listAll, json } = require('./lib/airtable');

const TABLE = 'Staff';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    if (event.httpMethod === 'GET') {
      const records = await listAll(TABLE);
      const staff = records.map(rec => {
        const f = rec.fields || {};
        return {
          id: f.StaffKey,
          name: f.Name || '',
          fullName: f.FullName || f.Name || '',
          role: f.Role || '',
          dob: f.DOB || '',
        };
      }).filter(s => s.id);
      return json(200, staff);
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
