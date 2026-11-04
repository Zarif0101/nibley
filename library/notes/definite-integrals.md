# Definite integrals and area

## Simple idea
Cut the space under a curve into thin strips, find each strip's area, and add them all up. That total is the definite integral. Think of filling a bath: add up the water that flows in each second. The shortcut is to find the reverse-slope function, then subtract its value at the start from its value at the end.

## Key formulas
- ∫ₐᵇ f(x) dx = F(b) − F(a). f(x): the curve, F(x): any function whose slope is f(x), a: start x, b: end x (area in square units)
- Area below the x-axis counts as negative

## Picture it
Draw `graph-area`. Label `graph-area.a` "start a" and `graph-area.b` "end b".
Label `graph-area.area-mid` "area = F(b) − F(a)" and `graph-area.curve-top` "y = f(x)".

## Common mistakes
- Forgetting to subtract F(a): always do F(b) − F(a).
- Adding + C: it cancels in a definite integral, so leave it out.
- Treating area under the x-axis as positive: the integral gives a negative number there.

## Check questions
1. What is ∫₀² x dx?
   Answer: 2.
2. What is ∫₁³ 2x dx?
   Answer: 3² − 1² = 8.
3. Why does + C vanish in a definite integral?
   Answer: It appears in both F(b) and F(a), so it cancels when you subtract.

## Flashcards
Q: What is the value of ∫ₐᵇ f(x) dx in words?
A: The area under f between a and b.
Q: Write the shortcut for a definite integral.
A: F(b) − F(a).
Q: What is ∫₀³ 2 dx?
A: 6.
Q: What do the numbers a and b on the integral sign mean?
A: The start and end x-values.
Q: What does a negative definite integral tell you?
A: The curve is mostly below the x-axis.

## Root check
- integration-basics: What is ∫6x² dx? Answer: 2x³ + C.
