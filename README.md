# 星冊書架 Novel Shelf

Public static novel reading site. The private `novel-shelf-data` repository stores outlines, drafts, review notes, and publishing scripts; this public repository only contains reviewed chapters and the reader UI.

## Features

- Bookshelf overview
- Chapter table of contents
- Responsive reader layout
- Browser SpeechSynthesis text-to-speech controls
- GitHub Pages deployment workflow

## Data Contract

The site reads `data/manifest.json`. Chapter entries point to public JSON files with this shape:

```json
{
  "id": "chapter-001",
  "number": 1,
  "title": "章名",
  "wordCount": 5000,
  "updated": "2026-05-19",
  "content": ["段落一", "段落二"]
}
```
