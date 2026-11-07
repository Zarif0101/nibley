# Vectors

## Simple idea
A vector has a size and a direction, so you draw it as an arrow. "Walk 5 m" is not enough, you need "walk 5 m north". To add vectors, walk the first arrow, then start the next arrow where the first one ended (tip to tail). The total is one arrow from the very start to the very end.

## Key formulas
- |v| = √(x² + y²). |v|: size of the vector (same unit as the arrow, e.g. m), x and y: its sideways and upward parts
- vₓ = |v|·cos θ and v_y = |v|·sin θ. θ: angle from the x-axis (degrees or radians)
- (a, b) + (c, d) = (a + c, b + d). a, b, c, d: components
- k·(a, b) = (ka, kb). k: a plain number that stretches the arrow

## Picture it
Draw `vector-add`. Label the arrow ending at `vector-add.a-head` "a" and the next arrow ending at `vector-add.b-head` "b". Label the long arrow from `vector-add.a-tail` to `vector-add.b-head` "a + b".
Draw `vector-components`. Label `vector-components.x-mid` "x part", `vector-components.y-mid` "y part", `vector-components.angle` "θ".

## Common mistakes
- Adding sizes: 3 + 4 is not 5. Add components, then use Pythagoras.
- Swapping sin and cos: with θ from the x-axis, sideways uses cos and upward uses sin.
- Losing minus signs: left and down components are negative.

## Check questions
1. What are the two things a vector has?
   Answer: Size (magnitude) and direction.
2. Find (1, 2) + (3, −1).
   Answer: (4, 1).
3. Why is the size of (3, 4) equal to 5?
   Answer: The parts form a right triangle, and √(3² + 4²) = √25 = 5.

## Flashcards
Q: How do you add two vectors in a drawing?
A: Place them tip to tail; the sum goes from first tail to last tip.
Q: How do you add vectors in components?
A: Add the x parts together and the y parts together.
Q: What is the size of the vector (6, 8)?
A: 10.
Q: What does multiplying a vector by 2 do?
A: It doubles the size and keeps the direction.
Q: Which of speed and velocity is a vector?
A: Velocity, because it has a direction.

## Root check
- coordinates: Where is the point 3 right and 2 down from the origin? Answer: (3, −2).
- pythagoras: A right triangle has legs 6 and 8. What is the hypotenuse? Answer: 10.
- trig-ratios: In a right triangle, what is sin θ in words? Answer: Opposite side divided by hypotenuse.
