# Differential equations

## Simple idea
A differential equation tells you how fast something changes, and you work backwards to find the thing itself. Like knowing a phone battery drains 2% a minute and working out the charge at any time. Integrating gives a family of answers, and a starting value picks the right one.

## Key formulas
- dy/dx = f(x) gives y = ∫f(x) dx. y: the unknown function, x: the variable
- dy/dx = k·y gives y = A·eᵏˣ. k: a constant rate (per unit of x), A: a constant set by the start
- Starting value: if y = y₀ when x = 0, then A = y₀

## Picture it
Draw `graph-exponential`. Label `graph-exponential.y-intercept` "start y₀".
Label `graph-exponential.curve-left` "small y, slow growth" and `graph-exponential.curve-end` "big y, fast growth".

## Common mistakes
- Forgetting the constant: the general solution always has one.
- Skipping the starting value: use it to find the constant.
- Thinking dy/dx = ky gives a straight line: it gives an exponential curve.

## Check questions
1. Solve dy/dx = 2x with y = 1 when x = 0.
   Answer: y = x² + 1.
2. Solve dy/dx = 3y with y = 5 when x = 0.
   Answer: y = 5e³ˣ.
3. Why is the answer exponential when dy/dx = ky?
   Answer: The rate depends on the size, so growth speeds up as y grows.

## Flashcards
Q: What does dy/dx = 5y say in words?
A: The rate of change is 5 times the current value.
Q: What is the general solution of dy/dx = ky?
A: y = A·eᵏˣ.
Q: What does the starting value do?
A: It fixes the constant in the answer.
Q: Solve dy/dx = 4.
A: y = 4x + C.
Q: What is the derivative of e²ˣ?
A: 2e²ˣ.

## Root check
- integration-basics: What is ∫2x dx? Answer: x² + C.
- derivatives-exp-log-trig: What is the derivative of e³ˣ? Answer: 3e³ˣ.
