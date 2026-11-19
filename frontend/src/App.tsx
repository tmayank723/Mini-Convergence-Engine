import { useCallback, useEffect, useRef, useState } from 'react';

import styles from './App.module.scss';
import { BirthForm } from './BirthForm';
import { Convergence } from './Convergence';
import { MethodCards } from './MethodCards';
import { ScoreMatrix } from './ScoreMatrix';
import { ReadingAssistant } from './ReadingAssistant';
import { Skeleton } from './Skeleton';
import { ThemeToggle } from './ThemeToggle';
import { getReading } from './reading.api';
import type { ApiError, Reading, ReadingRequest } from './reading.models';

/**
 * How long a wait may run before we explain it. A warm backend answers in
 * well under a second; anything past this is an instance waking from idle,
 * and silence there reads as a hang.
 */
const SLOW_AFTER_MS = 6000;
const MOBILE_QUERY = '(max-width: 40rem)';

function isMobileScreen(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;
}

export function App() {
  const [reading, setReading] = useState<Reading | null>(null);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(isMobileScreen);
  // Closed until the user opens the reading companion — desktop and phone alike.
  const [assistantOpen, setAssistantOpen] = useState(false);
  const resultPanel = useRef<HTMLElement | null>(null);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const settle = () => {
    clearTimeout(slowTimer.current);
    setBusy(false);
    setSlow(false);
  };

  const run = useCallback(async (request: ReadingRequest) => {
    setBusy(true);
    setError(null);
    // Cleared so the new request replaces the old reading rather than sitting
    // underneath it, which would leave two answers on screen at once.
    setReading(null);
    setSlow(false);
    clearTimeout(slowTimer.current);
    slowTimer.current = setTimeout(() => setSlow(true), SLOW_AFTER_MS);

    try {
      setReading(await getReading(request));
    } catch (failure) {
      setError((failure as ApiError).message);
    } finally {
      settle();
    }
  }, []);

  // The result lands below the fold on a laptop, so bring it into view once
  // the panel actually exists.
  useEffect(() => {
    if (reading) {
      resultPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [reading]);

  useEffect(() => () => clearTimeout(slowTimer.current), []);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!(isMobile && assistantOpen)) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMobile, assistantOpen]);

  const pageClass = assistantOpen
    ? isMobile
      ? styles.pageMobileChat
      : styles.pageSplit
    : styles.pageCentered;
  const intakeFocus = assistantOpen && !isMobile && !reading && !busy;

  return (
    <div className={`${styles.page} ${pageClass}`}>
      <main className={`${styles.main} ${intakeFocus ? styles.mainIntake : ''}`}>
        <div className={intakeFocus ? styles.intakeWrap : undefined}>
          <header className={`${styles.masthead} ${intakeFocus ? styles.mastheadIntake : ''}`}>
            <p className={styles.eyebrow}>Mini Convergence Engine · A birthday, five lenses</p>
            <h1>What patterns show up around your birthday?</h1>
            <p className={styles.tagline}>
              Add your birth details to explore five traditions side by side. See what each one
              says, then compare the scores without treating them as a prediction.
            </p>
          </header>

          <section
            className={`${styles.panel} ${intakeFocus ? `${styles.intakePanel} ${styles.panelGlow}` : ''}`}
          >
            <BirthForm busy={busy} serverError={error} onSubmit={run} expanded={intakeFocus} />
          </section>
        </div>

        {busy && (
          <section className={styles.panel}>
            <Skeleton slow={slow} />
          </section>
        )}

        {reading && (
          <section className={`${styles.panel} ${styles.result}`} ref={resultPanel}>
            <header className={styles.resultHead}>
              <div>
                <h2>{reading.full_name}</h2>
                <p className={styles.subject}>
                  {reading.date_of_birth} · {reading.time_of_birth}
                </p>
              </div>
              <button
                type="button"
                className={styles.link}
                onClick={() => {
                  setReading(null);
                  setError(null);
                }}
              >
                New reading
              </button>
            </header>

            <MethodCards methods={reading.methods} />

            <section className={styles.block}>
              <h3 className={styles.blockTitle}>Every score, side by side</h3>
              <ScoreMatrix methods={reading.methods} traits={reading.traits} />
            </section>

            <section className={styles.block}>
              <h3 className={styles.blockTitle}>Where scores line up</h3>
              <Convergence methods={reading.methods} traits={reading.traits} />
            </section>

            <section className={styles.block}>
              <h3 className={styles.blockTitle}>
                The short version
                <span
                  className={`${styles.source} ${
                    reading.summary_source === 'template' ? styles.fromTemplate : ''
                  }`}
                >
                  {reading.summary_source === 'model'
                    ? 'AI-assisted wording'
                    : 'automatic summary'}
                </span>
              </h3>
              <p className={styles.summary}>{reading.summary}</p>
            </section>

            {reading.assumptions.length > 0 && (
              <aside className={styles.assumptions}>
                <h3>Details that affect this result</h3>
                <ul>
                  {reading.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
              </aside>
            )}
          </section>
        )}

        <footer className={styles.siteFooter}>
          <p className={styles.footerEyebrow}>Five ways to read a birthday</p>
          <p className={styles.footerLead}>
            Each tradition gets its own calculation. We then put the results on one shared
            scorecard; overlap is interesting, but it is not proof.
          </p>
          <ul className={styles.footerSystems}>
            <li>
              <span className={styles.footerIndex} aria-hidden>
                01
              </span>
              <strong>Western sun sign</strong>
              <span>Your tropical Sun sign, calculated from solar position on the birth date and time.</span>
            </li>
            <li>
              <span className={styles.footerIndex} aria-hidden>
                02
              </span>
              <strong>Chinese zodiac</strong>
              <span>The animal for the lunar year your birthday falls in; January dates can belong to the previous year.</span>
            </li>
            <li>
              <span className={styles.footerIndex} aria-hidden>
                03
              </span>
              <strong>Life path</strong>
              <span>A number reduced from the birth date, with 11, 22 and 33 kept intact.</span>
            </li>
            <li>
              <span className={styles.footerIndex} aria-hidden>
                04
              </span>
              <strong>Chaldean name number</strong>
              <span>A Chaldean letter-value total based on the name you enter.</span>
            </li>
            <li>
              <span className={styles.footerIndex} aria-hidden>
                05
              </span>
              <strong>Vedic vara</strong>
              <span>The weekday ruler, with the traditional day boundary set to 06:00 IST.</span>
            </li>
          </ul>
          <p className={styles.footerEyebrow}>Six shared score columns</p>
          <p className={styles.footerLead}>
            Each tradition receives a score from 0 to 10 for these dimensions. Scores of 7+
            count toward the agreement display.
          </p>
          <ul className={styles.footerTraits}>
            <li>
              <strong>Leadership</strong>
              <span>Taking initiative and stepping into a decision-making role.</span>
            </li>
            <li>
              <strong>Creativity</strong>
              <span>Original ideas, imagination, and expressive flair.</span>
            </li>
            <li>
              <strong>Emotional depth</strong>
              <span>Emotional awareness, sensitivity, and intuition.</span>
            </li>
            <li>
              <strong>Communication</strong>
              <span>Sharing ideas, making connections, and finding the right words.</span>
            </li>
            <li>
              <strong>Discipline</strong>
              <span>Consistency, follow-through, and a taste for structure.</span>
            </li>
            <li>
              <strong>Risk appetite</strong>
              <span>Comfort with uncertainty, bold choices, and taking chances.</span>
            </li>
          </ul>
          <p className={styles.footerNote}>
            For reflection and comparison only. Birth time is interpreted as IST; a location
            is not collected, so some boundaries use stated assumptions.
          </p>
        </footer>
      </main>

      {assistantOpen ? (
        <>
          {!isMobile && (
            <div className={styles.themeOnSplit}>
              <ThemeToggle />
            </div>
          )}
          <div
            className={`${styles.rightColumn} ${isMobile ? styles.rightColumnFullscreen : ''}`}
          >
            <ReadingAssistant reading={reading} open onOpenChange={setAssistantOpen} />
          </div>
        </>
      ) : (
        <>
          <div className={styles.themeBarFixed}>
            <ThemeToggle />
          </div>
          <ReadingAssistant reading={reading} open={false} onOpenChange={setAssistantOpen} />
        </>
      )}
    </div>
  );
}
