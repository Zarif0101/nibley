# Classes and objects

## Simple idea
A class is a cookie cutter; objects are the cookies. The class describes what every object has (data, called attributes) and can do (actions, called methods). Each object made from it has its own values, like each cookie with its own icing. A Dog class can make many dogs, each with its own name.

## Key formulas
- class Dog: def __init__(self, name): self.name = name  then rex = Dog("Rex").
- self means "this object".

## Picture it
Draw `cookie-cutter`. Label `cookie-cutter.cutter`: "class Dog", `cookie-cutter.cookie-1`: "rex", `cookie-cutter.cookie-2`: "bella". Draw `blueprint` beside it.

## Common mistakes
- Confusing the class (the template) with an object (one thing made from it).
- Forgetting self, so attributes aren't stored on the object.
- Thinking changing one object changes all of them: each has its own data.

## Check questions
1. What is the difference between a class and an object?
   Answer: A class is the template; an object is one thing made from it.
2. What does self.name = name do?
   Answer: Stores name on this particular object.
3. Two Dog objects: does renaming one rename the other?
   Answer: No, each has its own attributes.

## Flashcards
Q: What is a class?
A: A template for making objects.
Q: What is an object?
A: One instance made from a class.
Q: What is an attribute?
A: Data stored on an object.
Q: What is a method?
A: A function that belongs to a class.
Q: What does __init__ do in Python?
A: Sets up a new object when it's made.

## Root check
- functions-programming: What does return do? Answer: Sends a value back to the caller.
- dictionaries: d = {"a": 1}. What is d["a"]? Answer: 1.
