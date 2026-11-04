# Library build log

Resume notes for a new session. The brief is `docs/briefs/cloud-library.md`.

## Done
- Step 1: `syllabus-comparison.md`, `topics.json` (156 topics), `check.js` (passes with `--partial`).
- Step 2: `tools/draw.js` (pen-style generator) + `tools/specs/*.js` -> 86 assets in `assets/`, all assigned to topics. Rebuild with `node library/tools/draw.js`. Opus reviewed every drawing on a contact sheet; fixed graph-tangent, polariser (unpolarised input), atom/wavefronts (spiral look), disc-rotation arrowhead.
- Step 3 (P+M): notes for all 156 physics/maths topics (10 Sonnet batches, Opus spot-checked 30, fixed 5 wording errors).
- Chem/bio (Zarif's request): 73 topics, 38 drawings (Opus reviewed all; redrew `heart`), syllabus tables. Notes next.
- Gold-standard note: `notes/newtons-second-law.md` (written by Opus).

## Next
- Chem/bio notes in 5 batches, then README + PR.
- Step 4: README, strict `node library/check.js`, PR.
- Then (Zarif, 2026-11-04): add chemistry and biology in the same format, after physics + maths are finished.

## Deviations from the brief
- Branch: the brief says `library-v1`; this cloud session is pinned to `claude/sleepy-darwin-jy0kpp`, so work and the PR use that branch.
- This log lives in `library/` (not `docs/BUILD-LOG.md`) because the brief says not to edit `docs/`.
