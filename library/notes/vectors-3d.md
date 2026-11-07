# Vectors in 3D

## Simple idea
A 2D vector says how far to go right and up. In 3D you add one more number for how far to go forward or up out of the page. Think of a drone: so far east, so far north, so high. The vector is the arrow that joins the start to that spot.

## Key formulas
- v = (x, y, z) = x·i + y·j + z·k. x, y, z: parts along each axis (a length, e.g. m), i, j, k: unit arrows of length 1
- |v| = √(x² + y² + z²). |v|: length of v (same unit as x)
- Add by parts: (a, b, c) + (d, e, f) = (a+d, b+e, c+f)

## Picture it
Draw `axes-3d` and put `vector-arrow.tail` on `axes-3d.origin`.
Label `vector-arrow.head` "(2, 3, 6)". Label `axes-3d.x-end` "x", `axes-3d.y-end` "y" and `axes-3d.z-end` "z".

## Common mistakes
- Using the 2D length formula: add z² under the root too.
- Adding the parts of different axes together: add x with x, y with y, z with z.
- Forgetting the square root: |v| is √(…), not the sum of squares.

## Check questions
1. Find the length of (2, 3, 6).
   Answer: √49 = 7.
2. Add (1, 2, 3) and (4, 0, −1).
   Answer: (5, 2, 2).
3. Why does the length formula have three squares?
   Answer: Pythagoras used twice: once across the floor, once going up.

## Flashcards
Q: What are i, j and k?
A: Unit vectors along the x, y and z axes.
Q: Write the length of (x, y, z).
A: √(x² + y² + z²).
Q: What is 3 times (1, 2, 0)?
A: (3, 6, 0).
Q: What is the length of (1, 2, 2)?
A: 3.
Q: Which axis points up in the picture?
A: The z-axis.

## Root check
- vectors-basics: What is the length of the vector (3, 4)? Answer: 5.
