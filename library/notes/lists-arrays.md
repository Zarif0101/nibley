# Lists and arrays

## Simple idea
A list keeps many values in one place, in order, like eggs in a tray. Each item sits at a position called an index, and counting starts at 0, like the ground floor in a lift. scores = [7, 9, 4] makes a list; scores[0] is 7 and scores[2] is 4.

## Key formulas
- len(xs) is the number of items; xs[0] is the first, xs[len(xs) - 1] the last.
- xs.append(v) adds v to the end (Python).

## Picture it
Draw `array-boxes`. Label `array-boxes.cell-first`: "index 0", `array-boxes.cell-last`: "index 4". Draw `egg-tray` beside it.

## Common mistakes
- Starting to count at 1: the first item is at index 0.
- Using index len(xs): it's one past the end, so it crashes.
- Thinking a list can only hold numbers: it can hold any values.

## Check questions
1. xs = [5, 8, 2]. What is xs[1]?
   Answer: 8.
2. What is len([5, 8, 2])?
   Answer: 3.
3. What is the index of the last item in a list of 10?
   Answer: 9.

## Flashcards
Q: What is a list?
A: An ordered collection of values.
Q: What index does the first item have?
A: 0.
Q: How do you add an item to the end in Python?
A: xs.append(item).
Q: What does len(xs) give?
A: How many items are in xs.
Q: What happens with xs[len(xs)]?
A: An error: it's past the end.

## Root check
- variables-values: x = 4, then x = 6. What is x? Answer: 6.
- loops: How many times does for i in range(4) run? Answer: 4 times.
