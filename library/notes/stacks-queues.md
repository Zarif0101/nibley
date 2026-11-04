# Stacks and queues

## Simple idea
A stack is a pile of plates: the last plate put on is the first taken off. A queue is a line at a bus stop: the first to arrive is the first to get on. Stacks power undo buttons and function calls; queues handle tasks in the order they arrive, like print jobs.

## Key formulas
- Stack: push adds to the top, pop removes from the top (last in, first out).
- Queue: enqueue adds to the back, dequeue removes from the front (first in, first out).

## Picture it
Draw `stack-boxes` with `stack-boxes.top` labelled "push and pop here". Draw `queue-boxes` with `queue-boxes.back` labelled "join" and `queue-boxes.front` labelled "leave". `plate-stack` and `queue-people` show the everyday versions.

## Common mistakes
- Mixing up which end items leave from.
- Popping from an empty stack, which is an error.
- Using a plain list as a queue and removing from the front, which is slow for big lists.

## Check questions
1. Push 1, push 2, push 3, then pop. What comes out?
   Answer: 3.
2. Enqueue A, B, C, then dequeue. What comes out?
   Answer: A.
3. Which one does an undo button use?
   Answer: A stack.

## Flashcards
Q: What does LIFO mean?
A: Last in, first out: a stack.
Q: What does FIFO mean?
A: First in, first out: a queue.
Q: What does push do?
A: Adds an item to the top of a stack.
Q: What does dequeue do?
A: Removes the item at the front of a queue.
Q: Where does the call stack get its name?
A: Function calls pile up and finish newest first.

## Root check
- lists-arrays: xs = [4, 7]. What does xs.append(9) make xs? Answer: [4, 7, 9].
