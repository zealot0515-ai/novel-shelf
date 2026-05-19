const state = { manifest: null, book: null, chapter: null, utterance: null };
const $ = (id) => document.getElementById(id);

async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('novel-theme', theme);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderShelf() {
  const shelf = $('bookShelf');
  shelf.innerHTML = '';
  for (const book of state.manifest.books) {
    const done = book.publishedChapters || 0;
    const total = book.plannedChapters || done || 1;
    const card = document.createElement('article');
    card.className = 'book-card';
    card.innerHTML = `
      <p class="eyebrow">${escapeHtml(book.status || 'serial')}</p>
      <h3>${escapeHtml(book.title)}</h3>
      <p>${escapeHtml(book.description)}</p>
      <div class="book-meta">
        <span class="pill">${done}/${total} 章</span>
        <span class="pill">${escapeHtml(book.genre || '小說')}</span>
        <span class="pill">${escapeHtml(book.updated || '未更新')}</span>
      </div>
      <button class="button primary" type="button" data-book="${escapeHtml(book.id)}">開始閱讀</button>
    `;
    card.querySelector('button').addEventListener('click', () => selectBook(book.id));
    shelf.appendChild(card);
  }
  const first = state.manifest.books[0];
  if (first) $('featuredProgress').style.width = `${Math.round((first.publishedChapters || 0) / (first.plannedChapters || 1) * 100)}%`;
}

async function selectBook(bookId) {
  state.book = state.manifest.books.find((b) => b.id === bookId);
  if (!state.book) return;
  $('tocTitle').textContent = state.book.title;
  const bookSelect = $('bookSelect');
  bookSelect.value = bookId;
  await renderChapters();
  const first = state.book.chapters?.[0];
  if (first) await selectChapter(first.id);
}

async function renderChapters() {
  const list = $('chapterList');
  const chapterSelect = $('chapterSelect');
  list.innerHTML = '';
  chapterSelect.innerHTML = '';
  for (const ch of state.book.chapters || []) {
    const btn = document.createElement('button');
    btn.className = 'chapter-link';
    btn.type = 'button';
    btn.textContent = `${String(ch.number).padStart(2, '0')} · ${ch.title}`;
    btn.addEventListener('click', () => selectChapter(ch.id));
    list.appendChild(btn);

    const opt = document.createElement('option');
    opt.value = ch.id;
    opt.textContent = `${ch.number}. ${ch.title}`;
    chapterSelect.appendChild(opt);
  }
}

async function selectChapter(chapterId) {
  stopSpeaking();
  const ch = state.book.chapters.find((c) => c.id === chapterId);
  if (!ch) return;
  state.chapter = await loadJson(ch.file);
  $('chapterSelect').value = chapterId;
  $('readerStatus').textContent = state.book.title;
  $('chapterTitle').textContent = state.chapter.title;
  $('chapterMeta').textContent = `第 ${state.chapter.number} 章 · ${state.chapter.wordCount || 0} 字 · ${state.chapter.updated || ''}`;
  const paragraphs = state.chapter.content || [];
  $('chapterContent').innerHTML = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  [...document.querySelectorAll('.chapter-link')].forEach((btn, idx) => {
    btn.classList.toggle('active', state.book.chapters[idx]?.id === chapterId);
  });
  location.hash = `reader-${state.book.id}-${chapterId}`;
}

function speakChapter() {
  if (!('speechSynthesis' in window)) {
    alert('這個瀏覽器不支援 SpeechSynthesis 朗讀。');
    return;
  }
  if (!state.chapter) return;
  stopSpeaking();
  const text = `${state.chapter.title}。\n` + (state.chapter.content || []).join('\n');
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-TW';
  utterance.rate = 0.92;
  utterance.pitch = 0.95;
  state.utterance = utterance;
  speechSynthesis.speak(utterance);
}

function pauseSpeaking() {
  if (!('speechSynthesis' in window)) return;
  if (speechSynthesis.paused) speechSynthesis.resume();
  else speechSynthesis.pause();
}

function stopSpeaking() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  state.utterance = null;
}

async function init() {
  setTheme(localStorage.getItem('novel-theme') || '');
  state.manifest = await loadJson('data/manifest.json');
  const bookSelect = $('bookSelect');
  for (const book of state.manifest.books) {
    const opt = document.createElement('option');
    opt.value = book.id;
    opt.textContent = book.title;
    bookSelect.appendChild(opt);
  }
  bookSelect.addEventListener('change', (e) => selectBook(e.target.value));
  $('chapterSelect').addEventListener('change', (e) => selectChapter(e.target.value));
  $('speakBtn').addEventListener('click', speakChapter);
  $('pauseBtn').addEventListener('click', pauseSpeaking);
  $('stopBtn').addEventListener('click', stopSpeaking);
  $('themeToggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'night' ? '' : 'night'));
  renderShelf();
  if (state.manifest.books[0]) await selectBook(state.manifest.books[0].id);
}

init().catch((err) => {
  $('readerStatus').textContent = err.message;
});
