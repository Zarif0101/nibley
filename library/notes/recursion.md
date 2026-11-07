# Recursion

## Simple idea
Recursion is a function that solves a problem by calling itself on a smaller version, like nesting dolls: open one, find a smaller one, until the smallest that doesn't open. That smallest case is the base case, which answers directly. Without a base case, the calls never stop.

## Key formulas
- def fact(n): return 1 if n == 0 else n * fact(n - 1)
- Every recursive function needs a base case and a step that gets closer to it.

## Picture it
Draw `nesting-dolls`. Label `nesting-dolls.big`: "fact(3)", `nesting-dolls.small`: "base case". Draw `stack-boxes` with `stack-boxes.top` labelled "newest call".

## Common mistakes
- No base case, so it recurses forever and crashes.
- A step that doesn't get smaller, like fact(n) calling fact(n).
- Thinking all calls run at once: each waits for the smaller one to return.

## Check questions
1. What is a base case?
   Answer: The simplest case, answered without calling itself.
2. With the fact function above, what is fact(3)?
   Answer: 6.
3. What happens without a base case?
   Answer: It never stops and the stack overflows.

## Flashcards
Q: What is recursion?
A: A function calling itself on a smaller problem.
Q: What two parts does a recursive function need?
A: A base case and a step closer to it.
Q: What is stack overflow?
A: Too many nested calls, so the program runs out of room.
Q: What is fact(0) in the example?
A: 1.
Q: Can a loop do what recursion does?
A: Often yes; recursion suits nested problems like trees.

## Root check
- functions-programming: def double(n): return n * 2. What is double(4)? Answer: 8.
- conditionals: x = 0. Does if x == 0: print("zero") print? Answer: Yes.
