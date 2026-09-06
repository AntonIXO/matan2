import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { lessons } from './lessons';
import Formula from './Formula';
import type { Params, Lesson } from './types';
import notes from './generated/notes.json';
import { clamp, fmt } from './math';
import { registerSceneTools } from './webmcp';
import { HighlightContext, marks } from './Highlight';
const Space = lazy(() => import('./scenes/Space'));
const Plane = lazy(() => import('./scenes/Plane'));
import {
  atStep,
  defaults,
  decodeState,
  encodeState,
  seekState,
  changeParam,
  parameterValue,
  effectiveParameter,
  interpolate,
} from './state';
const readState = () => decodeState(location.hash, lessons);
export default function App() {
  const [highlight, setHighlight] = useState('');
  const [state, setState] = useState(readState),
    [playing, setPlaying] = useState(false),
    [all, setAll] = useState(false),
    [speed, setSpeed] = useState(1),
    [query, setQuery] = useState(''),
    [menu, setMenu] = useState(false),
    [camera, setCamera] = useState(0),
    [copied, setCopied] = useState(false);
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const lesson = lessons.find((l) => l.id === state.id)!,
    step = lesson.steps[state.step];
  const stateRef = useRef(state);
  stateRef.current = state;
  const ticketMap = notes.tickets as Record<
    string,
    { id: string; number: string; page: number; title: string; mandatory: boolean }
  >;
  const mainTicket = ticketMap[lesson.tickets[0]];
  const Scene = lesson.dimension === '3D' ? Space : Plane;
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(media.matches);
    media.addEventListener('change', on);
    return () => media.removeEventListener('change', on);
  }, []);
  useEffect(() => {
    const fn = () => {
      setPlaying(false);
      setState(readState());
    };
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);

  useEffect(() => {
    history.replaceState(null, '', encodeState(state));
    document.title = lesson.title + ' · Матан';
  }, [state, lesson.title]);
  function update(next: typeof state) {
    stateRef.current = next;
    setState(next);
  }
  function navigate(l: Lesson) {
    setHighlight('');
    setPlaying(false);
    update(atStep(l));
    setCamera((c) => c + 1);
    setMenu(false);
  }
  function chooseStep(index: number) {
    setHighlight('');
    setPlaying(false);
    update(atStep(lesson, index, stateRef.current.params));
  }
  function param(key: string, value: number) {
    setPlaying(false);
    setState((s) => changeParam(s, lesson, key, value));
  }
  function seek(progress: number) {
    setPlaying(false);
    update(seekState(stateRef.current, lesson, progress));
  }
  function toggle() {
    if (reduced) {
      seek(1);
      return;
    }
    if (playing) {
      setPlaying(false);
      return;
    }
    if (stateRef.current.progress >= 1) {
      const m = step.motion;
      if (!m || Math.abs(stateRef.current.params[m.key] - m.to) < 1e-7) seek(0);
      else update({ ...stateRef.current, progress: 0 });
    }
    setPlaying(true);
  }
  useEffect(() => {
    if (!playing) return;
    let raf = 0,
      previous = 0,
      anchor = stateRef.current;
    const tick = (time: number) => {
      if (!previous) previous = time;
      const dt = Math.min((time - previous) / 1000, 0.1) * speed;
      previous = time;
      const s = stateRef.current,
        l = lessons.find((l) => l.id === s.id)!,
        st = l.steps[s.step],
        progress = Math.min(1, s.progress + dt / (st.duration || 6));
      let params = s.params;
      if (st.motion) {
        const m = st.motion,
          t = clamp((progress - anchor.progress) / Math.max(1e-9, 1 - anchor.progress), 0, 1);
        params = {
          ...params,
          [m.key]: parameterValue(
            l,
            m.key,
            interpolate(anchor.params[m.key], m.to, t, m.log),
            s.step,
          ),
        };
      }
      let next = { ...s, progress, params };
      if (progress >= 1) {
        if (all && s.step < l.steps.length - 1) {
          next = atStep(l, s.step + 1, params, 0);
          anchor = next;
        } else setPlaying(false);
      }
      update(next);
      if (progress < 1 || (all && next.step !== s.step)) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, all]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false);
        return;
      }
      const target = e.target as HTMLElement;
      if (
        target.closest('input,select,textarea,button,a,[contenteditable],[role="slider"],.MafsView')
      )
        return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        chooseStep(state.step + 1);
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        chooseStep(state.step - 1);
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });
  useEffect(() => {
    if (reduced && playing) seek(1);
  }, [reduced]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  useEffect(
    () =>
      registerSceneTools({
        read: () => stateRef.current,
        write: (next, resetCamera) => {
          setPlaying(false);
          setHighlight('');
          update(next);
          if (resetCamera) setCamera((c) => c + 1);
          setMenu(false);
        },
      }),
    [],
  );
  const filtered = lessons.filter((l) =>
    `${l.title} ${l.subtitle} ${l.tickets.map((t) => ticketMap[t]?.number).join(' ')}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const catalogSection = (l: Lesson) => {
    const [block, section] = ticketMap[l.tickets[0]].number.split('.');
    return `${block}.${section} · ${section === '1' ? 'Определения' : 'Теоремы'}`;
  };
  return (
    <HighlightContext.Provider value={{ active: highlight, set: setHighlight }}>
      <div className="app">
        <a
          href="#lesson-content"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('lesson-content')?.focus();
            document.getElementById('lesson-content')?.scrollIntoView({ block: 'start' });
          }}
          className="skip-link"
        >
          К сцене
        </a>
        <header className="topbar">
          <a
            href="#"
            className="brand"
            onClick={(e) => {
              e.preventDefault();
              navigate(lessons[0]);
            }}
          >
            <span className="brand-mark">∂</span> матан <span className="brand-divider">/</span>{' '}
            <span className="brand-section">геометрия</span>
          </a>
          <div className="top-actions">
            <span className="course-label">К. П. Кохась · дополнение к конспекту</span>
            <a
              className="quiet-button"
              href={`${import.meta.env.BASE_URL}notes.pdf`}
              target="_blank"
              rel="noreferrer"
            >
              Конспект ↗
            </a>
            <button className="menu-button" onClick={() => setMenu(!menu)} aria-expanded={menu}>
              Билеты ☰
            </button>
          </div>
        </header>
        <div className="workspace">
          <aside className={`sidebar ${menu ? 'open' : ''}`}>
            <div className="sidebar-heading">
              СЦЕНЫ <span>{lessons.length}</span>
            </div>
            <label className="search">
              <span>⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Тема или номер билета"
                aria-label="Поиск билета"
              />
            </label>
            <nav aria-label="Каталог сцен">
              {Array.from(new Set(filtered.map(catalogSection))).map((group) => (
                <section className="nav-group" key={group}>
                  <h2>{group}</h2>
                  {filtered
                    .filter((l) => catalogSection(l) === group)
                    .map((l) => (
                      <button
                        key={l.id}
                        className={`lesson-link ${l.id === lesson.id ? 'active' : ''}`}
                        aria-current={l.id === lesson.id ? 'page' : undefined}
                        onClick={() => navigate(l)}
                      >
                        <span className="lesson-index">
                          {ticketMap[l.tickets[0]]?.number || '—'}
                          {ticketMap[l.tickets[0]]?.mandatory ? ' · обязательный' : ''}
                        </span>
                        <span>{l.title}</span>
                        <span className="dimension">{l.dimension}</span>
                      </button>
                    ))}
                </section>
              ))}
              {!filtered.length && <p className="empty">Билетов по этому запросу нет.</p>}
            </nav>
            <div className="sidebar-footer">
              Геометрический пример помогает
              <br />
              восстановить общий аргумент.
            </div>
          </aside>
          <main id="lesson-content" tabIndex={-1}>
            <div className="lesson-heading">
              <div>
                <div className="eyebrow">
                  {lesson.group} <span>/</span> {mainTicket?.number}
                </div>
                <h1>{lesson.title}</h1>
                <p>{lesson.subtitle}</p>
              </div>
              <button
                className="quiet-button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? 'Скопировано ✓' : 'Ссылка ↗'}
              </button>
            </div>
            <div className="lesson-surface">
              <div className="visual-panel">
                <div className="visual-bar">
                  <span>
                    <i />
                    {lesson.dimension === '3D' ? 'Пространственная сцена' : 'Плоское построение'}
                  </span>
                  <button onClick={() => setCamera((c) => c + 1)} aria-label="Восстановить вид">
                    ↺ Вид
                  </button>
                </div>
                <div className={`canvas-area scene-${lesson.scene}`} data-testid="scene">
                  <Suspense fallback={<div className="loading">Открываем сцену…</div>}>
                    <Scene
                      lesson={lesson}
                      params={state.params}
                      step={state.step}
                      focus={step.focus || ''}
                      onParam={param}
                      cameraKey={camera}
                    />
                  </Suspense>
                </div>
                <div className="transport">
                  <button
                    className="play"
                    onClick={toggle}
                    aria-label={playing ? 'Пауза' : 'Воспроизвести шаг'}
                  >
                    {playing ? 'Ⅱ' : '▶'}
                  </button>
                  <button
                    onClick={() => chooseStep(state.step - 1)}
                    disabled={state.step === 0}
                    aria-label="Предыдущий шаг"
                  >
                    ‹
                  </button>
                  <span className="step-count">
                    {state.step + 1} <span>/ {lesson.steps.length}</span>
                  </span>
                  <button
                    onClick={() => chooseStep(state.step + 1)}
                    disabled={state.step === lesson.steps.length - 1}
                    aria-label="Следующий шаг"
                  >
                    ›
                  </button>
                  <input
                    className="timeline"
                    type="range"
                    min="0"
                    max="1"
                    step="0.001"
                    value={state.progress}
                    onChange={(e) => seek(+e.target.value)}
                    aria-label="Ход текущего шага"
                  />
                  <select
                    value={speed}
                    onChange={(e) => setSpeed(+e.target.value)}
                    aria-label="Скорость воспроизведения"
                  >
                    <option value=".5">½×</option>
                    <option value="1">1×</option>
                    <option value="2">2×</option>
                  </select>
                  <label className="all-steps">
                    <input
                      type="checkbox"
                      checked={all}
                      onChange={(e) => setAll(e.target.checked)}
                    />
                    Все шаги
                  </label>
                </div>
              </div>
              <aside className="explanation">
                <div className="section-label">
                  МЕХАНИЗМ <span>{String(state.step + 1).padStart(2, '0')}</span>
                </div>
                <h2>{step.title}</h2>
                <p className="step-text">{step.text}</p>
                <div className="formula-card" tabIndex={0}>
                  <Formula tex={step.formula} />
                </div>
                {marks[lesson.scene] && (
                  <div className="formula-marks" aria-label="Связь формулы с рисунком">
                    {marks[lesson.scene].map(([id, label]) => (
                      <button
                        key={id}
                        className={highlight === id ? 'selected' : ''}
                        aria-pressed={highlight === id}
                        onPointerEnter={() => setHighlight(id)}
                        onPointerLeave={() => setHighlight('')}
                        onFocus={() => setHighlight(id)}
                        onBlur={() => setHighlight('')}
                        onClick={() => setHighlight(highlight === id ? '' : id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="parameters">
                  <div className="section-label">
                    ИССЛЕДУЙ{' '}
                    <button
                      onClick={() => {
                        setPlaying(false);
                        update(atStep(lesson, state.step));
                      }}
                    >
                      Сбросить
                    </button>
                  </div>
                  {lesson.presets && (
                    <div className="presets">
                      {lesson.presets.map((pr) => (
                        <button
                          key={pr.name}
                          onClick={() => {
                            setPlaying(false);
                            setState((s) =>
                              Object.entries(pr.values).reduce(
                                (s, [k, v]) => changeParam(s, lesson, k, v),
                                s,
                              ),
                            );
                          }}
                        >
                          {pr.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {lesson.parameters
                    .map((base) => effectiveParameter(lesson, base.key, state.step)!)
                    .map((p) => (
                      <label className="parameter" key={p.key}>
                        <span>
                          {p.label}
                          <output>
                            {fmt(state.params[p.key])}
                            {p.unit}
                          </output>
                        </span>
                        <input
                          type="range"
                          disabled={step.locked?.includes(p.key)}
                          min={p.min}
                          max={p.max}
                          step={p.step && p.step >= 1 ? p.step : 'any'}
                          value={state.params[p.key]}
                          onChange={(e) => param(p.key, +e.target.value)}
                          aria-label={p.label}
                        />
                      </label>
                    ))}
                </div>
                <div className="insight">
                  <span>∴</span>
                  <p>{lesson.insight}</p>
                </div>
              </aside>
            </div>
            <div className="steps" aria-label="Шаги объяснения">
              {lesson.steps.map((s, i) => (
                <button
                  className={i === state.step ? 'current' : ''}
                  key={i}
                  onClick={() => chooseStep(i)}
                  aria-current={i === state.step ? 'step' : undefined}
                >
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </button>
              ))}
            </div>
            <footer className="lesson-footer">
              <div>
                <h3>Условия и источник</h3>
                <p>{lesson.conditions}</p>
                {lesson.note && <p className="source-note">{lesson.note}</p>}
                <div className="ticket-links">
                  {lesson.tickets.map((id) => {
                    const t = ticketMap[id];
                    return (
                      t && (
                        <a
                          key={id}
                          href={`${import.meta.env.BASE_URL}notes.pdf#page=${t.page}`}
                          target="_blank"
                          rel="noreferrer"
                          title={t.title}
                        >
                          {t.number}
                          {t.mandatory ? ' · обязательный' : ''} ↗
                        </a>
                      )
                    );
                  })}
                </div>
                {lesson.sources?.map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                    {source.label} ↗
                  </a>
                ))}
              </div>
              {lesson.blender && (
                <a
                  className="download-source"
                  href={`${import.meta.env.BASE_URL}blender/differentiation_live.blend`}
                  download
                >
                  Исходные сцены Blender ↓
                </a>
              )}
            </footer>
          </main>
        </div>
      </div>
    </HighlightContext.Provider>
  );
}
