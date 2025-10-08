# ts実行

```bash
node --import tsx --env-file .env --watch ./src/scripts/hello.ts
```

サイト名「音質当てクイズ」
ユーザーが好きな音楽ファイルをアップロードして、ffmpeg.wasmで音質を変換し、
見分けがつくかチャレンジするサイトを作りたい。
曲を選択して変換ボタンを押すとmp3 128 cbr、mp3 320cbr、アップロードした音声そのままを使う
ただしアップロードした曲にかかわらず変換は最大先頭2分まで アップロードした音声はそのまま使うがUI側で最大2分まで再生できないようにしておく（じゃないとわかってしまう

# UI

白背景 凝ったUIにしなくていい mantine、tabler/icons-react

フォーム
ffmpeg-coreを読み込むボタン
音声の選択
変換ボタン 中央寄せ青色

すると変換されて
[曲1を再生(▶)] ▼選択
[曲2を再生(▶)] ▼選択
[曲3を再生(▶)] ▼選択
と表示される 再生ボタンマークをクリックすると曲が再生される
マークはtabler/icons-react使って
▼選択はセレクトボックスでmp3 128K、mp3 320K,オリジナルから選ぶ

「解答チェック」 変換ボタンと同じ中央寄せ青色

おすと上のフォームに回答がフィードバックされる。

# ルール
- src/Componentにtsxをおく src/Home.tsxがTOPで
- src/Home_mihon.tsxにffmpeg動作するサンプルコードをおいた　参考にして

以下のURLを使うこと
https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js
https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm
マルチスレッドの対応はしない　つまりworkerは不要
