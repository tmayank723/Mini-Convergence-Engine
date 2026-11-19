import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker, type TimePickerProps } from '@mui/x-date-pickers/TimePicker';
import { renderMultiSectionDigitalClockTimeView } from '@mui/x-date-pickers/timeViewRenderers';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';

import styles from './BirthForm.module.scss';
import type { ReadingRequest } from './reading.models';

/** Start of the verified Chinese calendar table, mirrored from the API. */
const EARLIEST_YEAR = 1902;

const MAX_NAME_LENGTH = 120;

const SYSTEMS = [
  'Western sun sign',
  'Chinese animal',
  'Chaldean name',
  'Life path',
  'Vedic vara',
] as const;

type Field = 'fullName' | 'dateOfBirth' | 'timeOfBirth';

const renderDigitalColumns = (
  props: Parameters<typeof renderMultiSectionDigitalClockTimeView>[0],
) =>
  renderMultiSectionDigitalClockTimeView({
    ...props,
    timeSteps: { hours: 1, minutes: 1 },
  });

const DIGITAL_COLUMNS = {
  hours: renderDigitalColumns,
  minutes: renderDigitalColumns,
} satisfies NonNullable<TimePickerProps['viewRenderers']>;

interface Props {
  busy: boolean;
  serverError: string | null;
  onSubmit: (request: ReadingRequest) => void;
  /** Taller layout when the assistant rail is open and no reading yet. */
  expanded?: boolean;
}

