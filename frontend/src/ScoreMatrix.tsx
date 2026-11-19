import { useMemo } from 'react';

import styles from './ScoreMatrix.module.scss';
import {
  AGREEMENT_THRESHOLD,
  MAX_SCORE,
  type MethodResult,
  type TraitRow,
} from './reading.models';

/** Where to draw the threshold marker inside each bar. */
const THRESHOLD_PERCENT = (AGREEMENT_THRESHOLD / MAX_SCORE) * 100;

interface Props {
  methods: MethodResult[];
  traits: TraitRow[];
}

export function ScoreMatrix({ methods, traits }: Props) {
  // Resolved up front so the markup stays declarative.
  const rows = useMemo(
    () =>
      traits.map((trait) => ({
        trait: trait.trait,
        cells: methods.map((method) => {
          const score = trait.scores[method.id] ?? 0;
          return {
            method: method.id,
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
      <table className={styles.matrix}>
        <caption>
          All method scores by trait. Highlighted cells meet the {AGREEMENT_THRESHOLD}-point
          agreement mark.
        </caption>

        <thead>
          <tr>
            <th scope="col" className={styles.corner}>
              Trait
            </th>
            {methods.map((method) => (
              <th scope="col" key={method.id}>
                {method.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, r) => (
            <tr key={row.trait}>
              <th scope="row">{row.trait}</th>

              {row.cells.map((cell, c) => (
                <td
                  key={cell.method}
                  className={cell.agrees ? styles.agrees : undefined}
                  style={{ '--delay': `${r * 60 + c * 30}ms` } as React.CSSProperties}
                >
                  <span className={styles.score}>{cell.score}</span>
                  <span className={styles.bar} aria-hidden>
                    <span
                      className={styles.fill}
                      style={{ '--fill': `${cell.fill}%` } as React.CSSProperties}
                    />
                    <span className={styles.mark} style={{ left: `${THRESHOLD_PERCENT}%` }} />
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
