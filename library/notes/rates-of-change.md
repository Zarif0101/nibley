# Rates of change

## Simple idea
A rate of change says how fast one thing changes when another does, like litres of water per second filling a bottle. The derivative is exactly that. When two things both change over time, link them with the chain rule: how fast the radius grows decides how fast the area grows.

## Key formulas
- Rate = dy/dx. y: the quantity, x: what it changes with (units: y-unit per x-unit)
- dA/dt = dA/dr × dr/dt. A: area (cm²), r: radius (cm), t: time (s)
- Circle area: A = πr², so dA/dr = 2πr
- Cube volume: V = s³, so dV/dt = 3s² × ds/dt. V: volume (cm³), s: side (cm)

## Picture it
Draw `graph-tangent`. Label the dot `graph-tangent.touch-point` "rate = slope" and `graph-tangent.curve-end` "quantity".
Write "time" near `graph-tangent.origin`.

## Common mistakes
- Putting in numbers before differentiating: differentiate first, then substitute.
- Missing units: give the rate with units, such as cm³/s.
- Forgetting the sign: a shrinking quantity has a negative rate.

## Check questions
1. What does dV/dt mean in words?
   Answer: How fast the volume changes with time.
2. A cube's side is 4 cm and grows at 0.5 cm/s. How fast does its volume grow?
   Answer: 3 × 4² × 0.5 = 24 cm³/s.
3. Why do we multiply by dr/dt in dA/dt?
   Answer: Area depends on r, and r depends on time, so the chain rule links them.

## Flashcards
Q: What is a rate of change?
A: How fast one quantity changes compared to another.
Q: What is the chain rule for rates?
A: dA/dt = dA/dr × dr/dt.
Q: What is d/dr of πr²?
A: 2πr.
Q: What does a negative rate mean?
A: The quantity is getting smaller.
Q: What is the first step in a rates problem?
A: Write the formula linking the quantities.

## Root check
- chain-rule: Differentiate (x² + 2)³. Answer: 6x(x² + 2)².
