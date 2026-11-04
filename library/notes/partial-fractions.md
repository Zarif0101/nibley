# Partial fractions

## Simple idea
A big fraction with a product on the bottom can be broken into smaller fractions, each with one bracket on the bottom. Like changing a big coin into small coins. Each small fraction is easy to integrate, so you integrate them one by one and add.

## Key formulas
- 1/((x+p)(x+q)) = A/(x+p) + B/(x+q). A, B: numbers you solve for, p, q: fixed numbers
- ∫1/(x+p) dx = ln|x+p| + C. ln: natural log
- If the top power is as big as the bottom power, divide first

## Picture it
Draw `graph-hyperbola`. Label `graph-hyperbola.branch-top` "each piece looks like 1/x".
Label `graph-hyperbola.branch-bottom` "so each integrates to a log".

## Common mistakes
- Splitting when the top is too big: do long division first.
- Wrong A and B: put in x = −p to find A, and x = −q to find B.
- Integrating 1/(x+p) as a power: the answer is ln|x+p|.

## Check questions
1. Split 1/((x+1)(x+2)).
   Answer: 1/(x+1) − 1/(x+2).
2. Split 3/((x−1)(x+2)).
   Answer: 1/(x−1) − 1/(x+2).
3. Why put x = −1 into the cleared equation?
   Answer: It kills the B term, leaving only A to solve.

## Flashcards
Q: What is ∫1/x dx?
A: ln|x| + C.
Q: What form do we try for 1/((x+1)(x+2))?
A: A/(x+1) + B/(x+2).
Q: What step comes first if the top is bigger than the bottom?
A: Long division.
Q: After splitting, how do we find A and B?
A: Multiply through, then put in convenient x-values.
Q: What is ∫1/(x+3) dx?
A: ln|x+3| + C.

## Root check
- polynomials: Expand (x+1)(x+2). Answer: x² + 3x + 2.
- fractions-decimals: What is 1/2 + 1/3? Answer: 5/6.
