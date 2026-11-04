# Time complexity (Big O)

## Simple idea
Big O asks: if the input doubles, how much more work? Checking every book in a messy pile grows with the pile: O(n). Halving a sorted shelf grows very slowly: O(log n). Checking every pair of students grows much faster: O(n²). It's about the growth, not the exact seconds.

## Key formulas
- O(1) constant, O(log n), O(n) linear, O(n log n), O(n²) quadratic: from slow growth to fast growth.

## Picture it
Draw `graph-log` labelled "O(log n): grows slowly". Draw `bookshelf` with `bookshelf.books` labelled "n books".

## Common mistakes
- Treating Big O as exact time: it ignores constant factors.
- Thinking a "slower" Big O always loses: on tiny inputs it can win.
- Counting only one loop when there is a loop inside a loop.

## Check questions
1. A loop over n items with a loop over n items inside: what is the Big O?
   Answer: O(n²).
2. What is the Big O of binary search?
   Answer: O(log n).
3. What does O(1) mean?
   Answer: The work doesn't grow with the input size.

## Flashcards
Q: What does Big O describe?
A: How work grows as input grows.
Q: Big O of checking every item once?
A: O(n).
Q: Big O of a loop inside a loop over n?
A: O(n²).
Q: Which grows slower, O(log n) or O(n)?
A: O(log n).
Q: Does Big O give exact running time?
A: No, only the growth rate.

## Root check
- searching-sorting: What must be true for binary search to work? Answer: The list is sorted.
- logarithms: What is log base 2 of 8? Answer: 3.
