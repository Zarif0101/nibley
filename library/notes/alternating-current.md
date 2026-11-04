# Alternating current

## Simple idea
A battery pushes current one way. Mains electricity swings back and forth, many times a second, like pushing a swing. The voltage rises to a peak, falls through zero, goes negative, and repeats. Because it keeps changing, we quote one steady-equivalent number, the rms value, for how hard it works.

## Key formulas
- V = V₀·sin(2π·f·t). V: voltage now (volts, V), V₀: peak voltage (V), f: frequency (hertz, Hz), t: time (seconds, s)
- T = 1 / f. T: time for one cycle (s)
- V(rms) = V₀ / √2 ≈ 0.707·V₀. I(rms) = I₀ / √2, I₀: peak current (amperes, A)
- P(average) = V(rms)·I(rms). P: power (watts, W)

## Picture it
Draw `graph-sine`. Label `graph-sine.peak`: "peak V₀" and `graph-sine.trough`: "−V₀".
Label `graph-sine.period-end`: "one cycle, time T". Draw `meter` beside it labelled "reads rms".

## Common mistakes
- Using the peak value for power: use rms values.
- Thinking average voltage is the rms: the plain average is zero.
- Mixing up f and T: T = 1 / f.

## Check questions
1. A 50 Hz supply: how long is one cycle?
   Answer: T = 1 / 50 = 0.02 s.
2. A peak voltage is 10 V. What is the rms voltage?
   Answer: 10 / √2 ≈ 7.07 V.
3. Why is the rms value used instead of the plain average?
   Answer: The average over a cycle is zero, but the rms shows the heating effect.

## Flashcards
Q: What does alternating current do?
A: It keeps reversing direction.
Q: What is frequency?
A: The number of cycles each second, in hertz (Hz).
Q: How do you get rms from peak?
A: Divide the peak by √2.
Q: What is the formula for period?
A: T = 1 / f.
Q: What is the average power in an AC circuit?
A: V(rms) × I(rms).

## Root check
- electromagnetic-induction: Why does a coil spinning in a magnetic field make a voltage? Answer: The flux through it keeps changing.
- trig-functions: What is the highest value sin θ can reach? Answer: 1.
- electrical-power: A device runs on 20 V and 5 A. What is its power? Answer: 100 W.
