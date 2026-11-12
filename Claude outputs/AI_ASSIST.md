# SeedSphere AI assist (record-level AI)

Every detail page now has an **AI assist** panel. Pick an action, or type a question, and it analyses the record on screen.

| Module | Record | AI actions |
|---|---|---|
| Quality | NCR | Root cause analysis (6M + 5-Why), Draft CAPA plan, Closure readiness |
| Quality | Complaint | Triage (category, severity, 7-day SLA, recall risk), Draft reply to customer |
| Quality | SOP | Review (sections, Seeds Act references, review dates, acknowledgements) |
| Quality | Compliance requirement | Gap assessment (exposure score, evidence, owner) |
| Procurement | Purchase order | Price & tax check, Delivery & matching risk |
| Procurement | Supplier | Risk profile (scorecard, GST/PAN/licence, suggested classification) |
| Procurement | RFQ | Compare bids (price 70% / delivery 30%, low-bid warning) |
| Procurement | GRN | Receipt inspection review (shortage, damage, weighbridge, moisture) |
| Laboratory | Submission | Interpret results vs certification minimums |
| Processing | Batch | Loss analysis (stage bands, recovery, mass balance), Release readiness |
| Warehouse | Inventory item | Stock advice (expiry/FEFO, reorder, value at risk) |
| Warehouse | IoT sensor | Sensor & storage check (limits, Harrington rule, calibration, battery) |
| Production | Crop plan / Field inspection / Harvest request / Seed lot / Farm | Plan review, Inspection review, Harvest review, Lot health, Farm suitability |
| R&D | Trial | Trial summary (checks, replications, locations, data gaps) |
| Master data | Farmer / Variety | Profile check, Variety record review |

Every record type also has **Summarise** and free-text **Ask**.
Production Planning now also has a module AI insights strip, on the Production Dashboard and in the AI Center.

## How it works
- Rules: `src/ai/copilot/` (shared by browser and server, no dependencies). Thresholds are in `standards.ts`.
- API: `POST /api/v1/ai/copilot` `{ recordType, action | question, record }`, `GET /api/v1/ai/copilot/types`.
- Server: `server/src/modules/ai/recordCopilot.ts`. The rules always run first. With `AI_API_KEY` set, the model rewrites the rules' findings and adds drafts using only facts from the record. Scores always come from the rules.
- UI: `src/components/ai/RecordAiPanel/`. If the API can't be reached, the same rules run in the browser and the panel is labelled "offline".
- Tests: `server/tests/unit/recordCopilot.test.ts`.

## Adding AI to a new record
1. Add an action to the right file in `src/ai/copilot/`, then register its record type.
2. Put `<RecordAiPanel recordType="..." record={record} label="..." />` on the page.
