---
type: project
title: "SNS_Postingサイト"
date: 2026-10-04
created: "2026-10-04T16:07:13+09:00"
summary: "SNS用のアフィリエイト自動投稿システムと分析ボードのアプリサイト"
icon: "SNS"
status: run
progress: 50
stack: ["TypeScript","Python","外部API","テスター","React","CloudFlare","KV","Cron","自動化"]
repo: "https://github.com/Ryouma139/sns-posting"
tags: ["TypeScript","React","API","CloudFlare"]
---

## 背景
ASPの追加に伴う、SNS管理（Threads, Instagram, X等）プラットフォームと選択したアフィリページなどを一覧で管理したいと考えたため。
収益化をする上で、フォローよりも投稿数が大事だと学んだ。そこで自動化処理で一度に記事を投稿できるようにしたいと考えた。

## 決定
最近、Threadsが活発であると考えるため。
TheadsAPIが無料であるため、投稿する際に便利であると考えた。そのため、
XとThreadsを主に機能する。

## 理由
Xは若者が多く、簡単に収集することが可能である。分析などもできそう！
