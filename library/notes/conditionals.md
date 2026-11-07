# Conditionals (if and else)

## Simple idea
An if statement is a fork in the road: a condition is the sign, and only one path is taken. if raining: take umbrella, else: wear sunglasses. The code under if runs only when the condition is True; otherwise the else part runs. elif adds more signs, checked in order.

## Key formulas
- if condition: ... elif other: ... else: ...
- Only the first true branch runs.

## Picture it
Draw `flowchart-decision`. Label `flowchart-decision.decision`: "raining?", `flowchart-decision.yes`: "umbrella", `flowchart-decision.no`: "sunglasses".

## Common mistakes
- Using = instead of == inside the condition.
- Expecting several elif branches to run: only the first true one does.
- Wrong indentation, so a line ends up outside the if.

## Check questions
1. x = 5. Does if x > 3: print("big") print anything?
   Answer: Yes, "big".
2. With if, elif and else, how many branches run?
   Answer: Exactly one.
3. What runs when the if condition is False and there is no else?
   Answer: Nothing from that block; the program carries on.

## Flashcards
Q: What does an if statement do?
A: Runs code only when its condition is True.
Q: When does else run?
A: When the if (and elif) conditions are all False.
Q: What does elif mean?
A: Else if: another condition to check.
Q: How many branches of one if chain run?
A: At most one.
Q: What decides which branch runs?
A: The conditions, checked top to bottom.

## Root check
- booleans-comparisons: What is 4 == 4? Answer: True.
