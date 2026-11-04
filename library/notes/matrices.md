# Matrices

## Simple idea
A matrix is a grid of numbers in rows and columns, like a small spreadsheet. A shop could list prices in rows and shops in columns. You add matrices by adding matching spots. Multiplying is different: you pair a row with a column, multiply the pairs and add them up.

## Key formulas
- Size: m × n means m rows and n columns
- Add or subtract: same size only, entry by entry. Written here as [1 2; 3 4], where ; starts a new row
- k·A: multiply every entry by k (k: a plain number)
- (AB) entry in row i, column j = row i of A paired with column j of B, multiplied and added. A is m × n and B is n × p, so AB is m × p
- AB is usually not equal to BA

## Picture it
Draw `matrix-brackets`. Write "a" at `matrix-brackets.entry-11`, "b" at `matrix-brackets.entry-12`, "c" at `matrix-brackets.entry-21`, "d" at `matrix-brackets.entry-22`.
Label above `matrix-brackets.left-bracket`: "2 rows, 2 columns".

## Common mistakes
- Adding matrices of different sizes: they must match exactly.
- Multiplying entry by entry: use row times column.
- Assuming AB = BA: order matters, so keep it.

## Check questions
1. How many rows and columns does a 2 × 3 matrix have?
   Answer: 2 rows and 3 columns.
2. What is the top-left entry of [1 2; 3 4] times [5 6; 7 8]?
   Answer: 1·5 + 2·7 = 19.
3. Why can't you add a 2 × 2 and a 2 × 3 matrix?
   Answer: The entries need a matching partner in each spot, and the sizes differ.

## Flashcards
Q: What is a matrix?
A: A grid of numbers arranged in rows and columns.
Q: What is [1 2; 3 4] + [5 6; 7 8]?
A: [6 8; 10 12].
Q: What is 2 × [1 2; 3 4]?
A: [2 4; 6 8].
Q: What is the rule for multiplying matrices?
A: Row of the first times column of the second, add the products.
Q: Is matrix multiplication order-free, like AB = BA?
A: No, usually AB is not equal to BA.

## Root check
- algebra-basics: Solve 2x + 3 = 11. Answer: x = 4.
- simultaneous-equations: Solve x + y = 5 and x − y = 1. Answer: x = 3, y = 2.
