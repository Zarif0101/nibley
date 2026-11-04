# Chain rule

## Simple idea
Sometimes a function sits inside another function, like (3x + 1)⁵. Think of gears: if the first gear turns 3 times for each turn of the handle, and the second turns 5 times for the first, the total is 5 × 3. Work outside in: slope of the outside, times slope of the inside.

## Key formulas
- dy/dx = dy/du × du/dx. y: outer function, u: inner function, x: the variable
- (f(g(x)))′ = f′(g(x)) · g′(x)
- For (ax + b)ⁿ the derivative is n·a·(ax + b)ⁿ⁻¹. a, b: constants, n: the power

## Picture it
Draw `graph-tangent`. Label `graph-tangent.curve-end` "y = outer(inner(x))".
Label the dot `graph-tangent.touch-point` "slope = outer slope × inner slope".

## Common mistakes
- Forgetting the inner derivative: (3x + 1)⁵ gives 5(3x + 1)⁴ × 3.
- Changing the inside when you differentiate the outside: keep (3x + 1) as it is.
- Mixing outer and inner: peel from the outside in.

## Check questions
1. What is the chain rule in words?
   Answer: Slope of the outside (inside left alone) times slope of the inside.
2. Differentiate (2x + 1)³.
   Answer: 3(2x + 1)² · 2 = 6(2x + 1)².
3. Why do we multiply by the inside's derivative?
   Answer: The inside is changing too, and its rate of change feeds into the outside.

## Flashcards
Q: What is the chain rule?
A: dy/dx = dy/du × du/dx.
Q: What is d/dx of (3x + 1)⁵?
A: 15(3x + 1)⁴.
Q: What is d/dx of (x² + 1)⁴?
A: 8x(x² + 1)³.
Q: In (5x − 2)⁶, which part is the inner function?
A: 5x − 2.
Q: What is the first step with a function inside a function?
A: Spot the outer and inner functions.

## Root check
- differentiation-rules: Differentiate 5x². Answer: 10x.
- composite-inverse-functions: If f(x) = x² and g(x) = x + 1, find f(g(2)). Answer: f(3) = 9.
