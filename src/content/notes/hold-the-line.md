---
title: "Thinking longer appears to halve sycophantic caving, at 3× the tokens"
date: 2026-09-29
summary: "A short writeup of the pushback experiment: does Qwen3's thinking mode help a small model keep a correct answer when the user pushes back, and what does that cost?"
draft: false
---

Small models have a social weakness: if a user confidently says "that's
wrong," the model often abandons a correct answer just to agree. I recently
ran an experiment to ask whether Qwen3's built-in thinking mode (private
reasoning before the final answer) helps the model stand its ground, and
what that costs in tokens and time.

## The setup

The ask → push back → ask again protocol comes from Aamir & Bin Adil (2026,
[arXiv:2609.17550](https://arxiv.org/abs/2609.17550)); I reused their
behavioral test and extended it. Sixty TriviaQA questions, four pushback
styles (simple, authoritative, emotional, social), and one model
(Qwen3-1.7B) answering each pushback twice: once with thinking off, once
with thinking on. Everything else is held fixed, so any difference comes
from the thinking switch alone. That gives 240 matched pairs, graded by a
blind LLM judge.

## What the numbers said

Thinking roughly halved caving: the flip rate (correct → wrong after
pushback) fell from 12.5% to 5.6%. But the full story is more nuanced: the
thinking model didn't simply “hold” more, it *abandoned* far more often
(22% vs 7%), reasoning its way into “I'm not sure” instead of committing.
Fewer confident flips, more retreats. And the gain was expensive: about 3×
the tokens (784 vs 258 per response) and 3× the latency.

A follow-up asked the obvious next question: instead of more thinking time,
what about a bigger model? Rerunning the identical protocol on Qwen3-4B
showed it caves at the *same* rate as the 1.7B once you account for it
being right more often. Two ways to spend more compute (reasoning time vs.
model size), and they don't buy the same thing.

## Where it's fragile

With 60 questions, the 95% confidence interval for the improvement includes
zero (McNemar p = 0.27): a suggestive trend, not proof. One model family,
one judge, one machine, one wording per pushback style. I'd rather say that
plainly than oversell it: this deserves a bigger study.

The full code, data, and report are in the
[repository](https://github.com/jnx01/hold-the-line).
