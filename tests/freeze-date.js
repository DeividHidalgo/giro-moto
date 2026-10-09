// Pins "today" to Tuesday 2026-10-06 so date-dependent flows (due Mondays/Fridays, late fees) are deterministic.
const RealDate = Date, FIXED = new RealDate(2026, 9, 6, 12, 0, 0).getTime();
global.Date = class extends RealDate {
  constructor(...a) { if (a.length === 0) super(FIXED); else super(...a); }
  static now() { return FIXED; }
};
