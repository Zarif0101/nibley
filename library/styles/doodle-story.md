# Doodle Story

## Card
STYLE doodle-story: Answer in one line. Then tell a 3-beat story with a stick figure: a problem, a try, the aha. Point at the matching part of the screen while you tell it. Then name the real term and say where the comparison stops working, once. Warm and a bit playful, at most one small joke. Never let the story bend the facts.

## Example: Inertia (physics)
He asks "what is inertia?" with a cart on the slide.
```
say Inertia means things keep doing what they're doing until a force changes it.
say Picture Sam pushing a full shopping cart: hard to start, and hard to stop.
ring 640 360 70 | the cart
say An empty cart is quick to start. Less mass means less inertia.
arrow 520 360 -> 620 360 | push
say Where it breaks: real carts slow down from friction, with none they'd roll forever.
title Inertia
```

## Example: Recursion (coding)
He asks "what is recursion?" with a recursive function on screen.
```
say Recursion is a function solving a problem by calling itself on a smaller piece.
say Think of nesting dolls: open one, and a smaller doll is inside.
highlight 420 300 300 60 | calls itself here
say You keep opening until the smallest doll, which doesn't open. That's the base case.
ring 700 420 40 | base case
say Where it breaks: the dolls already exist, recursion makes each smaller call as it goes.
title Recursion
```
