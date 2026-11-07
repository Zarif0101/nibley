# Loops (for and while)

## Simple idea
A loop repeats steps so you don't write them again and again, like running laps of a track with a counter. A for loop runs a set number of times, or once per item in a list. A while loop keeps going while a condition is true, like stirring a sauce until it's thick.

## Key formulas
- for i in range(5): ... runs with i = 0, 1, 2, 3, 4.
- while condition: ... repeats until the condition is False.

## Picture it
Draw `running-track`. Label `running-track.start`: "one lap = one pass". Draw `loop-arrow` with `loop-arrow.box` labelled "loop body".

## Common mistakes
- A while loop whose condition never changes, so it runs forever.
- Thinking range(5) includes 5: it stops at 4.
- Changing a list while looping over it.

## Check questions
1. How many times does for i in range(3) run?
   Answer: 3 times, with i = 0, 1, 2.
2. When does a while loop stop?
   Answer: When its condition becomes False.
3. Why might a while loop never stop?
   Answer: Nothing inside it changes the condition.

## Flashcards
Q: What does a loop do?
A: Repeats a block of code.
Q: When do you use a for loop?
A: When you know how many times, or to go through each item.
Q: When do you use a while loop?
A: When you repeat until a condition changes.
Q: What is an infinite loop?
A: A loop that never stops.
Q: What numbers does range(4) give?
A: 0, 1, 2, 3.

## Root check
- conditionals: When does the else part of an if run? Answer: When the condition is False.
- variables-values: count = 2, then count = count + 1. What is count? Answer: 3.
