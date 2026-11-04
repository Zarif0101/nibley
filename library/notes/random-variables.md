# Discrete random variables

## Simple idea
A random variable turns each outcome into a number, like the score on a die. You list each possible number with its chance. The expectation is the long-run average if you repeated the experiment many times. It may not be a number you can actually get.

## Key formulas
- P(X = x): chance that X takes the value x. All the chances add up to 1
- E(X) = Σ x·P(X = x). E(X): expectation (mean), Σ: add over every x (same unit as X)
- Var(X) = E(X²) − [E(X)]². Var(X): variance, a measure of spread (unit of X squared)

## Picture it
Draw `bar-chart`; label `bar-chart.origin` "0". Put the values "1" to "5" under the bars from `bar-chart.bar-1` to `bar-chart.bar-5`, and "P(X = x)" up the side.
Draw `dice` and label `dice.top-face` "X = number shown".

## Common mistakes
- Probabilities that do not add to 1: find a missing one as 1 minus the rest.
- Averaging the x-values without weights: multiply each x by its chance.
- Expecting E(X) to be a possible value: a fair die has mean 3.5.

## Check questions
1. What is E(X) for a fair die?
   Answer: 3.5.
2. X is 1, 2, 3 with chances 0.2, 0.5, 0.3. Find E(X).
   Answer: 0.2 + 1.0 + 0.9 = 2.1.
3. Why can E(X) be a number X never takes?
   Answer: It is a long-run average, not a single result.

## Flashcards
Q: What do the probabilities of a random variable add up to?
A: 1.
Q: Write the formula for E(X).
A: Add up x times P(X = x) for every x.
Q: What does E(X) tell you in words?
A: The long-run average value.
Q: Write the formula for variance.
A: E(X²) − [E(X)]².
Q: X is the number of heads in 2 coin flips. What is E(X)?
A: 1.

## Root check
- probability-basics: What is the chance of heads on a fair coin? Answer: 1/2.
- statistics-measures: What is the mean of 2, 4 and 9? Answer: 5.
