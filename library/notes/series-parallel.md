# Series and parallel circuits

## Simple idea
Series is a single road: all the cars go through every stop. Parallel is a road that splits into lanes: cars share between them. In series, one broken bulb stops them all. In parallel, the other bulbs keep working, because each has its own path.

## Key formulas
- Series: R = R₁ + R₂ + R₃. R: total resistance (ohms, Ω). Current I (amperes, A) is the same everywhere; voltages (volts, V) add up
- Parallel: 1/R = 1/R₁ + 1/R₂ + 1/R₃. Voltage V is the same across each branch; currents add up

## Picture it
Draw `simple-circuit` for series. Label `simple-circuit.left-side`: "same current all round".
Draw `parallel-circuit`. Label `parallel-circuit.branch-top`: "current splits" and `parallel-circuit.branch-bottom`: "same voltage".

## Common mistakes
- Adding resistances directly in parallel: add the 1/R values, then flip.
- Forgetting to flip at the end: the answer from 1/R must be inverted.
- Thinking parallel resistance is bigger: it is always smaller than the smallest branch.

## Check questions
1. A 3 Ω and a 6 Ω resistor are in series. What is the total?
   Answer: 3 + 6 = 9 Ω.
2. The same two resistors are in parallel. What is the total?
   Answer: 1/3 + 1/6 = 1/2, so R = 2 Ω.
3. Why do house lights use parallel wiring?
   Answer: Each light gets full voltage and works alone if another is off.

## Flashcards
Q: What stays the same in series?
A: The current.
Q: What stays the same in parallel?
A: The voltage across each branch.
Q: How do you add resistors in series?
A: Add them: R = R₁ + R₂.
Q: Two equal resistors R in parallel give what total?
A: R / 2.
Q: Is parallel total smaller or bigger than each branch?
A: Smaller than the smallest branch.

## Root check
- resistance-ohms-law: 6 V is across a 2 Ω resistor. What is the current? Answer: 3 A.
