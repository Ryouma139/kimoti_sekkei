---
title: "自動予約投稿機能の追加"
date: 2026-10-18
created: "2026-10-18T13:58:31+09:00"
minutes: 120
category: "TypeScript"
project: "2026-10-04_story-stock"
tags: ["TypeScript","React","API","CloudFlare","R2","D1","Cron"]
source: "https://sns-posting.tryoma0227.workers.dev/"
---

自動予約投稿をする際で使用する技術。
Cronースケジュールメソッド。
D1ー予定の時刻と紐づけた投稿内容を保存。重複しないようにするため。
R２－画像も予約投稿する際。URLのパスを一時的に保存する。
