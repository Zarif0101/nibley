# Area between curves

## Simple idea
To find the space between two curves, take the height of the top curve minus the height of the bottom curve. That gap is the height of each thin strip. Then add up all the strips. It is like finding the area of a hill by measuring the sky above the ground, minus the ground below.

## Key formulas
- A = ∫ₐᵇ (f(x) − g(x)) dx. f(x): top curve, g(x): bottom curve, a and b: left and right x-values where they cross (area in square units)

## Picture it
Draw `graph-two-curves`. Label `graph-two-curves.top-mid` "top curve f" and `graph-two-curves.bottom-mid` "bottom curve g".
Mark `graph-two-curves.cross-left` "x = a" and `graph-two-curves.cross-right` "x = b"; write "area = ∫(f − g)" at `graph-two-curves.area-mid`.

## Common mistakes
- Putting bottom minus top: the area comes out negative, so check which curve is higher.
- Guessing the limits: find where the curves meet by setting f(x) = g(x).
- Integrating each curve and forgetting to subtract: do f − g first.

## Check questions
1. Find the area between y = 4 and y = 1 from x = 0 to x = 2.
   Answer: 6.
2. Find the area between y = x and y = x² from x = 0 to x = 1.
   Answer: 1/2 − 1/3 = 1/6.
3. Why do we set f(x) = g(x) first?
   Answer: The crossing points are the left and right limits of the area.

## Flashcards
Q: Write the area between two curves.
A: ∫ₐᵇ (top − bottom) dx.
Q: How do you find the limits a and b?
A: Solve f(x) = g(x) for where the curves cross.
Q: What is the height of one thin strip?
A: Top curve minus bottom curve.
Q: What if you swap top and bottom?
A: The answer comes out negative.
Q: Area between y = 3 and y = 1 from x = 0 to 5?
A: 10.

## Root check
- definite-integrals: What is ∫₀² 3x² dx? Answer: 8.
