---
title: "Routing to a smaller model beats random — even on a tight budget"
date: 2026-09-26
summary: "A short writeup of the budgeted model-routing experiment: what I tested, what the numbers said, and where the result is fragile."
draft: false
---

I recently ran a small experiment to answer a practical question: if you can
only afford to send *some* queries to a big, expensive model, can a simple
rule pick which ones — and beat just picking at random?

## The setup

Two open models, Qwen3-1.7B and Qwen3-4B, running locally. I used 70 practice
questions to estimate which *subjects* benefit most from the larger model,
then tested on 140 held-out questions with three policies: always use the
small model, allocate the big-model budget randomly, or route by estimated
per-subject gain.

## What the numbers said

The router beat random at every budget I tested. At a 25% budget it reached
33.6% accuracy against random's 30.7%; at 50% it captured most of the big
model's benefit (36.4% vs 33.5%). The sweet spot was a 50% budget — most of
the value, half the cost.

## Where it's fragile

This is a small study, and I'd rather say so than oversell it. Only one model
family; only five practice questions per subject, so a single question can
swing an estimate by ~20 points; and subject-level routing is crude. The
effect is real in this setup, but I wouldn't generalize it without more data.

The full code, data, and report are in the
[repository](https://github.com/jnx01/budgeted_model_routing).
