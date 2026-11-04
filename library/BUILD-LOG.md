# Library build log

Resume notes for a new session. The brief is `docs/briefs/cloud-library.md`.

## Done
- Step 1: `syllabus-comparison.md`, `topics.json` (156 topics), `check.js` (passes with `--partial`).
- Step 2: `tools/draw.js` (pen-style generator) + `tools/specs/*.js` -> 86 assets in `assets/`, all assigned to topics. Rebuild with `node library/tools/draw.js`. Opus reviewed every drawing on a contact sheet; fixed graph-tangent, polariser (unpolarised input), atom/wavefronts (spiral look), disc-rotation arrowhead.
- Step 3 (P+M): notes for all 156 physics/maths topics (10 Sonnet batches, Opus spot-checked 30, fixed 5 wording errors).
- Chem/bio (Zarif's request): 73 topics, 38 drawings (Opus reviewed all; redrew `heart`), syllabus tables, 73 notes (Opus spot-checked 15).
- Fact-check pass: 6 Sonnet reviewers read the 183 notes Opus had not; Opus verified all 9 reported problems and fixed them.
- Step 4: README, strict check passes, PR opened.
- Gold-standard note: `notes/newtons-second-law.md` (written by Opus).

## Next
- Zarif reviews the PR. The app session wires the library in (it must accept subjects `chemistry` and `biology`).
- Possible follow-ups: plant hormones, muscles and movement; better `membrane-bilayer` drawing; Opus review of more notes.

## Deviations from the brief
- Branch: the brief says `library-v1`; this cloud session is pinned to `claude/sleepy-darwin-jy0kpp`, so work and the PR use that branch.
- This log lives in `library/` (not `docs/BUILD-LOG.md`) because the brief says not to edit `docs/`.
