# Searching and sorting

## Simple idea
Sorting puts items in order, like arranging books on a shelf by height. Once a list is sorted, you can search it fast: open the middle, keep the half the item must be in, and repeat, like finding a word in a dictionary. That's binary search. On an unsorted list you must check items one by one.

## Key formulas
- Linear search checks each item: up to n checks.
- Binary search halves the range each step: about log2(n) checks, but only on sorted data.

## Picture it
Draw `bookshelf` with `bookshelf.books` labelled "sorted by height". Draw `array-boxes` and label `array-boxes.row`: "check the middle, keep one half".

## Common mistakes
- Using binary search on an unsorted list.
- Thinking sorting is free: it takes work, so it pays off when you search many times.
- Off-by-one errors when moving the low and high ends.

## Check questions
1. What must be true before binary search works?
   Answer: The list must be sorted.
2. About how many checks does binary search need for 1000 items?
   Answer: About 10.
3. How does linear search work?
   Answer: It checks each item in turn until it finds a match.

## Flashcards
Q: What is sorting?
A: Putting items in order.
Q: What is linear search?
A: Checking items one by one.
Q: What is binary search?
A: Repeatedly halving a sorted list to find an item.
Q: Which is faster on big sorted lists?
A: Binary search.
Q: Name a sorting algorithm.
A: Merge sort, insertion sort or bubble sort.

## Root check
- lists-arrays: What index is the first item of a list? Answer: 0.
- algorithms-basics: What must every algorithm do eventually? Answer: Finish.
