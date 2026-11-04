# Lines and planes in 3D

## Simple idea
A line in space is a starting point plus any number of steps in one direction. Like walking along a straight road. A plane is a flat sheet, like a table top. It is fixed by one point on it and an arrow, the normal, that stands straight up from it.

## Key formulas
- Line: r = a + t·d. r: any point on the line, a: a known point, d: direction vector, t: any real number
- Plane: n·(r − r₀) = 0. n: normal vector, r: any point on the plane, r₀: a known point on it
- Plane in x, y, z form: ax + by + cz = k, with n = (a, b, c). k: a constant

## Picture it
Draw `plane-3d` and label `plane-3d.normal-head` "normal n". Label `plane-3d.center` "known point r₀".
Draw `axes-3d` and label `axes-3d.origin` "line starts".

## Common mistakes
- Mixing up a point and a direction: a is where you start, d is where you head.
- Using the wrong vector for a plane: use the normal, not a vector lying in it.
- Using only positive t: t can be negative too.

## Check questions
1. A line goes through (1, 2, 3) with direction (1, 0, 2). Find the point at t = 2.
   Answer: (3, 2, 7).
2. Is (1, 1, 1) on the plane x + 2y + 3z = 6?
   Answer: Yes, 1 + 2 + 3 = 6.
3. Why does the plane equation use a dot product?
   Answer: Any vector lying in the plane is at right angles to n, so the dot product is zero.

## Flashcards
Q: What are the two ingredients of a line?
A: A point on it and a direction.
Q: What does t do in r = a + t·d?
A: It says how many steps of d to take.
Q: What is the normal vector of a plane?
A: A vector at right angles to the plane.
Q: What is the normal of 2x − y + 5z = 7?
A: (2, −1, 5).
Q: What does n·(r − r₀) = 0 say?
A: Every vector in the plane is at right angles to n.

## Root check
- dot-product: Are (2, 1, 0) and (1, −2, 5) at right angles? Answer: Yes, the dot product is 0.
