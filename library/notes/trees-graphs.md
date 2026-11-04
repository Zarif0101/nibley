# Trees and graphs

## Simple idea
A graph is dots joined by lines, like towns joined by roads: the towns are nodes, the roads are edges. A tree is a special graph with one top node (the root) and no loops, like folders inside folders. Maps, friend networks and the web are graphs; file systems are trees.

## Key formulas
- none

## Picture it
Draw `binary-tree` and label `binary-tree.root`: "root", `binary-tree.leaf`: "leaf". Draw `graph-nodes` and label `graph-nodes.node-a`: "node".

## Common mistakes
- Calling any graph a tree: trees have no loops and one root.
- Forgetting that graph edges can be one-way.
- Visiting the same node twice when walking a graph without marking visited ones.

## Check questions
1. What is the top node of a tree called?
   Answer: The root.
2. Can a tree contain a loop?
   Answer: No.
3. In a road map graph, what are the towns?
   Answer: Nodes.

## Flashcards
Q: What is a graph?
A: Nodes connected by edges.
Q: What is a tree?
A: A connected graph with one root and no loops.
Q: What is a leaf?
A: A tree node with no children.
Q: What is an edge?
A: A link between two nodes.
Q: Why is recursion handy for trees?
A: Each child is itself a smaller tree.

## Root check
- lists-arrays: What is len([1, 2, 3])? Answer: 3.
- recursion: What is a base case? Answer: The simplest case, answered without calling itself.
