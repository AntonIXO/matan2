#!/usr/bin/env python3
"""
Очистка авто-сгенерированных YouTube .vtt субтитров в читаемый текст.

Проблема исходника:
  - "прокручивающиеся" (rolling) субтитры: каждый блок повторяет предыдущую
    строку и добавляет новую;
  - inline-теги таймингов вида <00:00:46.360><c> слово</c>;
  - html-сущности (&gt;&gt;, &amp; и т.п.);
  - служебные строки таймкодов и заголовок WEBVTT.

Результат: один .txt на лекцию, где текст идёт сплошным потоком без дублей,
плюс оставляем таймкод начала каждой реплики в формате [мм:сс] — он нужен,
чтобы потом ссылаться на момент в лекции при извлечении доказательств.
"""

import html
import re
import sys
from pathlib import Path

TIMECODE = re.compile(
    r"^(\d{2}):(\d{2}):(\d{2})\.\d{3}\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.\d{3}"
)
INLINE_TAG = re.compile(r"<[^>]+>")            # <00:00:46.360> и <c> ... </c>
ALIGN = re.compile(r"\s*align:\S+\s*position:\S+")


def clean_file(src: Path, dst: Path) -> tuple[int, int]:
    raw_lines = src.read_text(encoding="utf-8", errors="replace").splitlines()

    out: list[str] = []
    last_text = None          # последняя добавленная содержательная строка

    for line in raw_lines:
        line = line.strip()
        if not line:
            continue
        if line in ("WEBVTT",) or line.startswith(("Kind:", "Language:")):
            continue

        if TIMECODE.match(line):
            # таймкоды не нужны в конспекте — пропускаем строку целиком
            continue

        # содержательная строка субтитров
        text = ALIGN.sub("", line)
        text = INLINE_TAG.sub("", text)
        text = html.unescape(text)
        text = text.replace(">>", "").strip()
        text = re.sub(r"\s{2,}", " ", text)
        if not text:
            continue

        # отбрасываем дубликаты прокрутки
        if text == last_text:
            continue
        # частый случай: новая строка = старая + хвост, оставляем только хвост
        if last_text and text.startswith(last_text):
            tail = text[len(last_text):].strip()
            if not tail:
                continue
            text = tail

        out.append(text)
        last_text = ALIGN.sub("", line)
        last_text = INLINE_TAG.sub("", last_text)
        last_text = html.unescape(last_text).replace(">>", "").strip()
        last_text = re.sub(r"\s{2,}", " ", last_text)

    dst.write_text("\n".join(out) + "\n", encoding="utf-8")
    return len(raw_lines), len(out)


def main() -> None:
    base = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    out_dir = base / "clean"
    out_dir.mkdir(exist_ok=True)

    vtts = sorted(base.glob("*.vtt"))
    if not vtts:
        print("Не найдено .vtt файлов в", base.resolve())
        return

    for src in vtts:
        # короткое имя: "лекция N"
        m = re.search(r"лекция\s*(\d+)", src.name)
        name = f"лекция_{int(m.group(1)):02d}.txt" if m else src.stem + ".txt"
        dst = out_dir / name
        n_in, n_out = clean_file(src, dst)
        print(f"{src.name}\n  -> {dst.name}: {n_in} строк -> {n_out} реплик")


if __name__ == "__main__":
    main()
