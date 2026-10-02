# Targeted integration rewards

Rewards are capped at **$50 total per bank**, including collaborator splits.
The task has a **$1,000 funding authorization including funding fees**, separate
from the $50 infrastructure authorization. There is no token or automatic payout.

## Funding status — October 2, 2026

An initial **500 USDC** was deposited into the verified sponsor's Merit account
on Base (chain 8453). [Successful transfer](https://basescan.org/tx/0x53902d363f347e888b63d5266b95da66f9f53ee1fa487331bef583c65ec695c9).
Merit displays a $500 credited balance. **Allocation to the project is pending**;
this deposit alone does not activate a funded issue. Wait for explicit funding
confirmation and assignment in the bank issue before starting paid work.

The previous unfunded $10,000 / 60-bank proposal has been retired. Its $150–$200
amounts are not offers under this program. Existing earned or assigned obligations
must be reconciled before changing an issue; no earned payout is cancelled here.
The initial audit found no project funding or payouts and no assigned GitHub bank
claims. The Vietcombank lead explicitly waited for funding before starting.

## Proposed first allocations

| Bank | Maximum | Narrow scope and reason |
| --- | ---: | --- |
| Monobank | $50 | One completed UAH bank transfer with exact counterparty provenance; original parser, negative fixtures, docs and one authorized live report. Official statement API makes acquisition plausible; an account owner is still needed. |
| Vietcombank | $50 | One completed VND domestic bank transfer on a named Digibank surface, with the same deliverables. Existing contributor lead makes access more plausible; they must reconfirm the smaller scope and amount. |
| [Chase](https://github.com/zkp2p/peer-link/issues/73) | $25 | Feasibility package for one US transfer surface: authorized account access, privacy-safe field-provenance report, synthetic shape and fail-closed limitations. No promise that a parser or Peer support follows. |
| [Bank of America](https://github.com/zkp2p/peer-link/issues/74) | $25 | Same bounded feasibility package; prove that exact recipient and payment status are available before commissioning an adapter. |
| [Wells Fargo](https://github.com/zkp2p/peer-link/issues/75) | $25 | Same bounded feasibility package; do not treat Zelle, ACH and wire records as interchangeable. |

These allocations total **$175**, leaving **$325 unassigned** from the initial
pool. A reviewed US feasibility result may receive a separately assigned parser
extension, but the combined total stays at or below $50 for that bank. Mercury
is the internal test baseline; existing founder work does not earn a new bounty.
The remaining authorized budget is not automatically deposited or committed.
See [prioritization evidence](integration-priorities.md).

## Assignment and acceptance

1. Comment with the bank, authorized surface, proposed payment type and known
   limitations. Do not send credentials or financial records. The maintainer
   assigns one attempt for 14 days; extensions must be written in the issue.
2. The funded issue states its exact scope, amount, sponsor/reviewer, funding
   evidence and submission deadline (normally 30 days after funding confirmation).
   Unassigned competing work creates no additional payment obligation.
3. Parser awards require original MIT-compatible code, a manifest, acquisition
   notes, independently justified synthetic fixtures and meaningful negative
   cases. Run `npm run check` and the staged privacy check before every push.
4. A parser award includes one explicitly owner-authorized, privacy-safe live
   report bound to the exact committed adapter and harness versions. Synthetic
   tests alone are not a live report. Never initiate a payment for this task.
   There is **no three-user testing requirement**.
5. A feasibility award is judged on an accurate, reproducible provenance and
   limitation report. A well-supported finding that the surface cannot establish
   exact payment semantics can satisfy that written feasibility scope. It does
   not automatically satisfy a parser award.
6. Maintainer @0xSachinK reviews the assigned scope and records acceptance in the
   issue before authorizing Merit payout. Merge, coverage, AI output and enclave
   reports do not automatically approve rewards or Peer production support.
7. Collaborators agree a split before starting, within the bank's total cap. No
   duplicate rewards, per-identity payouts or silent scope expansion. Disputes
   are evaluated by the named reviewer against the written criteria; disclose
   conflicts of interest.

The [Merit project](https://terminal.merit.systems/zkp2p/peer-link) is the
allocation and payout reference; its repository identity now matches `zkp2p/peer-link`.
Contributors complete any tax, wallet and eligibility setup directly with Merit.
Vietnam payout eligibility has **not** been independently confirmed; a Vietnamese
contributor should verify the available payout route before accepting paid work.
Never submit identity or banking documents in a GitHub issue.

Community contributions outside the paid shortlist remain welcome. A bank request
or an unallocated reserve is not a funded award.
