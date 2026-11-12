# SeedSphere by module

Everything is organised by the module a team works in. Log in as `superadmin@seedsphere.com` (password `password123`) to see all of them, or use the module login shown. Setup is in `RUN_SEEDSPHERE.md`.

## Procurement — `manager@seedsphere.com`
Purchase requisitions, RFQ and quotations, purchase orders (a second person must approve), rate contracts, item master, suppliers and contract growers with agreements, goods receipt with gate inspection, grower deliveries and settlements, invoices with three-way match and payment, budget and cost control, reports. Pages under `/procurement/…`.

## Production Planning — `superadmin@seedsphere.com`
Farmers, farms, crop plans (planned → sown → growing → harvested), seed requirement and seed-lot reservation, field inspections with health score and disease risk, farm inspection approvals, harvest requests (a different person must approve; approval creates the lot ID; then harvest, transport authorisation, delivery to processing), seed lot inventory and genealogy, demand planning, variety catalog, cold storage, packaging and labelling, financing, farmer education, government programmes. Start at `/crop-planning`, `/farms`, `/harvests/approval`, `/inspections`.

## Research & Development — `rdexecutive@seedsphere.com`, `rdmanager@seedsphere.com`
Germplasm catalogue, phenotyping measurements, breeding programmes with generations and budget, nurseries (sow, harvest, notes), multi-location trials, release pipeline (candidate → multi-location → pre-release → released, with approvals), variety registrations, varieties. `/rd/…`.

## Processing — `plantmanager@seedsphere.com`
Raw intake, processing batches through every stage with loss limits, plants and machines, treatment recipes (approved before use), yield and loss, plant scheduling against capacity, certification register, packaging and QR tags, traceability, inspections, approvals. `/processing/…`.

## Laboratory — `superadmin@seedsphere.com`
Sample submissions to partner labs, germination, purity and vigour results scored against certification thresholds, automatic quality flags, certificates, lab performance. `/lab/…`.

## Warehouse — `whmanager@seedsphere.com`
Inventory by lot and bin, inbound receiving, outbound dispatch to licensed dealers, dealer requests, pack tags and QR codes, stock movements and adjustments, cycle counting, returns, temperature and humidity monitoring with breach alerts, inspections, reports. `/warehouse/…`. Dealers see their own portal at `/portal/dealer` (`dealer@seedsphere.com`); the public QR check is `/verify/<tag code>`.

## Quality — `qualitymanager@seedsphere.com`, `qualityofficer@seedsphere.com`
SOP register with acknowledgements, non-conformances, CAPA, farmer complaints, lot holds, compliance register, inspections and checklists, recalls (trace affected dealers, approve, notify), audits with findings, training records, management dashboard, SATHI registers export. `/quality/…`.

## Administration — `sysadmin@seedsphere.com`
Company-wide dashboard, users, roles and permissions, organisations, audit logs, system health, data governance and privacy, approval workflows and rules, approvals inbox, alerts, SMS/WhatsApp message log, party master, settings. `/admin/…`. Growers use `/portal/grower` (`grower@seedsphere.com`).

## Shared by every module
One approvals inbox and rule engine, one inspection and checklist engine, one audit log, and file attachments, so each module behaves the same way.
