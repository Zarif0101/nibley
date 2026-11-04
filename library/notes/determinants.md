# Determinants

## Simple idea
A determinant is one number you get from a square matrix. Think of a matrix as a machine that stretches a flat shape. The determinant says how many times bigger the area becomes. If it is 0, the shape gets squashed flat, and you can never undo that, so there is no inverse.

## Key formulas
- det [a b; c d] = ad − bc. a, b, c, d: the four entries (rows split by ;), no unit
- Area of the parallelogram from vectors (a, c) and (b, d) = |ad − bc|
- det = 0 means no inverse exists
- det(AB) = det(A) × det(B)

## Picture it
Draw `parallelogram`. Label `parallelogram.corner` "start", `parallelogram.side-a-head` "side 1", `parallelogram.side-b-head` "side 2", and `parallelogram.center` "area = |det|".
Draw `matrix-brackets` beside it. Write "ad" along the diagonal from `matrix-brackets.entry-11` to `matrix-brackets.entry-22` and "bc" along the other diagonal.

## Common mistakes
- Writing ad + bc: it is ad − bc.
- Swapping the order to bc − ad: the sign flips, so keep ad first.
- Reporting a negative area: area is the size |det|, without the minus.

## Check questions
1. What is the determinant of [3 1; 2 4]?
   Answer: 3·4 − 1·2 = 10.
2. Does [4 2; 6 3] have an inverse?
   Answer: det = 12 − 12 = 0, so no.
3. Why does det = 0 mean no inverse?
   Answer: The matrix squashes area to zero, and squashed shapes can't be undone.

## Flashcards
Q: What is the determinant formula for a 2 × 2 matrix?
A: ad − bc.
Q: What does determinant 0 tell you?
A: The matrix has no inverse.
Q: What does the determinant tell you about area?
A: The factor by which areas are scaled.
Q: What shapes of matrix have a determinant?
A: Square ones, like 2 × 2.
Q: What is det [1 0; 0 1]?
A: 1.

## Root check
- matrices: What is 2 × [1 2; 3 4]? Answer: [2 4; 6 8].
