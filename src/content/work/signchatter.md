---
title: "SignChatter"
kind: research
weight: 2
summary: "Sign-language recognition end to end: a dataset built from scratch, a model comparison, a deployed app, and a peer-reviewed Springer publication."
stack: ["PyTorch", "MediaPipe", "OpenCV", "RNN/LSTM/GRU", "Android", "Flask"]
links:
  - label: "GitHub"
    url: "https://github.com/jnx01/SignChatter"
  - label: "Springer chapter"
    url: "https://link.springer.com/chapter/10.1007/978-981-95-2212-5_13"
  - label: "WLPSL dataset on Kaggle"
    url: "https://www.kaggle.com/datasets/jahanzebnaeem/wlpsl"
  - label: "Full thesis"
    url: "http://dspace.bahria.edu.pk:8080/xmlui/handle/123456789/15662"
confidential: false
featured: true
---

## Context

SignChatter started as my final-year project and became the piece of work
that taught me research and shipping are the same discipline. The goal was a
system that could recognize word-level sign language from video and speak the
result aloud — giving sign-language users a way to "talk" to non-signers. Why videos?
Most signs involve body movement, so accurate sign recognition requires the
full gesture; start to end.

The project covered both American and Pakistani Sign Language, with the
Pakistani side requiring a dataset that didn't exist yet.

## The dataset

There was no video-based word-level Pakistani Sign Language dataset, so I built one from
scratch: **31 classes, 248 videos, 12 participants**, recorded and labeled by
the team. It's published on Kaggle as **WLPSL** and is still in use by other
researchers — roughly 2,100 views and 340 downloads at the time of writing.

From each video I extracted human body-movement keypoints with **MediaPipe**,
turning an unstructured video problem into a sequence-modeling problem.

## The models

With keypoints in hand, I trained and compared four recurrent architectures —
**RNN, BRNN, LSTM, and GRU** — to find the best accuracy/efficiency trade-off
for a deployed setting. The comparison mattered more than any single number:
the goal was a model small and fast enough to run in a real product, not a
leaderboard entry.

## Shipping it

The trained models went into a **mobile app and a website**, both of which
speak the recognized word aloud. The app opens the camera, recognizes the
sign, and offers to pronounce it — the screenshots below are the real product.

<figure class="figure-strip">
  <img src="/images/signchatter/app-1.webp" alt="SignChatter app camera view recognizing a sign, with a button to pronounce the word" loading="lazy" decoding="async" />
  <img src="/images/signchatter/app-2.webp" alt="SignChatter app word grid showing recognized sign categories" loading="lazy" decoding="async" />
  <img src="/images/signchatter/app-3.webp" alt="SignChatter app camera view with speech output" loading="lazy" decoding="async" />
  <img src="/images/signchatter/app-4.webp" alt="SignChatter credits screen listing the team" loading="lazy" decoding="async" />
</figure>
<p class="figure-caption">The SignChatter Android app: camera recognition, the word grid, and speech output.</p>

One honest note: the hosted API is no longer live, but the APK and the demo
recordings remain, and the dataset continues to be used.

## Publication

The work was presented at the **International Conference on Computational
Intelligent Systems (ICCIS), Islamabad, December 2024**, and published as a
Springer chapter:

> Naeem, J., Asif, Z., Rahman, A. "Word-Level Pakistani Sign Language
> Recognition." *ICCIS 2024*, Islamabad, Pakistan.

The full process — dataset construction, cleaning, augmentation, keypoint
extraction, modeling, and deployment of the app and website — is documented
in my undergraduate thesis, available in the Bahria University repository.

## What I took from it

SignChatter is where I learned the full arc — data, modeling, deployment,
and writing — and that each stage constrains the others. A dataset built for
a paper is different from a dataset built for a product, and a model chosen
for accuracy is different from a model chosen for a phone.
