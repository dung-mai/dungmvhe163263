# Rule: money, price, promotion

- Contracts carry money as integer VND strings ("129000"). DB uses Decimal. Formatting uses BigInt. No float anywhere, including tests.
- Promotion window is half-open `[startsAt, endsAt)`. A promotion never makes the price higher than the base price.
- Any change to price calculation needs a unit test with: boundary at `startsAt`, boundary at `endsAt`, no promotion, overlapping promotions.
- Totals are computed on the server. The client never sends a price that the server trusts.
