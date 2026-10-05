# Public content audit — 5 October 2026

Scope: RU, LT, EN, PL, DE and UK index pages, privacy pages, shared/root page, calculator wording, EDS instructions, source links, optional parish support, local helper and the OpenAI Worker snapshot. This is an audit of the site's published claims, not a claim to have reviewed every internet publication or verified a taxpayer's circumstances.

## Evidence and corrections

| Subject | Result and change | Primary evidence |
| --- | --- | --- |
| Campaign calendar | Confirmed: 2026 income; applications 1 January–3 May 2027; up to five tax years 2026–2030. | VMI campaign page and multi-year FAQ, below. |
| Eligibility | Replaced vague wording with Lithuanian tax residence and income subject to GPM. Citizenship or language alone is not the test. Retirement/unemployment alone does not exclude participation; zero GPM gives nothing to allocate. | VMI R-780; guide sections 1–2; GPM law art. 4 referred to by VMI. |
| Calculation | Clarified annual GPM versus salary, outstanding balance or refund; explained fixed business-certificate tax and foreign-tax adjustment; calculator remains illustrative. | VMI R-1058 and R-780; guide section 18. |
| Minimum and separate categories | Added the below-€3-per-recipient/year transfer exclusion and separate 0.6% political / 0.6% union allocations. The illustrative calculator does not apply the transfer threshold. | Guide sections 9 and 20; R-1058. |
| Religious communities | Explicitly described the law effective 1 January 2027 and other newly included categories. No claim that this parish has been checked in EDS or its GPM bank account in Mano VMI. | VMI explanation of law XV-785 and R-1058. |
| Existing applications | Removed unsupported claim that authorities are still clarifying all old applications. Explained the general no-repeat rule where the application covers the year and the recipient remains eligible; checking the actual EDS application remains necessary. | Guide section 8; VMI multi-year FAQ. |
| Filing | Added missing EDS menu item `Dažniausiai pildomos formos`. FR0512 is electronic; the guide does not submit it. Explained GPM311 obligation and the consequence of missing/late required filing, without inventing a future GPM311 extension or saying everyone must file it. | VMI EDS instructions; R-780. |
| Corrections | Added 30 June 2027 for correction of an existing application concerning the 2026 allocation. Distinguished this from the 3 May initial deadline. Removing every recipient is the correction mechanism to stop all support. | R-780; guide sections 14–17. |
| Transfers | Added general 1 July–15 November next-year window; EDS acceptance is not payment confirmation. Check EDS notifications or Mano VMI. | R-780; VMI campaign page; guide section 19. |
| Privacy | Removed misleading categorical claim that the site has no tax-data submission field. FR0512 stays in EDS, calculator values stay local, AI questions go through Cloudflare to OpenAI after consent. VMI recipient reports contain aggregates, not individual donor records. | Existing source code; guide section 23. |
| Parish support | Removed unsupported promise that fundraising amounts will be published after reconciliation. No verified totals or budgets are published here. Direct donations remain separate from GPM. | Current project material; no new fundraising claims. |

## Primary sources consulted

- [VMI campaign rules, already describing 2027](https://www.vmi.lt/evmi/paramos-skyrimas-34-str.-1)
- [VMI: changes from 2027](https://www.vmi.lt/evmi/labdaros-ir-paramos-istatymo-pakeitimai-nuo-2027-m.)
- [VMI R-1058, explanation of law XV-785](https://www.vmi.lt/evmi/documents/20142/737112/R-1058.pdf/9ebe193a-6cd0-1585-ce1b-728948d82e7e?t=1776335133514)
- [VMI R-780, 2026 filing explanation](https://www.vmi.lt/evmi/documents/20142/737112/R-780.pdf)
- [VMI EDS instructions and official video link](https://www.vmi.lt/evmi/kaip-galiu-paskirti-pajamu-mokescio-dali-pasirinktam-paramos-gavejui-ir-/-ar-politinei-organizacijai)
- [VMI multi-year FAQ](https://www.vmi.lt/evmi/ar-galiu-vienu-prasymu-fr0512-pajamu-mokescio-dali-paskirti-ilgesniam)
- [VMI general guide, 2024 edition](https://www.vmi.lt/evmi/documents/20142/391092/KD-0001792%2BGyventojo%2Bpajam%C5%B3%2Bmokes%C4%8Dio%2Bdalis%2Bparamai.pdf/585f2f5f-0aef-3a9e-4edb-1d45b1872077?t=1645609469304)
- [VMI recipient lookup](https://www.vmi.lt/evmi/web/guest/paramos-gaveju-ir-politiniu-organizaciju-duomenys)
- [Parish public website](https://bukhram.lt/) and [current parish website](https://bukiski-hram.net/): published account matches `LT407044060006244432`; identity and account fields unchanged. This is not proof of bank-account ownership or of its registration for GPM.

The 2024 guide's recipient categories and old free-form bank-account procedure are superseded where VMI's newer guidance differs. The 2026 letter's example May 4 deadline is not copied to the 2027 campaign. Current VMI instructions specify the recipient's account purpose in Mano VMI; the public site cannot inspect that private setting. Statutory e-TAR pages returned access errors; the audit relies on VMI's published official explanations and linked documents, not a claim to have opened an inaccessible consolidated statute.

## Verification boundary

`recipientVerified` and `gpmBankAccountVerified` remain false. The parish code, legal name, IBAN, BIC and project links remain unchanged. Future legal amendments and the actual execution of a visitor's application require checking VMI/EDS at the time. Existing `parish-assistant` and other project repositories are outside the task and unchanged.

The build now generates all 29 local records in six languages and both copies of Worker knowledge from the same reviewed source. Tests check consistency and routing of correction, transfer, calculation-base, retirement and religious-recipient questions in every language. Responsive, keyboard and static-content checks run in the release workflow.
