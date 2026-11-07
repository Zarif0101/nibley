# Scope

## Simple idea
Scope is where a name can be seen. A function is like a house: names made inside it stay inside, and the street outside can't see them. Two houses can both have a room called "kitchen" without mixing them up. Names made outside all functions are global and visible everywhere.

## Key formulas
- A variable made inside a function is local: it disappears when the function ends.

## Picture it
Draw `house`. Label `house.window`: "local names live here", `house.door`: "only the return value comes out".

## Common mistakes
- Trying to use a function's local variable outside it.
- Thinking two functions' variables with the same name are the same variable.
- Relying on global variables everywhere, which makes bugs hard to find.

## Check questions
1. def f(): x = 3. Can you print x outside f?
   Answer: No, x is local to f.
2. Two functions both use a variable named n. Do they clash?
   Answer: No, each n is local to its own function.
3. How should a function share its result?
   Answer: By returning it.

## Flashcards
Q: What is scope?
A: The part of the program where a name can be used.
Q: What is a local variable?
A: One made inside a function, only visible there.
Q: What is a global variable?
A: One made outside all functions, visible everywhere.
Q: What happens to local variables when a function ends?
A: They are gone.
Q: How does a value leave a function?
A: Through return.

## Root check
- functions-programming: What does return do? Answer: Sends a result back to the caller.
