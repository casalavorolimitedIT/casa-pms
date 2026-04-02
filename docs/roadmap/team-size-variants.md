# Team-Size Variants

This matrix gives expected duration per milestone for 3 delivery models.

## Staffing Assumptions
- Solo: 1 full-stack engineer, no dedicated QA/DevOps
- 5-person: 3 full-stack, 1 product/design, 1 QA/DevOps hybrid
- 12-person: 7 engineers, 1 architect, 1 PM, 1 QA, 1 DevOps, 1 designer

## Timeline By Milestone

| Milestone | Solo | 5-person | 12-person |
|---|---:|---:|---:|
| M00 Foundation | 3 weeks | 2 weeks | 1 week |
| M01 Core PMS | 5 weeks | 4 weeks | 3 weeks |
| M02 Front Desk + Folio + Rates | 6 weeks | 4 weeks | 3 weeks |
| M03 Live Ops + Audit | 4 weeks | 3 weeks | 2 weeks |
| M04 Housekeeping Suite | 5 weeks | 4 weeks | 3 weeks |
| M05 Engineering + Maintenance | 4 weeks | 3 weeks | 2 weeks |
| M06 F&B Suite | 8 weeks | 6 weeks | 4 weeks |
| M07 Guest Experience | 6 weeks | 4 weeks | 3 weeks |
| M08 Revenue + Distribution | 9 weeks | 6 weeks | 4 weeks |
| M09 Spa + Wellness | 7 weeks | 5 weeks | 3 weeks |
| M10 Multi-Property | 5 weeks | 4 weeks | 3 weeks |
| M11 Reporting + Analytics | 6 weeks | 4 weeks | 3 weeks |
| M12 Hardening + Release | 4 weeks | 3 weeks | 2 weeks |
| Total | 72 weeks | 48 weeks | 33 weeks |

## Parallelization Rules
- M00 must finish before M01.
- M01 and M02 are mostly sequential due to shared engines.
- M04 and M05 can run in parallel in 5-person and 12-person teams.
- M06 and M07 can run in parallel after M02 is stable.
- M08 depends on M01/M02 and partially on M06/M07.
- M10 depends on stable property-scoping and chain-rate model.
- M11 depends on M03 night-audit outputs.
