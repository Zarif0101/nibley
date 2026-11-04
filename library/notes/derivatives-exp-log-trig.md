# Derivatives of exp, log and trig

## Simple idea
Four special slopes. The curve eˣ is its own slope: the taller it gets, the steeper it climbs. The slope of ln x is 1/x. Sine and cosine swap: the slope of sin x is cos x. Look at a swing: when it's at the top of its arc it stops for a moment, so slope 0.

## Key formulas
- d/dx (eˣ) = eˣ. e ≈ 2.718, x: the variable
- d/dx (ln x) = 1/x, for x > 0
- d/dx (sin x) = cos x, d/dx (cos x) = −sin x. x must be in radians
- With the chain rule: d/dx (e^(kx)) = k·e^(kx) and d/dx (sin kx) = k·cos kx. k: a constant

## Picture it
Draw `graph-exponential`. Label `graph-exponential.curve-left` "gentle slope" and `graph-exponential.curve-end` "steep slope" with "slope = height".
Draw `graph-sine`. Label `graph-sine.origin` "slope 1" and `graph-sine.peak` "slope 0", `graph-sine.trough` "slope 0".

## Common mistakes
- Using the power rule on eˣ: the derivative of eˣ is eˣ, not x·eˣ⁻¹.
- Using degrees: these formulas need radians.
- Dropping the minus sign: cos x has derivative −sin x.

## Check questions
1. What is the derivative of 5eˣ?
   Answer: 5eˣ.
2. Differentiate sin(3x).
   Answer: 3cos(3x).
3. Why does cos x have derivative −sin x?
   Answer: Cos x starts at its peak and heads down, so its slope is negative.

## Flashcards
Q: What is d/dx of eˣ?
A: eˣ.
Q: What is d/dx of ln x?
A: 1/x.
Q: What is d/dx of sin x?
A: cos x.
Q: What is d/dx of cos x?
A: −sin x.
Q: What is d/dx of e^(2x)?
A: 2e^(2x).

## Root check
- chain-rule: Differentiate (2x + 1)³. Answer: 6(2x + 1)².
- logarithms: What is ln e? Answer: 1.
- trig-functions: What are sin 0 and cos 0? Answer: sin 0 = 0 and cos 0 = 1.
