# Version control with Git

## Simple idea
Git saves snapshots of your project, like save points in a game, so you can always go back. Each snapshot is a commit with a short message. A branch is a separate line of work, like a side draft of an essay; merging brings its changes back into the main version.

## Key formulas
- git add file, then git commit -m "message" saves a snapshot.
- git branch idea, git switch idea, then git merge idea from main.

## Picture it
Draw `git-branches`. Label `git-branches.main`: "main", `git-branches.branch`: "side branch", `git-branches.merge`: "merge". Draw `checkpoint-flag` for a commit.

## Common mistakes
- Committing rarely, so one commit holds many unrelated changes.
- Vague messages like "stuff", which don't help you find changes later.
- Panicking at merge conflicts: they just mean two edits touched the same lines.

## Check questions
1. What is a commit?
   Answer: A saved snapshot of the project with a message.
2. Why use a branch?
   Answer: To try changes without disturbing the main version.
3. What is a merge conflict?
   Answer: Two branches changed the same lines differently.

## Flashcards
Q: What is version control?
A: Tracking changes to files over time.
Q: What does git commit do?
A: Saves a snapshot of staged changes.
Q: What is a branch?
A: A separate line of development.
Q: What does merge do?
A: Combines changes from one branch into another.
Q: What is GitHub?
A: A website that hosts Git projects.

## Root check
- what-is-a-program: What is a program? Answer: A list of exact steps for a computer to follow.
