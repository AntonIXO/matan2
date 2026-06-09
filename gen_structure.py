#!/usr/bin/env python3
"""
Генерирует структуру Typst-конспекта из bilety-opr.csv.

Раскладывает теоремы и определения по 3 тематическим блокам (границы блоков —
пустые строки в CSV) и создаёт по файлу-главе на блок с помеченными заготовками.
Каждая заготовка имеет метку (<op-bN-XX> / <th-bN-XX>), чтобы потом билеты можно
было "переплетать" ссылками @метка.
"""

import csv
import re
from pathlib import Path

BLOCK_TITLES = [
    "Определённый интеграл, приложения, выпуклость, асимптотики",
    "Несобственные интегралы и числовые ряды",
    r"Дифференцирование в $RR^m$",
]


# Столбец "Определения" в CSV идёт на ~блок впереди столбца "Теоремы":
# определения по R^m лежат в строках блока 2, хотя относятся к блоку 3.
# Поэтому теоремы режем по пустым строкам (там разбивка корректна), а
# определения собираем в плоский список и режем по темам вручную.
DEF_SPLIT = [22, 32]  # блок1: defs[:22], блок2: defs[22:32], блок3: defs[32:]


def read_blocks(csv_path: Path):
    with csv_path.open(encoding="utf-8") as f:
        rows = list(csv.reader(f))
    rows = rows[2:]  # пропускаем ",  " и строку-заголовок столбцов

    th_blocks = [[]]
    defs_flat = []
    for r in rows:
        c0 = r[0].strip() if len(r) > 0 else ""
        c1 = r[1].strip() if len(r) > 1 else ""
        if not c0 and not c1:          # пустая строка — граница блока теорем
            th_blocks.append([])
            continue
        if c0:
            th_blocks[-1].append(c0)
        if c1:
            defs_flat.append(c1)
    th_blocks = [b for b in th_blocks if b]

    # режем определения по темам
    bounds = [0] + DEF_SPLIT + [len(defs_flat)]
    op_blocks = [defs_flat[bounds[i]:bounds[i + 1]] for i in range(len(bounds) - 1)]

    blocks = []
    for i in range(len(th_blocks)):
        op = op_blocks[i] if i < len(op_blocks) else []
        blocks.append({"th": th_blocks[i], "op": op})
    return blocks


_LX = {
    r"\int": "integral", r"\infty": "oo", r"\alpha": "alpha",
    r"\beta": "beta", r"\gamma": "gamma", r"\sin": "sin ",
    r"\cos": "cos ", r"\ln": "ln ", r"\,": " ",
}


def latex2typst(inner: str) -> str:
    # \frac{A}{B} -> (A)/(B)
    inner = re.sub(r"\\frac\{([^{}]*)\}\{([^{}]*)\}", r"(\1)/(\2)", inner)
    for k, v in _LX.items():
        inner = inner.replace(k, v)
    inner = re.sub(r"_\{([^{}]*)\}", r"_(\1)", inner)
    inner = re.sub(r"\^\{([^{}]*)\}", r"^(\1)", inner)
    inner = inner.replace("\\", "")
    inner = re.sub(r"\bd([xyz])\b", r"d \1", inner)  # dx -> d x (дифференциал)
    return re.sub(r"\s{2,}", " ", inner).strip()


def esc(s: str) -> str:
    # переводим LaTeX-вставки $...$ в синтаксис Typst-математики
    s = re.sub(r"\$(.+?)\$", lambda m: "$" + latex2typst(m.group(1)) + "$", s)
    # экранируем символы, особые для Typst-разметки
    return s.replace("#", r"\#").replace("@", r"\@")


def emit_chapter(idx: int, block: dict, title: str) -> str:
    bn = idx + 1
    L = ['#import "../lib.typ": *', "", f"= Блок {bn}. {title}", ""]

    L.append("== Определения и формулировки")
    L.append("")
    for j, name in enumerate(block["op"], 1):
        lbl = f"op-b{bn}-{j:02d}"
        L.append(f"=== {esc(name)} <{lbl}>")
        L.append("#opr[ #todo ]")
        L.append("")

    L.append("== Теоремы с доказательствами")
    L.append("")
    for j, name in enumerate(block["th"], 1):
        lbl = f"th-b{bn}-{j:02d}"
        L.append(f"=== {esc(name)} <{lbl}>")
        L.append("// #svyazi(<...>)   // переплетение: проставить связи")
        L.append("*Билет.* #todo")
        L.append("")
        L.append("*Доказательство.* #dok[ #todo ]")
        L.append("")
        L.append("*Суть.* #todo")
        L.append("")
    return "\n".join(L) + "\n"


def main():
    base = Path(__file__).parent
    blocks = read_blocks(base / "bilety-opr.csv")
    ch_dir = base / "chapters"
    ch_dir.mkdir(exist_ok=True)

    includes = []
    for i, block in enumerate(blocks):
        title = BLOCK_TITLES[i] if i < len(BLOCK_TITLES) else f"Блок {i + 1}"
        fname = f"{i + 1:02d}-block.typ"
        (ch_dir / fname).write_text(emit_chapter(i, block, title), encoding="utf-8")
        includes.append(f"chapters/{fname}")
        print(f"{fname}: {len(block['op'])} опр., {len(block['th'])} теорем")

    main_typ = ['#import "lib.typ": *', "", "#show: conf", ""]
    main_typ += [
        "#align(center)[",
        "  #text(20pt, weight: \"bold\")[Математический анализ]",
        "  #v(0.3em)",
        "  #text(13pt)[Конспект к экзамену · С2, 2026 · К. П. Кохась]",
        "]",
        "#v(1.5em)",
        "",
        "#outline(title: [Оглавление], indent: auto)",
        "#pagebreak()",
        "",
    ]
    main_typ += [f"#include \"{p}\"" for p in includes]
    (base / "main.typ").write_text("\n".join(main_typ) + "\n", encoding="utf-8")
    print("main.typ создан")


if __name__ == "__main__":
    main()
