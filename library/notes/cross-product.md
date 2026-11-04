# Cross product

## Simple idea
The cross product multiplies two 3D vectors and gives a new vector that sticks out at right angles to both. Picture tightening a screw: turn from a to b and the screw moves along a × b. Its length is the area of the parallelogram the two vectors make.

## Key formulas
- a × b = (a₂b₃ − a₃b₂, a₃b₁ − a₁b₃, a₁b₂ − a₂b₁). a, b: vectors, a₁ to b₃: their parts
- |a × b| = |a|·|b|·sin θ. |a|, |b|: lengths, θ: angle between them (result in square units)
- b × a = −(a × b), and a × b = 0 if a and b are parallel

## Picture it
Draw `parallelogram`. Label `parallelogram.side-a-head` "a", `parallelogram.side-b-head` "b" and `parallelogram.center` "area = |a × b|".
Draw `axes-3d` and an arrow along `axes-3d.z-end` labelled "a × b".

## Common mistakes
- Swapping the order: b × a points the opposite way.
- Mixing up with the dot product: cross gives a vector, dot gives a number.
- Using cos in the length: the cross product uses sin.

## Check questions
1. What is i × j?
   Answer: k, which is (0, 0, 1).
2. Find (1, 2, 3) × (4, 5, 6).
   Answer: (−3, 6, −3).
3. Why is a × a = 0?
   Answer: The angle is 0°, and sin 0° = 0.

## Flashcards
Q: Is the cross product a vector or a number?
A: A vector.
Q: Which way does a × b point?
A: At right angles to both, by the right-hand rule.
Q: What does |a × b| equal geometrically?
A: The area of the parallelogram made by a and b.
Q: What is b × a in terms of a × b?
A: The negative: −(a × b).
Q: Area of parallelogram from (2, 0, 0) and (0, 3, 0)?
A: 6.

## Root check
- dot-product: Find (1, 2, 3)·(2, 0, 1). Answer: 5.
- determinants: What is the determinant of the matrix with rows (1, 2) and (3, 4)? Answer: −2.
