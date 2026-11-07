# Sets and Venn diagrams

## Simple idea
A set is a group of things, like the songs on your playlist. A Venn diagram draws each set as a circle. Where circles overlap, things belong to both sets. If a song is in your playlist and also your friend's, it sits in the overlap.

## Key formulas
- A ∪ B: union, everything in A or B or both
- A ∩ B: intersection, only what is in both A and B
- A′: complement, everything not in A. n(A): number of items in A. ∈: "is in"
- n(A ∪ B) = n(A) + n(B) − n(A ∩ B)

## Picture it
Draw `venn-two`. Label `venn-two.set-a`: "A only", `venn-two.overlap`: "A ∩ B", `venn-two.set-b`: "B only".
Label `venn-two.outside`: "in neither set".

## Common mistakes
- Mixing up ∪ and ∩: ∪ is "or" (join), ∩ is "and" (shared only).
- Counting the overlap twice: subtract n(A ∩ B) once.
- Forgetting items outside both circles: they still belong to the whole group.

## Check questions
1. A = {1, 2, 3} and B = {3, 4}. What is A ∩ B?
   Answer: {3}.
2. n(A) = 10, n(B) = 8 and n(A ∩ B) = 3. What is n(A ∪ B)?
   Answer: 15 (10 + 8 − 3).
3. Why do we subtract n(A ∩ B) when counting the union?
   Answer: Those items were counted once in A and again in B.

## Flashcards
Q: What does A ∪ B mean?
A: Everything in A, in B, or in both.
Q: What does A ∩ B mean?
A: Only the things in both A and B.
Q: What does A′ mean?
A: Everything not in A.
Q: What does n(A) mean?
A: The number of items in set A.
Q: What is the symbol for the empty set?
A: ∅, a set with nothing in it.

## Root check
- arithmetic-basics: What is 10 + 8 − 3? Answer: 15.
