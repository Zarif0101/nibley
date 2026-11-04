# EMF and internal resistance

## Simple idea
A real battery is not perfect. It has its full push, called EMF, but the battery itself also resists current a little. When you draw current, some of its push is wasted inside it as heat, so the voltage you actually get at the ends is lower. A flat, hot battery is losing more inside.

## Key formulas
- V = ε − I·r. V: terminal voltage (volts, V), ε: EMF (V), I: current (amperes, A), r: internal resistance (ohms, Ω)
- I = ε / (R + r). R: external resistance (Ω). The internal resistance is in series with it
- V = I·R. Terminal voltage also equals current times external resistance

## Picture it
Draw `battery` with a label at `battery.positive`: "EMF ε". Draw a `resistor` next to it, labelled "internal r", then another `resistor` labelled "load R" after it.
Label `battery.negative`: "terminal voltage V".

## Common mistakes
- Treating terminal voltage as the EMF: they match only when no current flows.
- Leaving out r when adding resistances: total is R + r.
- Thinking r is a separate part: it is inside the battery.

## Check questions
1. A 12 V EMF, r = 1 Ω, R = 5 Ω. What is the current?
   Answer: I = 12 / (5 + 1) = 2 A.
2. For that circuit, what is the terminal voltage?
   Answer: V = 12 − 2 × 1 = 10 V.
3. Why does terminal voltage drop when the current gets bigger?
   Answer: More voltage is lost inside, since V = ε − I·r.

## Flashcards
Q: What is EMF?
A: The energy per coulomb a battery gives, with no current drawn.
Q: What is terminal voltage?
A: The voltage across the battery's ends while it supplies current.
Q: When does terminal voltage equal EMF?
A: When no current flows.
Q: What are "lost volts"?
A: The voltage I·r wasted inside the battery.
Q: How are r and R connected?
A: In series.

## Root check
- series-parallel: A 4 Ω and a 6 Ω resistor are in series. What is the total? Answer: 10 Ω.
