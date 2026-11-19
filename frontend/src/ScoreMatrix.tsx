import { useMemo } from 'react';

import styles from './ScoreMatrix.module.scss';
import {
  AGREEMENT_THRESHOLD,
  MAX_SCORE,
  type MethodResult,
  type TraitRow,
} from './reading.models';

interface Props {
  methods: MethodResult[];
  traits: TraitRow[];
}

export function ScoreMatrix({ methods, traits }: Props) {
  const rows = useMemo(
    () =>
      traits.map((trait) => ({
        trait: trait.trait,
        cells: methods.map((method) => {
          const score = trait.scores[method.id] ?? 0;
          return {
            method: method.id,
            label: method.label,
            score,
            agrees: score >= AGREEMENT_THRESHOLD,
            fill: (score / MAX_SCORE) * 100,
          };
        }),
      })),
    [methods, traits],
  );

  return (
    <div className={styles.wrap}>
      <p className={styles.caption}>
        Scores are grouped by trait. Each score is out of {MAX_SCORE}; highlighted scores meet the{' '}
        {AGREEMENT_THRESHOLD}-point agreement mark.
      </p>

      <div className={styles.traits}>
        {rows.map((row, rowIndex) => (
          <section
            className={styles.trait}
            key={row.trait}
            aria-labelledby={`score-trait-${rowIndex}`}
            style={{ '--delay': `${rowIndex * 50}ms` } as React.CSSProperties}
          >
            <h4 className={styles.traitTitle} id={`score-trait-${rowIndex}`}>
              {row.trait}
            </h4>

            <ul className={styles.scores}>
              {row.cells.map((cell, cellIndex) => (
                <li
                  className={`${styles.scoreRow} ${cell.agrees ? styles.agrees : ''}`}
                  key={cell.method}
                  style={{ '--delay': `${rowIndex * 50 + cellIndex * 25}ms` } as React.CSSProperties}
                >
                  <span className={styles.method}>{cell.label}</span>
                  <span className={styles.track} aria-hidden="true">
                    <span
                      className={styles.fill}
                      style={{ '--fill': `${cell.fill}%` } as React.CSSProperties}
                    />
                  </span>
                  <span
                    className={styles.score}
                    aria-label={`${cell.score} out of ${MAX_SCORE}${cell.agrees ? ', meets agreement mark' : ''}`}
                  >
                    {cell.score}
                    <span className={styles.outOf}>/{MAX_SCORE}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
