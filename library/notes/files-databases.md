# Files and databases

## Simple idea
A program forgets everything when it stops, like a desk cleared at night. Files keep data on disk, like papers in a drawer. A database is an organised library catalogue: many records, each with the same fields, that you can search and update quickly, often with a language called SQL.

## Key formulas
- Python: open("notes.txt", "w").write("hi") saves text; open("notes.txt").read() reads it back.
- SQL: SELECT name FROM students WHERE age > 15;

## Picture it
Draw `database` with `database.db` labelled "many records". Draw `index-cards` with `index-cards.card` labelled "one record".

## Common mistakes
- Forgetting that opening a file with "w" wipes what was in it.
- Not closing files (or not using with), so data may not be saved.
- Storing lots of related records in one big text file instead of a database.

## Check questions
1. Why save data to a file?
   Answer: So it's kept after the program ends.
2. In a database table, what is a row?
   Answer: One record.
3. What does "w" do when opening a file in Python?
   Answer: Opens it for writing and replaces its contents.

## Flashcards
Q: What is a file?
A: Named data stored on disk.
Q: What is a database?
A: An organised store of records you can search.
Q: What is a record?
A: One entry, like one student's details.
Q: What is SQL used for?
A: Asking a database for data.
Q: What does open(f, "a") do in Python?
A: Adds to the end of the file.

## Root check
- dictionaries: How do you look up the value for key "x" in d? Answer: d["x"].
- input-output: What does print() do? Answer: Shows text on the screen.
