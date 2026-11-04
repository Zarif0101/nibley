# Permutations and combinations

## Simple idea
Counting ways to pick things. If order matters, like picking a president then a treasurer from a class, it is a permutation. If order does not matter, like picking 2 friends for a pizza, it is a combination. Each group of friends can be ordered several ways, so combinations are always fewer.

## Key formulas
- n! = n × (n − 1) × ... × 1. n: how many items. 0! = 1
- nPr = n! / (n − r)!. n: items available, r: items chosen, order matters
- nCr = n! / (r!(n − r)!). Same letters, order does not matter
- nCr = nCₙ₋ᵣ. Choosing r to take is the same as choosing n − r to leave

## Picture it
Draw `tree-diagram`. Label `tree-diagram.start` "pick first", `tree-diagram.branch-a` "choice A" and `tree-diagram.branch-b` "choice B".
Label `tree-diagram.end-aa`, `tree-diagram.end-ab`, `tree-diagram.end-ba`, `tree-diagram.end-bb` with the four outcomes: "2 × 2 = 4 ways".

## Common mistakes
- Using a permutation when order does not matter: use nCr.
- Adding the choices when you should multiply them: steps in a row multiply.
- Forgetting 0! = 1.

## Check questions
1. What is 5!?
   Answer: 120.
2. How many ways to pick 2 people from 5, order not mattering?
   Answer: 5C2 = 10.
3. Why is 5P2 = 20 bigger than 5C2 = 10?
   Answer: Each pair can be ordered 2 ways, so 10 × 2 = 20.

## Flashcards
Q: What is n! in words?
A: Multiply n by every whole number below it down to 1.
Q: Does order matter in a permutation?
A: Yes.
Q: Formula for nCr?
A: n! / (r!(n − r)!).
Q: What is 0!?
A: 1.
Q: What is 6C1?
A: 6.

## Root check
- arithmetic-basics: What is 6 × 5 ÷ 2? Answer: 15.
