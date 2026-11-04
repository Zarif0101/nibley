# Conditional probability

## Simple idea
Sometimes you already know something has happened, and that changes the odds. If you know a card drawn is red, the chance it is a heart is bigger than before. You only look at the cases where the known thing is true. That smaller group is your new whole.

## Key formulas
- P(A|B) = P(A and B) / P(B). P(A|B): chance of A given B, P(B) must not be 0 (probabilities run from 0 to 1)
- P(A and B) = P(A|B) × P(B)
- If A and B are independent, P(A|B) = P(A)

## Picture it
Draw `tree-diagram`. Label `tree-diagram.branch-a` "1st red" and `tree-diagram.branch-b` "1st blue".
Label `tree-diagram.end-aa` "2nd red: 2/4". Draw `venn-two` and label `venn-two.overlap` "A and B" and `venn-two.set-b` "B, the new whole".

## Common mistakes
- Mixing up P(A|B) and P(B|A): they are usually different.
- Not updating the second pick: without replacement, totals shrink.
- Dividing by P(A) instead of P(B): divide by the thing you are given.

## Check questions
1. A bag has 3 red and 2 blue. Two taken without replacement. P(both red)?
   Answer: 3/5 × 2/4 = 3/10.
2. P(A and B) = 0.2 and P(B) = 0.5. What is P(A|B)?
   Answer: 0.4.
3. Why does knowing B change the probability?
   Answer: Only outcomes inside B are still possible, so B becomes the whole.

## Flashcards
Q: Write the formula for P(A|B).
A: P(A and B) divided by P(B).
Q: What does the bar | mean?
A: Given that.
Q: When are A and B independent?
A: When P(A|B) = P(A).
Q: Rearrange to find P(A and B).
A: P(A|B) × P(B).
Q: Do the probabilities on a tree's branches from one point add up?
A: Yes, they add to 1.

## Root check
- probability-basics: A die is rolled. What is the chance of an even number? Answer: 1/2.
