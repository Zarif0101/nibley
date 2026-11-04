# Integration by substitution

## Simple idea
Some integrals hide a simple one inside a messy bracket. Give the messy bit a new letter u, and the integral turns easy. It is like replacing a long name with a nickname. This works when the derivative of the inside part is also sitting in the integral.

## Key formulas
- ∫f(g(x))·g′(x) dx = ∫f(u) du. u = g(x): the inner part, du = g′(x) dx: its small change
- For limits: change x = a and x = b into u = g(a) and u = g(b)

## Picture it
Draw `graph-area`. Label `graph-area.area-mid` "same area, new letter u".
Write "x = a" at `graph-area.a` and "u = g(a)" under it; do the same at `graph-area.b`.

## Common mistakes
- Leaving some x behind: every x and dx must become u and du.
- Forgetting the extra factor: for u = 3x, du = 3 dx, so divide by 3.
- Changing to u but keeping the old limits: change the limits too.

## Check questions
1. Find ∫2x(x² + 1)³ dx.
   Answer: (x² + 1)⁴/4 + C.
2. Find ∫cos(3x) dx.
   Answer: sin(3x)/3 + C.
3. Why does the chain rule help here?
   Answer: Substitution reverses it: the g′(x) factor is what the chain rule leaves behind.

## Flashcards
Q: What do we call the new letter in substitution?
A: u, set equal to the inner part.
Q: If u = x² + 1, what is du?
A: 2x dx.
Q: If u = 3x, what is dx?
A: du/3.
Q: What must you do to the limits when you change to u?
A: Change them to u-values.
Q: Find ∫₀¹ 2x(x² + 1)³ dx.
A: 15/4.

## Root check
- integration-basics: What is ∫(3x² + 2) dx? Answer: x³ + 2x + C.
- chain-rule: What is the derivative of (x² + 1)³? Answer: 6x(x² + 1)².
