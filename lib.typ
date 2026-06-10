// lib.typ — общие стили и компоненты конспекта по матанализу
// (билеты "переплетаются" друг с другом через метки <op-...>/<th-...> и ссылки @...)

// Обязательные билеты (выделены жирным/чёрным в оглавлении и заголовках;
// остальные приглушены до серого). Метки — из программы экзамена.
#let obyaz = (
  // Теоремы
  <th-b1-04>, <th-b1-06>, <th-b1-11>, <th-b1-16>, <th-b1-21>, <th-b1-25>,
  <th-b1-27>, <th-b1-28>, <th-b1-33>, <th-b1-35>, <th-b2-02>, <th-b2-04>,
  <th-b2-10>, <th-b2-11>, <th-b2-15>, <th-b3-04>, <th-b3-05>, <th-b3-07>,
  // Определения
  <op-b1-02>, <op-b1-04>, <op-b1-06>, <op-b1-07>, <op-b1-08>, <op-b1-09>,
  <op-b1-13>, <op-b2-01>, <op-b2-03>, <op-b2-04>, <op-b2-06>, <op-b3-03>,
  <op-b3-04>, <op-b3-07>, <op-b3-09>, <op-b3-10>, <op-b3-11>,
)

#let conf(doc) = {
  set page(numbering: "1", margin: 2.2cm)
  set text(lang: "ru", size: 11pt)
  set par(justify: true, leading: 0.72em, spacing: 0.95em)
  set heading(numbering: "1.1")
  show heading.where(level: 1): set text(size: 17pt)
  show heading.where(level: 2): set text(size: 13pt)
  // Билеты вне списка обязательных — приглушаем (заголовок).
  show heading.where(level: 3): it => {
    set text(fill: rgb("#8a8a8a"), weight: "regular") if not (it.has("label") and obyaz.contains(it.label))
    it
  }
  // То же — в оглавлении.
  show outline.entry.where(level: 3): it => {
    let e = it.element
    set text(fill: rgb("#8a8a8a"), weight: "regular") if not (e.has("label") and obyaz.contains(e.label))
    it
  }
  show link: set text(fill: rgb("#1a5fb4"))
  show ref: set text(fill: rgb("#1a5fb4"))
  set math.equation(numbering: none)
  doc
}

// Маркер незаполненного содержимого — видно, что осталось извлечь из лекций.
#let todo = text(fill: rgb("#b00020"), style: "italic", [⟨извлечь из лекции⟩])

// Связи билета с другими билетами/определениями.
// Принимает метки: #svyazi(<op-b1-01>, <th-b1-03>)
#let svyazi(..items) = {
  let xs = items.pos()
  if xs.len() == 0 { return }
  block(
    above: 0.4em, below: 0.6em,
    text(size: 9pt, fill: rgb("#555"),
      [→ опирается на: #xs.map(x => ref(x)).join(", ")]),
  )
}

// Определение / формулировка.
#let opr(body) = {
  block(
    width: 100%, inset: 10pt, radius: 4pt,
    fill: rgb("#f4f6fb"), stroke: 0.5pt + rgb("#cfd8ea"),
    body,
  )
  v(0.4em)
}

// Блок доказательства теоремы.
#let dok(body) = block(above: 0.4em, below: 0.7em, body)

// Краткое пояснение «суть» — только для сложных теорем.
#let sut(body) = block(
  width: 100%, inset: (left: 8pt, top: 4pt, bottom: 4pt),
  stroke: (left: 2pt + rgb("#e0a800")),
  text(size: 10pt, [*Суть.* #body]),
)

// Литературные вставки (вступление/послесловие) — вне оглавления, в рамке.
#let lit(title, subtitle: none, body) = block(
  width: 100%,
  inset: (x: 16pt, y: 14pt),
  radius: 5pt,
  stroke: 0.7pt + rgb("#c2cde4"),
  fill: rgb("#fafbfe"),
  breakable: true,
  {
    align(center, text(16pt, weight: "bold")[#title])
    if subtitle != none {
      v(0.25em)
      align(center, text(9.5pt, style: "italic", fill: rgb("#777"))[#subtitle])
    }
    v(0.4em)
    line(length: 100%, stroke: 0.4pt + rgb("#dbe2f0"))
    v(0.7em)
    set par(justify: true, leading: 0.8em, spacing: 1.15em, first-line-indent: 1.1em)
    set text(size: 11pt)
    body
  },
)

// Ссылка на интерактивный график Desmos (геометрический смысл билета).
#let viz(url) = text(size: 9pt, fill: rgb("#1a5fb4"))[#link(url)[(интерактив #sym.arrow.tr)]]

// Видео лекций Кохася (s2, 2026) — id ролика на YouTube по номеру лекции.
#let lekcii = (
  "1": "RtzxDfxjZQ0",  "2": "aVIBgTMZ2lc",  "3": "ZJ3KP1PXa_w",  "4": "L72_qjn39O0",
  "5": "Swh9VNrf5es",  "6": "jKsk4W1RnSU",  "7": "5GDXrx-KpzU",  "8": "EBY-pppAjm0",
  "9": "Sup6u05E5tc",  "10": "pBDNX3sXpQo", "11": "Fl7M4hWGM-Y", "12": "yTaLYp5oa70",
  "13": "ah79QBuUiNQ", "14": "jXkBkOOfQhs",
)

// "ЧЧ:ММ:СС" или "ММ:СС" → секунды (для параметра ?t= в ссылке YouTube).
#let _tc-sec(tc) = {
  let s = 0
  for p in tc.split(":") { s = s * 60 + int(p) }
  s
}

// Пометка: доказательство/факт восстановлены по лекции Кохася.
// #lek(1) — просто ссылка на лекцию; #lek(1, time: "12:57") — ссылка с таймкодом.
#let lek(n, time: none) = {
  let base = "https://www.youtube.com/watch?v=" + lekcii.at(str(n))
  let url = if time == none { base } else { base + "&t=" + str(_tc-sec(time)) + "s" }
  let label = if time == none { "Кохась. Лекция " + str(n) } else { "Кохась. Лекция " + str(n) + ", " + time }
  text(size: 9pt, fill: rgb("#777"), style: "italic")[#link(url)[(#label)]]
}

// Матшорткаты
#let dd = math.thin + math.upright($d$)  // дифференциал: integral f dd x → ∫ f dx (тонкий пробел + слитное dx)
#let limsup = math.limits(math.overline("lim"))
#let liminf = math.limits(math.underline("lim"))
#let eps = sym.epsilon.alt
