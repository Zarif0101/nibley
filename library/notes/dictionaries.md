# Dictionaries (key-value maps)

## Simple idea
A dictionary is a chest of labelled drawers: you open a drawer by its label, not by counting. ages = {"Sam": 15, "Ria": 16} stores values under keys, and ages["Ria"] gives 16. Each key appears once, and looking one up is fast even in a huge dictionary.

## Key formulas
- d[key] reads a value; d[key] = value adds or changes it; key in d checks it exists.

## Picture it
Draw `drawers`. Label `drawers.drawer-1`: "Sam: 15", `drawers.drawer-2`: "Ria: 16". Draw `hash-buckets` beside it.

## Common mistakes
- Reading a key that doesn't exist, which raises an error.
- Expecting two values under the same key: the second replaces the first.
- Looking things up by position like in a list.

## Check questions
1. d = {"a": 1, "b": 2}. What is d["b"]?
   Answer: 2.
2. What does d["a"] = 5 do?
   Answer: Changes the value under "a" to 5.
3. Can a dictionary have the same key twice?
   Answer: No, keys are unique.

## Flashcards
Q: What is a dictionary?
A: A collection of key-value pairs.
Q: How do you look up a value?
A: d[key].
Q: Are keys unique?
A: Yes.
Q: How do you check a key exists?
A: key in d.
Q: Dictionary or list: which finds things by name?
A: A dictionary.

## Root check
- lists-arrays: xs = [3, 6, 9]. What is xs[0]? Answer: 3.
