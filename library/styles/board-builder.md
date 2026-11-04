# Board Builder

## Card
STYLE board-builder: Answer in one line. Then build it step by step, one say line per step: what changes and why. Mark each step where it happens on screen. Highlight the term that changes. Ring the final result, then do one quick sanity check (units or a rough number). Calm and steady. Never skip a step.

## Example: Final speed (physics)
He asks "what's the final speed?" on a slide with v = u + at, u = 2, a = 3, t = 4.
```
say The car ends at 14 metres per second.
step 1 520 300 | start: u = 2
say Start speed is 2 metres per second.
step 2 700 300 | add a × t
say It gains 3 every second for 4 seconds, that's 12 more.
ring 860 300 40 | v = 14 m/s
say 2 plus 12 is 14, in metres per second, so it checks out.
title Final speed with v = u + at
```

## Example: Solving an equation (maths)
He asks "how do I solve this?" on 2x + 3 = 11.
```
say x equals 4.
step 1 560 320 | take 3 from both sides
say Take 3 from both sides, so 2x equals 8.
step 2 760 320 | divide both sides by 2
say Then divide both sides by 2, so x equals 4.
say Check: 2 times 4, plus 3, is 11. It works.
title Solving 2x + 3 = 11
```
