# Binomial distribution

## Simple idea
Do the same yes-or-no try several times, like shooting 10 free throws. Each try is independent and has the same chance of success. The binomial tells you the chance of exactly k successes. Count how many ways the successes can be ordered, then multiply by their chances.

## Key formulas
- P(X = k) = C(n,k)·pᵏ·(1−p)ⁿ⁻ᵏ. n: number of trials, k: number of successes, p: chance of success each time (0 to 1)
- C(n,k) = n! / (k!(n−k)!). The number of ways to pick which trials succeed
- Mean = np and variance = np(1−p)

## Picture it
Draw `tree-diagram` for 2 trials. Label `tree-diagram.end-aa` "2 successes: p²" and `tree-diagram.end-bb` "0 successes: (1−p)²".
Draw `bar-chart` for n = 4, p = ½: put "k = 0" to "k = 4" under `bar-chart.bar-1` to `bar-chart.bar-5`, and write the true heights "1, 4, 6, 4, 1 sixteenths".

## Common mistakes
- Using it when trials are not independent or p changes: check the four conditions.
- Forgetting C(n,k): the order of successes can vary.
- Mixing p and 1 − p: p goes with successes, 1 − p with failures.

## Check questions
1. A fair coin is flipped 3 times. What is P(exactly 2 heads)?
   Answer: 3 × 0.25 × 0.5 = 0.375.
2. What is the mean for n = 10 and p = 0.3?
   Answer: 3.
3. Why does C(n,k) appear in the formula?
   Answer: It counts the different orders in which the k successes can happen.

## Flashcards
Q: What conditions does a binomial need?
A: Fixed n, two outcomes, independent trials, same p.
Q: Write the binomial probability formula.
A: C(n,k)·pᵏ·(1−p)ⁿ⁻ᵏ.
Q: What is the mean of a binomial?
A: np.
Q: What is C(4,2)?
A: 6.
Q: Four fair coin flips: P(no heads)?
A: 1/16.

## Root check
- random-variables: X is 1 with chance 0.3 and 0 otherwise. Find E(X). Answer: 0.3.
- binomial-theorem: What is C(4,2)? Answer: 6.
