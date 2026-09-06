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

// Обратные ссылки «← нужен для» — транспонированный граф зависимостей.
// Считается автоматически из зарегистрированных <dep-edge> (см. svyazi ниже);
// вызывается из show-правила заголовков. Показывает, в чьих доказательствах
// используется данный билет.
#let nuzhen-dlya(lbl) = context {
  let srcs = ()
  for e in query(<dep-edge>) {
    let v = e.value
    if v.src != none and v.dst.contains(lbl) and not srcs.contains(v.src) {
      srcs.push(v.src)
    }
  }
  if srcs.len() > 0 {
    block(
      above: 0.2em, below: 0.5em,
      text(size: 9pt, fill: rgb("#777"),
        [← нужен для: #srcs.map(s => ref(s)).join(", ")]),
    )
  }
}

// Теги методов/приёмов — горизонтальные связи (один и тот же инструмент в разных
// билетах), которых нет в вертикальной структуре лекций. Ключ — имя метки билета.
// Кластеры собраны вручную по содержанию доказательств.
#let _metody = (
  // двукратное интегрирование по частям / интегральное ядро
  "th-b1-09": ("по частям", "иерархия роста"),
  "th-b1-29": ("по частям",),
  "th-b1-30": ("по частям",),
  // иерархия роста  ln x ≪ xᵃ ≪ qˣ ≪ n!
  "th-b1-13": ("иерархия роста", "Лагранж"),
  "th-b2-03": ("иерархия роста",),
  "th-b2-04": ("иерархия роста", "зажим"),
  // оценка зажимом (sandwich)
  "th-b1-16": ("зажим",),
  "th-b1-18": ("зажим",),
  "th-b1-32": ("зажим",),
  "th-b1-39": ("зажим",),
  // телескопическая сумма (адд. и мульт.)
  "th-b1-14": ("телескоп",),
  "th-b2-12": ("телескоп",),
  "th-b2-13": ("телескоп",),
  "th-b2-16": ("телескоп",),
  // монотонность + ограниченность ⇒ предел
  "op-b1-20": ("монотонность+огранич.⇒предел",),
  "th-b1-22": ("монотонность+огранич.⇒предел",),
  "th-b2-02": ("монотонность+огранич.⇒предел",),
  "th-b2-10": ("монотонность+огранич.⇒предел",),
  "th-b2-15": ("монотонность+огранич.⇒предел",),
  // опорная прямая
  "th-b1-24": ("опорная прямая",),
  "th-b1-26": ("опорная прямая",),
  "th-b1-27": ("опорная прямая",),
  "th-b1-34": ("опорная прямая",),
  "th-b1-36": ("опорная прямая",),
  // теорема Лагранжа о среднем (в т.ч. покоординатно / лесенкой)
  "op-b1-02": ("Лагранж",),
  "th-b1-10": ("Лагранж",),
  "th-b1-20": ("Лагранж",),
  "th-b3-04": ("Лагранж",),
  "th-b3-07": ("Лагранж",),
)

#let metod-for(lbl) = {
  let key = str(lbl)
  if key in _metody {
    block(
      above: 0.1em, below: 0.5em,
      text(size: 9pt, fill: rgb("#7a4fb0"), style: "italic",
        [⟂ метод: #_metody.at(key).join(" · ")]),
    )
  }
}

// Бейдж необязательного билета — чтобы такие билеты не пролистывались мимо
// (раньше они просто глушились в серый и терялись при повторении).
#let _opt-badge = box(
  baseline: 0.15em, inset: (x: 5pt, y: 1.5pt), radius: 3pt,
  fill: rgb("#fff1d0"), stroke: 0.6pt + rgb("#e0a800"),
  text(size: 8pt, fill: rgb("#9a6500"), weight: "medium", [★ необязательный]),
)

// Ссылки на веб-сцены: карта обновляется командой `bun run sync` в web/.
// JSON входит в исходники, поэтому обычной сборке Typst не нужен Bun.
#let _web-scenes = json("web-scenes.json").tickets
#let scene-links(lbl) = {
  let key = str(lbl)
  if key in _web-scenes {
    block(
      above: 0.2em, below: 0.5em,
      text(size: 9pt)[
        Сцены: #_web-scenes.at(key).map(scene => link(scene.url, scene.title)).join(" · ")
      ],
    )
  }
}

