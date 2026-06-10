// lib.typ — общие стили и компоненты конспекта по матанализу
// (билеты "переплетаются" друг с другом через метки <op-...>/<th-...> и ссылки @...)

#let conf(doc) = {
  set page(numbering: "1", margin: 2.2cm)
  set text(lang: "ru", size: 11pt)
  set par(justify: true, leading: 0.72em, spacing: 0.95em)
  set heading(numbering: "1.1")
  show heading.where(level: 1): set text(size: 17pt)
  show heading.where(level: 2): set text(size: 13pt)
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

// Литературные вставки (вступление/послесловие) — вне оглавления, отдельный стиль.
#let lit(title, subtitle: none, body) = {
  v(0.4em)
  line(length: 100%, stroke: 0.5pt + rgb("#cfd8ea"))
  v(0.7em)
  align(center, text(16pt, weight: "bold")[#title])
  if subtitle != none {
    v(0.2em)
    align(center, text(9.5pt, style: "italic", fill: rgb("#777"))[#subtitle])
  }
  v(1em)
  block(width: 100%, {
    set par(justify: true, leading: 0.85em, spacing: 1.05em, first-line-indent: 1.1em)
    set text(size: 11pt)
    body
  })
  v(0.6em)
  line(length: 100%, stroke: 0.5pt + rgb("#cfd8ea"))
}

// Матшорткаты
#let dd = math.upright("d")        // дифференциал: integral f dd x
#let limsup = math.limits(math.overline("lim"))
#let liminf = math.limits(math.underline("lim"))
#let eps = sym.epsilon.alt
