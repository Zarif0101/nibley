# Inverse matrices and linear systems

## Simple idea
The inverse of a matrix undoes it, like the undo button, or like how subtracting 3 undoes adding 3. A matrix times its inverse gives the identity matrix, which changes nothing. This helps solve equations like 2x + y = 5 together in one go.

## Key formulas
- A·A⁻¹ = I. A⁻¹: the inverse, I: identity matrix [1 0; 0 1] (rows split by ;)
- A⁻¹ = (1 / (ad − bc)) × [d −b; −c a], for A = [a b; c d]. a, b, c, d: entries
- If AX = B then X = A⁻¹B. X: the unknowns, B: the answers column. Put A⁻¹ on the left.
- No inverse when ad − bc = 0

## Picture it
Draw `matrix-brackets`. Arrow swapping `matrix-brackets.entry-11` and `matrix-brackets.entry-22`, labelled "swap a and d".
Mark `matrix-brackets.entry-12` and `matrix-brackets.entry-21` "flip the sign". Write "divide all by ad − bc" above `matrix-brackets.left-bracket`.

## Common mistakes
- Flipping signs on a and d: only b and c change sign, a and d swap places.
- Forgetting the 1/(ad − bc) in front.
- Multiplying A⁻¹ on the wrong side: write X = A⁻¹B, never BA⁻¹.

## Check questions
1. What number do you divide by when finding a 2 × 2 inverse?
   Answer: The determinant, ad − bc.
2. Find the inverse of [3 0; 0 2].
   Answer: det = 6, so (1/6)[2 0; 0 3] = [1/3 0; 0 1/2].
3. Why can't you find the inverse when ad − bc = 0?
   Answer: You would divide by zero, which is not allowed.

## Flashcards
Q: What is A·A⁻¹?
A: The identity matrix I.
Q: What does the identity matrix do when you multiply?
A: Nothing, it leaves the other matrix unchanged.
Q: How do you solve AX = B?
A: X = A⁻¹B.
Q: When does a 2 × 2 matrix have no inverse?
A: When its determinant is 0.
Q: What is the inverse of [2 1; 5 3]?
A: [3 −1; −5 2].

## Root check
- determinants: Find the determinant of [2 3; 1 4]. Answer: 2·4 − 3·1 = 5.