#let conf(doc) = {
  set page(numbering: "1", margin: 2.4cm)
  set text(lang: "ru", size: 11pt)
  // leading чуть просторнее дефолта — строки перегружены формулами и кванторами,
  // им нужен воздух между базовыми линиями; margin 2.4cm подтягивает длину строки
  // к читаемому диапазону (~80 знаков вместо ~90).
  set par(justify: true, leading: 0.78em, spacing: 0.95em)
  set heading(numbering: "1.1")
  show heading.where(level: 1): set text(size: 17pt)
  show heading.where(level: 2): set text(size: 13pt)
  // Билеты вне списка обязательных — НЕ приглушаем, а наоборот помечаем:
  // амбровая линейка слева + тёплый цвет + бейдж «★ необязательный», чтобы их
  // не пролистывали мимо. Обязательные остаются чёрными (основной массив).
  // Под заголовком — авто-обратные ссылки «← нужен для».
  show heading.where(level: 3): it => {
    if not (it.has("label") and obyaz.contains(it.label)) {
      block(
        width: 100%, inset: (left: 9pt, top: 1pt, bottom: 1pt),
        stroke: (left: 3pt + rgb("#e0a800")),
        {
          set text(fill: rgb("#8a5a00"))
          grid(
            columns: (1fr, auto), align: (left, left + top), column-gutter: 8pt,
            it, box(inset: (top: 3pt), _opt-badge),
          )
        },
      )
    } else {
      it
    }
    if it.has("label") {
      scene-links(it.label)
      nuzhen-dlya(it.label)
      metod-for(it.label)
    }
  }
  // В оглавлении — тёплый амбровый цвет вместо приглушённого серого:
  // необязательные билеты видны, а не теряются.
  show outline.entry.where(level: 3): it => {
    let e = it.element
    set text(fill: rgb("#a36b00")) if not (e.has("label") and obyaz.contains(e.label))
    it
  }
  show link: set text(fill: rgb("#1a5fb4"))
  // Ссылки на билеты — ТОЛЬКО по названию: ссылка на заголовок рендерится как его
  // название-ссылка (без «Раздел» и без номера), а не голое «Раздел N». Это же
  // правило переводит авто-строки «→ опирается на» / «← нужен для» на названия теорем.
  show ref: it => {
    let el = it.element
    if el != none and el.func() == heading {
      link(el.location(), text(fill: rgb("#1a5fb4"), el.body))
    } else {
      text(fill: rgb("#1a5fb4"), it)
    }
  }
  set math.equation(numbering: none)
  // Выносные формулы дышат чуть свободнее основного текста — чтобы плотные
  // страницы с цепочками равенств не слипались в сплошную массу.
  show math.equation.where(block: true): set block(spacing: 1.05em)
  doc
}

// Маркер незаполненного содержимого — видно, что осталось извлечь из лекций.
#let todo = text(fill: rgb("#b00020"), style: "italic", [⟨извлечь из лекции⟩])

// Связи билета с другими билетами/определениями (прямое ребро графа «опирается на»).
// Принимает метки: #svyazi(<op-b1-01>, <th-b1-03>)
// Побочно регистрирует ребро <dep-edge> для авто-генерации обратных ссылок
// (источник = ближайший заголовок-билет перед вызовом).
#let svyazi(..items) = {
  let xs = items.pos()
  if xs.len() == 0 { return }
  context {
    let hs = query(heading.where(level: 3).before(here()))
    let src = if hs.len() > 0 and hs.last().has("label") { hs.last().label } else { none }
    [#metadata((src: src, dst: xs)) <dep-edge>]
  }
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

// Блок доказательства теоремы — отдельный визуальный слой: тонкая левая линейка
// и втяжка отделяют «рассуждение» от боксов-определений и жирных формулировок,
// в конце — ∎ как сигнал завершения (быстро сканируется глазом при повторении).
#let dok(body) = block(
  width: 100%,
  above: 0.5em, below: 0.7em,
  inset: (left: 10pt, top: 1pt, bottom: 1pt),
  stroke: (left: 1.5pt + rgb("#c4ccd8")),
  {
    body
    v(-0.15em)
    align(right, text(size: 9pt, fill: rgb("#9aa3b2"), $square$))
  },
)

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

// Компактная ссылка на билет: только номер (1.2.14) гиперссылкой, без слова «Раздел».
// Удобно в приложениях-таблицах. Принимает метку: #bil(<th-b1-14>).
#let bil(lbl) = context {
  let els = query(lbl)
  if els.len() == 0 { return text(fill: red)[?] }
  let loc = els.first().location()
  text(fill: rgb("#1a5fb4"), link(loc)[#numbering("1.1", ..counter(heading).at(loc))])
}

// Свод методов: инвертирует таблицу тегов _metody (метод → список билетов).
// Авто-генерируется, поэтому всегда синхронен с тегами под заголовками.
#let metody-svodka() = {
  let inv = (:)
  for (lbl, ms) in _metody.pairs() {
    for m in ms { inv.insert(m, inv.at(m, default: ()) + (lbl,)) }
  }
  for (m, lbls) in inv.pairs() {
    block(below: 0.5em, [*#m* — #lbls.map(l => ref(label(l))).join(", ")])
  }
}

// Матшорткаты
#let dd = math.thin + math.upright($d$)  // дифференциал: integral f dd x → ∫ f dx (тонкий пробел + слитное dx)
#let limsup = math.limits(math.overline("lim"))
#let liminf = math.limits(math.underline("lim"))
#let eps = sym.epsilon.alt
