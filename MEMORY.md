# MEMORY

## 2026-06-02

### Product Decisions
- Default influencer should be `八喜` (not `老陈`).
- Support adding new influencers from the header UI.
- Keep each influencer's data isolated in local DB.
- Holdings visualization should use a pyramid layout instead of pie for position tiers.
- Add actionable buy-point hints based on support/target/trend cues.

### Implemented
- Added influencer creation flow in store and header.
- Added default-influencer migration and dedup logic for legacy users.
- Upgraded portfolio dashboard with:
  - industry-color enriched display,
  - theme hit-rate panel,
  - clickable theme filter linked to holdings table.
- Added theme matcher utility (`utils/themes.ts`) to centralize classification.
- Enhanced parser to recognize TOP tiers/config bucket and persist `holdingTier/poolType`.

### Operational Notes
- Quote provider supports env-based mode switch (mock/real).
- Existing old snapshots may miss new fields and require re-import to fully populate new charts.

