import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { lessons } from './lessons';
import Formula from './Formula';
import type { Params, Lesson } from './types';
import notes from './generated/notes.json';
import { fmt } from './math';
import { advanceTrack, createTrack, parameterMotion, type PlaybackTrack } from './playback';
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
  stepMotions,
} from './state';
const readState = () => decodeState(location.hash, lessons);
const normalize = (value: string) => value.toLowerCase().replaceAll('ё', 'е').trim();
export default function App() {
  const [highlight, setHighlight] = useState('');
  const [pinnedHighlight, setPinnedHighlight] = useState('');
  const [state, setState] = useState(readState),
    [playing, setPlaying] = useState(false),
    [all, setAll] = useState(false),
    [speed, setSpeed] = useState(1),
    [query, setQuery] = useState(''),
    [menu, setMenu] = useState(false),
    [camera, setCamera] = useState(0),
    [copied, setCopied] = useState(false);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const tracksRef = useRef<PlaybackTrack[]>([]);
  const pausedTracksRef = useRef(new Map<string, PlaybackTrack>());
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const lesson = lessons.find((l) => l.id === state.id)!,
    step = lesson.steps[state.step];
  const hasMotion = stepMotions(step).some((m) => !!parameterMotion(lesson, state.step, m.key));
  const canPlay = hasMotion || all || activeKeys.length > 0 || pausedTracksRef.current.size > 0;
  const activeHighlight = highlight || pinnedHighlight;
  const stateRef = useRef(state);
  stateRef.current = state;
  const ticketMap = notes.tickets as Record<
    string,
    { id: string; number: string; page: number; title: string; mandatory: boolean }
  >;
  const mainTicket = ticketMap[lesson.tickets[0]];
  const Scene = lesson.dimension === '3D' ? Space : Plane;
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [lesson.id]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(media.matches);
    media.addEventListener('change', on);
    return () => media.removeEventListener('change', on);
  }, []);
  useEffect(() => {
    const fn = (event: HashChangeEvent) => {
      pause(true);
      setHighlight('');
      setPinnedHighlight('');
      // A playback frame may replace location.hash before this event is delivered.
      update(decodeState(new URL(event.newURL).hash, lessons));
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
  function setTracks(tracks: PlaybackTrack[]) {
    tracksRef.current = tracks;
    setActiveKeys(tracks.map((track) => track.motion.key));
  }
  function pause(clear = false) {
    setPlaying(false);
    if (clear) {
      setTracks([]);
      pausedTracksRef.current.clear();
    }
  }
  function defaultTracks(s: typeof state, forward = false) {
    const l = lessons.find((l) => l.id === s.id)!;
    return stepMotions(l.steps[s.step])
      .filter((m) => parameterMotion(l, s.step, m.key))
      .map((m) => createTrack(m, s.params[m.key], forward ? s.progress : undefined));
  }
  function navigate(l: Lesson) {
    setHighlight('');
    setPinnedHighlight('');
    pause(true);
    const search = normalize(query);
    const matchedTicket =
      search &&
      l.tickets.find(
        (id) =>
          ticketMap[id]?.number === search ||
          normalize(ticketMap[id]?.title || '').includes(search),
      );
    const next = atStep(l, matchedTicket ? (l.entrySteps?.[matchedTicket] ?? 0) : 0);
    if (l.id !== stateRef.current.id) history.pushState(null, '', encodeState(next));
    update(next);
    setCamera((c) => c + 1);
    setMenu(false);
  }
  function chooseStep(index: number) {
    setHighlight('');
    setPinnedHighlight('');
    pause(true);
    update(atStep(lesson, index, stateRef.current.params));
  }
  function param(key: string, value: number) {
    pausedTracksRef.current.delete(key);
    if (all) pause(true);
    else {
      const remaining = tracksRef.current.filter((track) => track.motion.key !== key);
      setTracks(remaining);
      if (!remaining.length) pause();
    }
    update(changeParam(stateRef.current, lesson, key, value));
  }
  function seek(progress: number) {
    pause(true);
    update(seekState(stateRef.current, lesson, progress));
  }
  function toggle() {
    if (playing) {
      pause();
      return;
    }
    if (!hasMotion && !all && !tracksRef.current.length && !pausedTracksRef.current.size) return;
    if (reduced) {
      seek(1);
      return;
    }
    if (all && stateRef.current.progress >= 1) seek(0);
    if (all) setTracks(defaultTracks(stateRef.current, true));
    else if (!tracksRef.current.length) {
      setTracks(
        pausedTracksRef.current.size
          ? [...pausedTracksRef.current.values()]
          : defaultTracks(stateRef.current),
      );
      pausedTracksRef.current.clear();
    }
    setPlaying(true);
  }
  function toggleParameter(key: string) {
    const motion = parameterMotion(lesson, state.step, key);
    if (!motion) return;
    if (reduced) {
      param(key, motion.to);
      return;
    }
    const existing = tracksRef.current.find((track) => track.motion.key === key);
    const resumed = () => {
      const saved = all ? undefined : (existing ?? pausedTracksRef.current.get(key));
      pausedTracksRef.current.delete(key);
      return saved ?? createTrack(motion, stateRef.current.params[key]);
    };
    let tracks: PlaybackTrack[];
    if (playing && !all) {
      if (existing) {
        pausedTracksRef.current.set(key, existing);
        tracks = tracksRef.current.filter((track) => track.motion.key !== key);
      } else tracks = [...tracksRef.current, resumed()];
    } else {
      if (all) pausedTracksRef.current.clear();
      else
        for (const track of tracksRef.current)
          if (track.motion.key !== key) pausedTracksRef.current.set(track.motion.key, track);
      tracks = [resumed()];
    }
    setAll(false);
    setTracks(tracks);
    setPlaying(tracks.length > 0);
  }
  useEffect(() => {
    if (!playing) return;
    let raf = 0,
      previous: number | undefined;
    const tick = (time: number) => {
      if (previous === undefined) previous = time;
      const dt = Math.min((time - previous) / 1000, 0.1) * speed;
      previous = time;
      const s = stateRef.current,
        l = lessons.find((l) => l.id === s.id)!,
        st = l.steps[s.step];
      let progress = all ? Math.min(1, s.progress + dt / (st.duration || 6)) : s.progress;
      const params = { ...s.params };
      const primary = stepMotions(st)[0]?.key;
      tracksRef.current = tracksRef.current.map((track) => {
        const next = advanceTrack(track, dt, st.duration || 6, !all);
        params[track.motion.key] = parameterValue(l, track.motion.key, next.value, s.step);
        if (!all && track.motion.key === primary) progress = next.track.progress;
        return next.track;
      });
      let next = { ...s, progress, params };
      let finished = false;
      if (all && progress >= 1) {
        if (s.step < l.steps.length - 1) {
          next = atStep(l, s.step + 1, params, 0);
          setTracks(defaultTracks(next, true));
        } else {
          pause(true);
          finished = true;
        }
      }
      update(next);
      if (!finished) raf = requestAnimationFrame(tick);
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
      if (document.hidden) pause();
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  useEffect(
    () =>
      registerSceneTools({
        read: () => stateRef.current,
        write: (next, resetCamera) => {
          pause(true);
          setHighlight('');
          setPinnedHighlight('');
          update(next);
          if (resetCamera) setCamera((c) => c + 1);
          setMenu(false);
        },
      }),
    [],
  );
  const filtered = lessons.filter((l) =>
    normalize(
      `${l.title} ${l.subtitle} ${l.tickets.map((t) => `${ticketMap[t]?.number} ${ticketMap[t]?.title}`).join(' ')}`,
    ).includes(normalize(query)),
  );
  const catalogSection = (l: Lesson) => {
    const [block, section] = ticketMap[l.tickets[0]].number.split('.');
    return `${block}.${section} · ${section === '1' ? 'Определения' : 'Теоремы'}`;
  };
  return (
    <HighlightContext.Provider value={{ active: activeHighlight, set: setHighlight }}>
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
                    disabled={!canPlay}
                    title={
                      all
                        ? 'Последовательно пройти все шаги'
                        : canPlay
                          ? 'Повторять движение туда-обратно'
                          : 'Статическое построение: исследуй параметры или перейди к следующему шагу'
                    }
                    aria-label={playing ? 'Пауза' : 'Воспроизвести шаг'}
                  >
                    {playing ? 'Ⅱ' : '▶'}
                  </button>
                  {!all && (
                    <span className="loop-indicator" title="Движение туда-обратно">
                      ↔ ∞
                    </span>
                  )}
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
                    disabled={!hasMotion}
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
                      onChange={(e) => {
                        pause(true);
                        setAll(e.target.checked);
                      }}
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
                        className={activeHighlight === id ? 'selected' : ''}
                        aria-pressed={activeHighlight === id}
                        onPointerEnter={() => setHighlight(id)}
                        onPointerLeave={() => setHighlight('')}
                        onFocus={() => setHighlight(id)}
                        onBlur={() => setHighlight('')}
                        onClick={() => {
                          setHighlight('');
                          setPinnedHighlight((current) => (current === id ? '' : id));
                        }}
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
                        pause(true);
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
                            pause(true);
                            update(
                              Object.entries(pr.values).reduce(
                                (s, [k, v]) => changeParam(s, lesson, k, v),
                                stateRef.current,
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
                      <div className="parameter" key={p.key}>
                        <label htmlFor={`parameter-${p.key}`}>
                          {p.label}
                          <output>
                            {fmt(state.params[p.key])}
                            {p.unit}
                          </output>
                        </label>
                        <div className="parameter-controls">
                          <input
                            id={`parameter-${p.key}`}
                            type="range"
                            disabled={step.locked?.includes(p.key)}
                            min={p.min}
                            max={p.max}
                            step={p.step && p.step >= 1 ? p.step : 'any'}
                            value={state.params[p.key]}
                            onChange={(e) => param(p.key, +e.target.value)}
                            aria-label={p.label}
                          />
                          <button
                            className="parameter-play"
                            disabled={!parameterMotion(lesson, state.step, p.key)}
                            aria-label={`${playing && activeKeys.includes(p.key) ? 'Пауза параметра' : 'Запустить параметр'} ${p.label}`}
                            aria-pressed={playing && activeKeys.includes(p.key)}
                            title="Независимое движение туда-обратно; можно запустить несколько параметров"
                            onClick={() => toggleParameter(p.key)}
                          >
                            {playing && activeKeys.includes(p.key) ? 'Ⅱ' : '▶'}
                          </button>
                        </div>
                      </div>
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