export function BirthForm({ busy, serverError, onSubmit, expanded = false }: Props) {
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Dayjs | null>(null);
  const [timeOfBirth, setTimeOfBirth] = useState<Dayjs | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    fullName: false,
    dateOfBirth: false,
    timeOfBirth: false,
  });

  // Recomputed per render rather than per keystroke; three fields is nothing
  // to validate and keeping it derived means there is no second copy of the
  // form's state that can fall out of step.
  const problems = validate(fullName, dateOfBirth, timeOfBirth);
  const valid = Object.keys(problems).length === 0;

  const fieldReady = {
    fullName: Boolean(fullName.trim()) && !problems.fullName,
    dateOfBirth: Boolean(dateOfBirth) && !problems.dateOfBirth,
    timeOfBirth: Boolean(timeOfBirth) && !problems.timeOfBirth,
  };
  const completedSteps =
    Number(fieldReady.fullName) + Number(fieldReady.dateOfBirth) + Number(fieldReady.timeOfBirth);

  // The date limits only depend on the day the form was opened.
  const maxDate = useMemo(() => dayjs(), []);
  const minDate = useMemo(() => dayjs(`${EARLIEST_YEAR}-01-01`), []);

  const errorFor = (field: Field) => (touched[field] ? (problems[field] ?? null) : null);
  const markTouched = (field: Field) => setTouched((was) => ({ ...was, [field]: true }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!valid || busy) {
      // Touch everything so every outstanding problem becomes visible at
      // once, rather than the user discovering them one at a time.
      setTouched({ fullName: true, dateOfBirth: true, timeOfBirth: true });
      return;
    }

    onSubmit({
      full_name: fullName.trim(),
      // Formatted from the local calendar date, never through UTC, which can
      // shift the day and would silently change both the sun sign and the
      // Chinese animal.
      date_of_birth: dateOfBirth!.format('YYYY-MM-DD'),
      time_of_birth: timeOfBirth!.format('HH:mm'),
    });
  };

  const formClass = expanded ? `${styles.form} ${styles.formExpanded}` : styles.form;

  return (
    <form className={formClass} onSubmit={submit} noValidate>
      <div className={styles.formAura} aria-hidden />

      <header className={styles.formHeader}>
        <div className={styles.formHeaderRow}>
          <span className={styles.formLabel}>Start with these details</span>
          <span className={styles.formCount}>{completedSteps} of 3 entered</span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${(completedSteps / 3) * 100}%` }}
          />
        </div>
      </header>

      <div className={styles.fieldStack}>
        <div
          className={`${styles.fieldCard} ${fieldReady.fullName ? styles.fieldCardReady : ''}`}
          style={{ animationDelay: '40ms' }}
        >
          <span className={styles.fieldStep} aria-hidden>
            01
          </span>
          <TextField
            label="Full name"
            value={fullName}
            placeholder="e.g. Samira Patel"
            autoComplete="name"
            required
            error={Boolean(errorFor('fullName'))}
            helperText={errorFor('fullName') ?? 'Used in the name-number calculation'}
            onChange={(event) => setFullName(event.target.value)}
            onBlur={() => markTouched('fullName')}
            slotProps={{
              input: {
                className: styles.fieldInput,
                endAdornment: (
                  <InputAdornment position="end">
                    <PersonOutlineIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </div>

        <div
          className={`${styles.fieldCard} ${fieldReady.dateOfBirth ? styles.fieldCardReady : ''}`}
          style={{ animationDelay: '120ms' }}
        >
          <span className={styles.fieldStep} aria-hidden>
            02
          </span>
          <DatePicker
            label="Date of birth"
            value={dateOfBirth}
            format="DD/MM/YYYY"
            openTo="year"
            views={['year', 'month', 'day']}
            minDate={minDate}
            maxDate={maxDate}
            open={dateOpen}
            onOpen={() => setDateOpen(true)}
            onClose={() => {
              setDateOpen(false);
              markTouched('dateOfBirth');
            }}
            onChange={setDateOfBirth}
            slotProps={{
              field: { readOnly: true },
              textField: {
                required: true,
                onClick: () => setDateOpen(true),
                error: Boolean(errorFor('dateOfBirth')),
                helperText: errorFor('dateOfBirth') ?? 'Select your birth date',
                className: styles.pickerField,
              },
              desktopPaper: { className: styles.pickerPaper },
              mobilePaper: { className: styles.pickerPaper },
            }}
          />
        </div>

        <div
          className={`${styles.fieldCard} ${fieldReady.timeOfBirth ? styles.fieldCardReady : ''}`}
          style={{ animationDelay: '200ms' }}
        >
          <span className={styles.fieldStep} aria-hidden>
            03
          </span>
          <TimePicker
            label="Time of birth"
            value={timeOfBirth}
            ampm={false}
            views={['hours', 'minutes']}
            viewRenderers={DIGITAL_COLUMNS}
            open={timeOpen}
            onOpen={() => setTimeOpen(true)}
            onClose={() => {
              setTimeOpen(false);
              markTouched('timeOfBirth');
            }}
            onChange={setTimeOfBirth}
            slotProps={{
              field: { readOnly: true },
              textField: {
                required: true,
                onClick: () => setTimeOpen(true),
                error: Boolean(errorFor('timeOfBirth')),
                helperText: errorFor('timeOfBirth') ?? 'Enter local time; interpreted as IST',
                className: styles.pickerField,
              },
              desktopPaper: { className: styles.pickerPaper },
              mobilePaper: { className: styles.pickerPaper },
            }}
          />
        </div>
      </div>

      <footer className={styles.formFooter}>
        <div className={styles.systemStrip} aria-hidden>
          <p className={styles.systemStripLabel}>Your results will include</p>
          <ul className={styles.systemList}>
            {SYSTEMS.map((name, index) => (
              <li
                key={name}
                className={`${styles.systemChip} ${valid ? styles.systemChipLive : ''}`}
                style={{ animationDelay: `${200 + index * 70}ms` }}
              >
                {name}
              </li>
            ))}
          </ul>
        </div>

        {serverError && (
          <p className={styles.serverError} role="alert">
            <ErrorOutlineIcon fontSize="small" />
            <span>{serverError}</span>
          </p>
        )}

        <div className={styles.actions}>
          <Button
            type="submit"
            variant="contained"
            size="medium"
            className={`${styles.submit} ${valid && !busy ? styles.submitReady : ''}`}
            disabled={busy}
            startIcon={
              busy ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />
            }
          >
            {busy ? 'Working through the calculations' : 'Show my five readings'}
          </Button>

          {!busy && !valid && <span className={styles.blocked}>{blockedReason(problems)}</span>}
        </div>
      </footer>
    </form>
  );
}

/**
 * One message per field, in plain language.
 *
 * Deliberately not "invalid input": the brief asks for clear messages, and a
 * message that explains what is wanted is worth more than one that restates
 * that something is wrong.
 */
function validate(
  fullName: string,
  dateOfBirth: Dayjs | null,
  timeOfBirth: Dayjs | null,
): Partial<Record<Field, string>> {
  const problems: Partial<Record<Field, string>> = {};
  const name = fullName.trim();

  if (!name) {
    problems.fullName = 'Enter a name to calculate the name number.';
  } else if (name.length > MAX_NAME_LENGTH) {
    problems.fullName = 'Keep the name to 120 characters or fewer.';
  } else if (!/\p{L}/u.test(name)) {
    problems.fullName = 'Include at least one letter in the name.';
  }

  if (!dateOfBirth) {
    problems.dateOfBirth = 'Choose a birth date.';
  } else if (!dateOfBirth.isValid()) {
    problems.dateOfBirth = 'That date could not be read. Choose it again.';
  } else if (dateOfBirth.isAfter(dayjs(), 'day')) {
    problems.dateOfBirth = 'Birth date must be today or earlier.';
  } else if (dateOfBirth.year() < EARLIEST_YEAR) {
    problems.dateOfBirth = `Calendar data is available from ${EARLIEST_YEAR} onward.`;
  }

  if (!timeOfBirth) {
    problems.timeOfBirth = 'Choose a birth time to continue.';
  } else if (!timeOfBirth.isValid()) {
    problems.timeOfBirth = 'That time could not be read. Choose it again.';
  }

  return problems;
}

/** Why the submit button is disabled, so it is never a dead end. */
function blockedReason(problems: Partial<Record<Field, string>>): string | null {
  const missing: string[] = [];
  if (problems.fullName) missing.push('a name');
  if (problems.dateOfBirth) missing.push('a date of birth');
  if (problems.timeOfBirth) missing.push('a time of birth');

  if (missing.length === 0) return null;
  if (missing.length === 1) return `Add ${missing[0]} to see your results.`;
  return `Add ${missing.slice(0, -1).join(', ')} and ${missing.at(-1)} to see your results.`;
}
