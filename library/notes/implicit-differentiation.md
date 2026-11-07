# Implicit differentiation

## Simple idea
Sometimes y is tangled up with x and you can't easily solve for y, like the circle x² + y² = 25. So you differentiate both sides anyway. Whenever you hit a y, remember y depends on x, so you also multiply by dy/dx. Then gather the dy/dx terms and solve.

## Key formulas
- d/dx (y²) = 2y·dy/dx. y: the other variable, dy/dx: slope of the curve
- d/dx (xy) = y + x·dy/dx, from the product rule
- Circle x² + y² = r²: dy/dx = −x/y. r: the radius (length)

## Picture it
Draw `axes` and the `circle` on them. Mark `circle.top` "slope 0" and `circle.edge-right` "straight up, slope undefined".
Draw a short tangent line at a point of the `circle` in the top right, labelled "slope = −x/y".

## Common mistakes
- Forgetting dy/dx when you differentiate a y term.
- Treating y as a constant: it changes with x.
- Missing the product rule on xy: both x and y move.

## Check questions
1. What is d/dx of y² with respect to x?
   Answer: 2y·dy/dx.
2. On x² + y² = 25, what is the slope at (3, 4)?
   Answer: dy/dx = −x/y = −3/4.
3. Why does dy/dx appear when we differentiate y?
   Answer: y depends on x, so the chain rule adds the inner derivative dy/dx.

## Flashcards
Q: What is implicit differentiation?
A: Differentiating both sides when y is mixed with x.
Q: What is d/dx of y³?
A: 3y²·dy/dx.
Q: What is d/dx of x²?
A: 2x.
Q: What is dy/dx for x² + y² = 25?
A: −x/y.
Q: What is the last step in implicit differentiation?
A: Solve for dy/dx.

## Root check
- chain-rule: Differentiate (x + 5)². Answer: 2(x + 5).
