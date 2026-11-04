# Integration by parts

## Simple idea
When an integral is two different things multiplied, like x times cos x, the usual rules fail. Parts trades it for another integral that is easier. It is the product rule run backwards. You choose one part to differentiate, so it shrinks, and one part to integrate.

## Key formulas
- ∫u dv = uv − ∫v du. u: the part you differentiate, dv: the part you integrate, v: the integral of dv
- Definite form: ∫ₐᵇ u dv = [uv]ₐᵇ − ∫ₐᵇ v du

## Picture it
Draw `graph-area`. Label `graph-area.curve-top` "u times dv".
Label `graph-area.area-mid` "∫u dv = uv − ∫v du".

## Common mistakes
- Choosing u badly: pick u as the part that gets simpler when differentiated, like x.
- Dropping the minus sign: it is uv minus the new integral.
- Forgetting + C on the last step of an indefinite integral.

## Check questions
1. Find ∫x cos x dx.
   Answer: x sin x + cos x + C.
2. Find ∫x eˣ dx.
   Answer: x eˣ − eˣ + C.
3. Why is it called the product rule backwards?
   Answer: Integrating (uv)′ = u′v + uv′ gives the parts formula.

## Flashcards
Q: Write the integration by parts formula.
A: ∫u dv = uv − ∫v du.
Q: In ∫x sin x dx, which part is u?
A: u = x.
Q: Which rule is parts made from?
A: The product rule.
Q: What is du if u = x?
A: dx.
Q: What is v if dv = cos x dx?
A: sin x.

## Root check
- integration-basics: What is ∫sin x dx? Answer: −cos x + C.
- product-quotient-rules: What is the derivative of x·sin x? Answer: sin x + x cos x.
