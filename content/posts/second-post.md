---
title: "Building a Small Static Blog"
date: 2026-01-10
tags: [web, development]
summary: "The design principles behind a browser-rendered Markdown blog with a tiny deployment surface."
draft: false
lang: en
---

# Building a Small Static Blog

A personal site does not need a large application stack. A handful of HTML pages, one stylesheet, a few browser scripts, and Markdown content can be enough.

## The basic flow

1. Write an article in `content/posts/`.
2. Push it to GitHub.
3. GitHub Actions updates the index and feeds.
4. Cloudflare Pages serves the repository as static files.
5. `post.html?slug=...` fetches the Markdown article and renders it in the browser.

The result is a deliberately small system with a clear separation between content, metadata, and presentation.
