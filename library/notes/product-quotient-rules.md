# Product and quotient rules

## Simple idea
When two things with x are multiplied, you can't just differentiate each and multiply. Picture a rectangle with both sides growing: the area grows because of each side's change. So the product rule adds two pieces. The quotient rule is the same idea for dividing, with a minus and a square on the bottom.

## Key formulas
- (u·v)′ = u′v + u·v′. u, v: two functions of x, u′ and v′: their derivatives
- (u/v)′ = (u′v − u·v′) / v². Top is u′v minus uv′, bottom is v squared
- Quotient rule only works if v is not 0

## Picture it
Draw `graph-tangent`. Label `graph-tangent.curve-end` "y = u·v" and the dot `graph-tangent.touch-point` "slope = u′v + uv′".
Write the quotient rule in words next to `graph-tangent.origin`: "bottom squared, top is u′v − uv′".

## Common mistakes
- Using (uv)′ = u′v′: check with x·x, whose derivative is 2x, not 1.
- Swapping the order in the quotient top: it is u′v − uv′, never the other way round.
- Forgetting v² on the bottom.

## Check questions
1. Write the product rule.
   Answer: (uv)′ = u′v + uv′.
2. Differentiate y = (x + 2)(x − 1).
   Answer: 1·(x − 1) + (x + 2)·1 = 2x + 1.
3. Why is (uv)′ not just u′v′?
   Answer: With u = v = x, uv = x² has slope 2x, but u′v′ = 1.

## Flashcards
Q: What is the product rule?
A: (uv)′ = u′v + uv′.
Q: What is the quotient rule?
A: (u/v)′ = (u′v − uv′) / v².
Q: What goes on the bottom of the quotient rule?
A: v squared.
Q: Differentiate x/(x + 1).
A: 1/(x + 1)².
Q: Does the order matter in the quotient numerator?
A: Yes, it is u′v − uv′.

## Root check
- differentiation-rules: Differentiate 4x³. Answer: 12x².
