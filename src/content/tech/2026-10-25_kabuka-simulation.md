---
type: project
title: "急騰記録株価シミュレーション"
date: 2026-10-25
created: "2026-10-25T17:57:35+09:00"
updated: 2026-10-25
summary: "１０％以上の急騰株のみを取り扱う株価シミュレーション"
icon: "KSL"
status: run
progress: 60
stack: ["Python","JavaScript","TypeScript","Wrangular","CloudFlare","Neon","PostgreSQL","API"]
repo: "https://github.com/Ryouma139/stock_simulation"
tags: ["設計","Python","TypeScript","CloudFlare","Neon","API","デプロイ"]
---

## 背景
株価の情報をバッチで取得しているため、いつか使用したいと考えていた。
特に１０％だけであるため。マイナーな企業をとりそろえている。

## 決定
NotionとPostgresqlの連携でデータを渡すことができると考えていたため、NeonのPostgresqlを使用。
Sqliteと相性も良いため。

## 理由
株価情報＊企業情報は密接にかかわっている。それにニュースや社会情勢の理解を深めるため
