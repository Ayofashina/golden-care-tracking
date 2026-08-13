// GET /.netlify/functions/residents
//     -> returns the full resident roster + service-plan detail, read live
//        from the Airtable "Residents" table, shaped exactly like the old
//        hardcoded `SERVICE_PLAN_RESIDENTS` array in index.html (one object
//        per resident with id, demographics, and diagnosis/adl/behavioral
//        arrays).
//
//     `id` is the ResidentKey field (e.g. "watson", "sproat") — this is the
//     same key the front-end already uses for openServicePlan(id) lookups.
//
//     DiagnosisJSON / ADLJSON / BehavioralJSON are stored in Airtable as
//     JSON-encoded text (arrays of {dx,plan,freq,by} / {activity,help,by,
//     when,comments} / {activity,occurrence,comments,when,by} objects) —
//     they're parsed back into real arrays here so the front-end doesn't
//     have to.
//
// Read-only: the previous migration pass found the Service Plan tab's
// resident fields are print-only `contenteditable` spans with no save
// handler wired up (they're for editing a printed page in the browser
// before printing, not for persisting changes). There is no actual
// edit/save path for resident data in the current UI, so this endpoint is
// read-only — edit residents directly in Airtable and the site picks it up
// automatically. If a real "Save changes" action is ever added to the
// Service Plan UI, add a POST/PATCH here mirroring monthly-tasks.js.

const { listAll, json } = require('./lib/airtable');

const TABLE = 'Residents';

function parseJsonArray(str) {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  try {
    if (event.httpMethod === 'GET') {
      const records = await listAll(TABLE);
      const residents = records.map(rec => {
        const f = rec.fields || {};
        return {
          id: f.ResidentKey,
          name: f.Name || '',
          dob: f.DOB || '',
          spDate: f.SPDate || '',
          codeStatus: f.CodeStatus || '',
          admissionDate: f.AdmissionDate || '',
          seizurePrecautions: f.SeizurePrecautions || '',
          fallPrecautions: f.FallPrecautions || '',
          medsBy: f.MedsBy || '',
          levelOfCare: f.LevelOfCare || '',
          dnr: f.DNR || '',
          olst: f.OLST || '',
          advDirective: f.AdvDirective || '',
          dni: f.DNI || '',
          highRiskMeds: f.HighRiskMeds || '',
          highRiskPrecautions: f.HighRiskPrecautions || '',
          allergies: f.Allergies || '',
          assistiveDevices: f.AssistiveDevices || '',
          mobilityAssistance: f.MobilityAssistance || '',
          sensoryImpairments: f.SensoryImpairments || '',
          specialInstructions: f.SpecialInstructions || '',
          diagnosis: parseJsonArray(f.DiagnosisJSON),
          adl: parseJsonArray(f.ADLJSON),
          behavioral: parseJsonArray(f.BehavioralJSON),
          background: f.Background || '',
          likes: f.Likes || '',
          spiritual: f.Spiritual || '',
          routine: f.Routine || '',
          finances: f.Finances || '',
          transportation: f.Transportation || '',
          completedDate: f.CompletedDate || '',
        };
      }).filter(r => r.id);
      return json(200, residents);
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
