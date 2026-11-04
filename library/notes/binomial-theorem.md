# Binomial theorem

## Simple idea
Expanding (a + b)³ by hand is slow. Think of three brackets: from each bracket you pick either a or b. The number of ways to get, say, two b's and one a is the number of ways to choose which two brackets give b. That count is a combination, and it is the coefficient.

## Key formulas
- (a + b)ⁿ = Σ nCk · aⁿ⁻ᵏ · bᵏ, k from 0 to n. n: power (whole number), k: how many b's
- nCk = n! / (k!(n − k)!). Number of ways to choose k from n
- Row 4 of Pascal's triangle: 1, 4, 6, 4, 1. These are the coefficients of (a + b)⁴
- (a + b)ⁿ has n + 1 terms

## Picture it
Draw `tree-diagram` as picking from two brackets. Label `tree-diagram.branch-a` "a" and `tree-diagram.branch-b` "b".
Label `tree-diagram.end-ab` and `tree-diagram.end-ba` both "ab", and add "2 paths, so 2ab".

## Common mistakes
- Forgetting the coefficients: (a + b)² is a² + 2ab + b², not a² + b².
- Powers that do not add to n: in each term, the powers of a and b add to n.
- Forgetting to power the number too: in (x + 2)³ the last term is 2³ = 8.

## Check questions
1. What are the coefficients in (a + b)⁴?
   Answer: 1, 4, 6, 4, 1.
2. What is the x² term of (x + 2)³?
   Answer: 3C1 · x² · 2 = 6x².
3. Why is the middle coefficient of (a + b)⁴ equal to 4C2 = 6?
   Answer: You choose which 2 of the 4 brackets give b, and there are 6 ways.

## Flashcards
Q: Expand (a + b)².
A: a² + 2ab + b².
Q: Expand (a + b)³.
A: a³ + 3a²b + 3ab² + b³.
Q: How many terms does (a + b)ⁿ have?
A: n + 1.
Q: What is the coefficient formula?
A: nCk = n! / (k!(n − k)!).
Q: What is 4C2?
A: 6.

## Root check
- permutations-combinations: What is 5C2? Answer: 10.
- factorising: Factorise x² + 5x + 6. Answer: (x + 2)(x + 3).
