# Debugging

## Simple idea
Debugging is detective work. Read the error message (the clue), guess where the problem is, test the guess, and narrow it down. Print values to see what the program really holds, change one thing at a time, and re-run. Most bugs are a small mismatch between what you meant and what you wrote.

## Key formulas
- none

## Picture it
Draw `magnifier` over `terminal`. Label `terminal.screen`: "read the error line", `magnifier.lens`: "check one guess".

## Common mistakes
- Ignoring the error message, which usually names the line and the problem.
- Changing many things at once, so you can't tell what fixed it.
- Assuming a value instead of printing it to check.

## Check questions
1. What should you read first when a program crashes?
   Answer: The error message, especially its line number.
2. Why change one thing at a time?
   Answer: So you know which change fixed or broke it.
3. How can print help?
   Answer: It shows what values really are at that point.

## Flashcards
Q: What is a bug?
A: A mistake that makes a program misbehave.
Q: What is debugging?
A: Finding and fixing bugs.
Q: What does an error message usually tell you?
A: What went wrong and on which line.
Q: What is a syntax error?
A: Code that breaks the language's writing rules.
Q: What is a logic error?
A: Code that runs but gives the wrong result.

## Root check
- conditionals: x = 2. Does if x > 5: print("big") print anything? Answer: No.
- input-output: Which Python function shows text on screen? Answer: print().
