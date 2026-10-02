# Integration priorities — October 2, 2026

This is an execution ranking, not a measured revenue forecast. No current
bank-specific Peer usage or conversion data was available for this assessment.
The earlier P2P snapshots measured standing book liquidity and ad activity, not
settled volume; they cannot establish expected Peer usage or justify 60 simultaneous
awards. Prefer owner access plus a useful, narrow, reviewable payment claim. Maintainer
product-fit review puts Chase first among the US feasibility targets, followed by
Bank of America and then Wells Fargo. Existing private implementations are not
public contributions and do not establish current product enablement. Review the
remaining gap before assigning work; do not commission a copy of private code.

| Priority | Access and demand signal | Feasibility / likely Peer use | Decision |
| --- | --- | --- | --- |
| 1: Vietcombank | A contributor volunteered in issue #8 and explicitly awaited funding; owner access must be reconfirmed | Digibank documents transaction-history access. A VND domestic bank-transfer adapter could serve a new local rail, if exact recipient and status are exposed | $50 narrow parser assignment after payout eligibility and scope confirmation |
| 1: Monobank | Issue #6 has an implementation lead but no authorized account owner yet | Official personal API documents statement IDs, amounts, holds and optional counterparty fields. Missing counterparty fields must fail closed. A personal token is not permission for a centralized service | $50; pair implementation lead with a consenting owner inside the same cap |
| 2: Mercury | Sachin has offered an account for careful testing; original parser exists | Highest immediate test feasibility. Company financial data is sensitive; only approved encrypted client flow and a selected existing transaction. USD wire semantics remain narrow | Internal synthetic-first baseline; no duplicate bounty for existing work |
| 3: Chase, Bank of America, Wells Fargo | Large US banking footprint; no confirmed owner lead in this task | Potential US reach is plausible, not proven Peer demand. Zelle, ACH and wire surfaces have different identities and status semantics | $25 feasibility award per bank only after owner access; up to $50 cumulative if a parser extension is agreed |

Do not open more paid bank assignments merely because reserve remains. Compare
completed feasibility findings, account-owner availability and actual Peer product
requirements before allocating additional funds. Capital One and other US banks
remain candidates until an owner or concrete product need justifies priority.

Primary sources, checked October 2, 2026:

- [Monobank personal API](https://api.monobank.ua/docs/index.html): personal account/token scope, statement fields and rate limits; service-provider API is a separate path.
- [Vietcombank transaction-history guide](https://digibankm5.vietcombank.com.vn/get_file/ibomni/html/hdsd-ib/pages/vi/tinh-nang-giao-dich-ngan-hang/tai-khoan/3-lich-su-giao-dich.html): history access, not an assurance of exact recipient semantics.
- [Mercury API getting started](https://docs.mercury.com/docs/getting-started): read-only tokens are available. Prefer a separately reviewed read-only API surface over a powerful browser session when it can establish the necessary fields; it is not interchangeable with the existing web adapter.
- [Federal Reserve large-bank data](https://www.federalreserve.gov/releases/lbr/): footprint proxy only, not Peer usage or transfer demand.
- [Vietcombank lead](https://github.com/zkp2p/peer-link/issues/8) and [Monobank lead](https://github.com/zkp2p/peer-link/issues/6): neither is evidence of an earned payout or a verified live adapter.
