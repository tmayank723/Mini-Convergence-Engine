import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const calendar = require('./data/cny-dates.json');

export const TRAITS = [
  'Leadership',
  'Creativity',
  'Emotional depth',
  'Communication',
  'Discipline',
  'Risk appetite',
];

const METHOD_LABELS = {
  sun_sign: 'Western Sun Sign',
  chinese_zodiac: 'Chinese Zodiac',
  life_path: 'Numerology Life Path',
  name_number: 'Name Number (Chaldean)',
  vara: 'Vedic Vara',
};
const METHOD_ORDER = Object.keys(METHOD_LABELS);
const EARLIEST_YEAR = 1902;
const IST_OFFSET_MINUTES = 330;
const MAX_NAME_LENGTH = 120;
const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];
const CHALDEAN_VALUES = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 8, G: 3, H: 5, I: 1, J: 1,
  K: 2, L: 3, M: 4, N: 5, O: 7, P: 8, Q: 1, R: 2, S: 3, T: 4,
  U: 6, V: 6, W: 6, X: 5, Y: 1, Z: 7,
};

const signElements = {
  Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
  Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
  Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
  Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water',
};
const signModalities = {
  Aries: 'Cardinal', Cancer: 'Cardinal', Libra: 'Cardinal', Capricorn: 'Cardinal',
  Taurus: 'Fixed', Leo: 'Fixed', Scorpio: 'Fixed', Aquarius: 'Fixed',
  Gemini: 'Mutable', Virgo: 'Mutable', Sagittarius: 'Mutable', Pisces: 'Mutable',
};
const vector = (...values) => Object.fromEntries(TRAITS.map((trait, index) => [trait, values[index]]));
const elementContributions = {
  Fire: vector(3, 2, -1, 1, -1, 3),
  Earth: vector(1, -1, 0, -1, 4, -2),
  Air: vector(0, 2, -1, 4, -1, 1),
  Water: vector(-1, 2, 4, 0, 0, -2),
};
const modalityContributions = {
  Cardinal: vector(3, 1, 0, 1, 1, 2),
  Fixed: vector(1, -1, 1, -1, 3, -1),
  Mutable: vector(-1, 2, 0, 2, -2, 1),
};
const signOverrides = {
  'Leo|Creativity': [
    9,
    'Fire plus Fixed composes to 6, but Leo is specifically the sign of self-expression, performance and display, which every source treats as central rather than incidental. The rubric has no term for theatricality, so it undercounts it.',
  ],
  'Virgo|Discipline': [
    9,
    'Earth supplies discipline and Mutable subtracts it, composing to 7. But Virgo’s meticulousness is its defining trait, and here Mutable describes adaptability of method rather than laxity of standard, so the subtraction is the wrong reading.',
  ],
  'Scorpio|Risk appetite': [
    7,
    'Water plus Fixed composes to 2, treating Scorpio as risk-averse. That conflates caution with control: the tradition is unanimous that Scorpio will go to extremes, which is high risk appetite exercised deliberately rather than impulsively.',
  ],
};
const animalScores = {
  Rat: vector(5, 8, 5, 8, 6, 6),
  Ox: vector(6, 3, 5, 3, 10, 2),
  Tiger: vector(9, 6, 5, 6, 4, 9),
  Rabbit: vector(3, 7, 8, 6, 6, 2),
  Dragon: vector(10, 8, 5, 8, 6, 8),
  Snake: vector(6, 7, 8, 4, 8, 4),
  Horse: vector(7, 7, 4, 8, 3, 9),
  Goat: vector(3, 9, 9, 5, 5, 2),
  Monkey: vector(6, 9, 4, 9, 4, 8),
  Rooster: vector(7, 5, 4, 9, 8, 6),
  Dog: vector(6, 4, 8, 6, 8, 3),
  Pig: vector(4, 6, 7, 6, 5, 4),
};
const lifePathScores = {
  1: vector(10, 6, 3, 6, 7, 8),
  2: vector(3, 5, 9, 8, 6, 2),
  3: vector(5, 10, 6, 10, 3, 6),
  4: vector(6, 3, 4, 4, 10, 2),
  5: vector(6, 8, 4, 8, 2, 10),
  6: vector(6, 6, 9, 7, 7, 3),
  7: vector(4, 7, 8, 4, 8, 4),
  8: vector(10, 5, 4, 7, 8, 8),
  9: vector(6, 8, 10, 7, 5, 5),
  11: vector(7, 9, 10, 8, 5, 5),
  22: vector(9, 7, 6, 6, 10, 5),
  33: vector(8, 8, 10, 10, 7, 4),
};
const nameNumberPlanets = {
  1: 'Sun', 2: 'Moon', 3: 'Jupiter', 4: 'Uranus', 5: 'Mercury',
  6: 'Venus', 7: 'Neptune', 8: 'Saturn', 9: 'Mars',
};
const nameNumberScores = {
  1: vector(9, 6, 4, 6, 7, 7),
  2: vector(4, 6, 9, 7, 5, 3),
  3: vector(8, 8, 5, 8, 7, 6),
  4: vector(5, 8, 5, 6, 4, 8),
  5: vector(6, 8, 4, 10, 4, 8),
  6: vector(5, 9, 8, 7, 6, 3),
  7: vector(4, 8, 9, 5, 5, 6),
  8: vector(8, 4, 6, 4, 10, 4),
  9: vector(9, 6, 5, 6, 6, 10),
};
const planetScores = {
  Sun: vector(10, 6, 4, 6, 7, 6),
  Moon: vector(3, 7, 10, 6, 4, 2),
  Mars: vector(8, 4, 3, 5, 6, 10),
  Mercury: vector(5, 8, 4, 10, 6, 6),
  Jupiter: vector(8, 7, 7, 8, 7, 5),
  Venus: vector(4, 10, 8, 7, 5, 4),
  Saturn: vector(6, 3, 6, 3, 10, 2),
};
const varaByWeekday = [
  ['Somavara', 'Monday', 'Moon'],
  ['Mangalavara', 'Tuesday', 'Mars'],
  ['Budhavara', 'Wednesday', 'Mercury'],
  ['Guruvara', 'Thursday', 'Jupiter'],
  ['Shukravara', 'Friday', 'Venus'],
  ['Shanivara', 'Saturday', 'Saturn'],
  ['Ravivara', 'Sunday', 'Sun'],
];

export class InputError extends Error {
  constructor(message, field = null) {
    super(message);
    this.field = field;
  }
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function parseBirthDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new InputError('Choose a real birth date in year-month-day format.', 'date_of_birth');
  }
  const [year, month, day] = value.split('-').map(Number);
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    throw new InputError('That date does not appear on the calendar.', 'date_of_birth');
  }
  const nowInIst = new Date(Date.now() + IST_OFFSET_MINUTES * 60 * 1000);
  const today = nowInIst.toISOString().slice(0, 10);
  if (value > today) {
    throw new InputError('A date of birth cannot be in the future.', 'date_of_birth');
  }
  if (year < EARLIEST_YEAR) {
    throw new InputError(
      `We can only calculate for births from ${EARLIEST_YEAR} onwards, because that is where the Chinese calendar data we verified starts.`,
      'date_of_birth',
    );
  }
  return { value, year, month, day };
}

function parseBirthTime(value) {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/.test(value)) {
    throw new InputError('Enter a valid 24-hour birth time, such as 08:45.', 'time_of_birth');
  }
  const [clock, fraction = ''] = value.split('.');
  const [hour, minute, second = '00'] = clock.split(':');
  const seconds = second.padStart(2, '0');
  const fractionalSeconds = fraction ? `.${fraction.replace(/0+$/, '')}` : '';
  return `${hour}:${minute}:${seconds}${fractionalSeconds}`;
}

function normaliseName(text) {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toUpperCase().replace(/[^A-Z]/g, '');
}

function sumDigits(value) {
  return String(value).split('').reduce((sum, digit) => sum + Number(digit), 0);
}

function reduceToDigit(value) {
  if (value < 0) throw new Error('cannot reduce a negative number');
  while (value > 9) value = sumDigits(value);
  return value;
}

function nameNumber(fullName) {
  const ignoredCharacters = [...new Set([...fullName].filter((character) => (
    !/\s/u.test(character) && !normaliseName(character)
  )))].sort();
  const parts = fullName.trim().split(/\s+/).map(normaliseName).filter(Boolean).map((text) => {
    const total = [...text].reduce((sum, letter) => sum + CHALDEAN_VALUES[letter], 0);
    return { text, total, reduced: reduceToDigit(total) };
  });
  if (!parts.length) throw new InputError('A name needs at least one letter, so we can score it.', 'full_name');
  const compound = parts.reduce((sum, part) => sum + part.reduced, 0);
  return {
    value: reduceToDigit(compound),
    compound,
    letterTotal: parts.reduce((sum, part) => sum + part.total, 0),
    ignoredCharacters,
  };
}

function reduceLifePath(value) {
  while (value > 9 && ![11, 22, 33].includes(value)) value = sumDigits(value);
  return value;
}

function lifePath({ year, month, day }) {
  const monthReduced = reduceLifePath(month);
  const dayReduced = reduceLifePath(day);
  const yearReduced = reduceLifePath(year);
  const total = monthReduced + dayReduced + yearReduced;
  const value = reduceLifePath(total);
  const describe = (label, original, reduced) => (
    original === reduced ? `${label} ${original} is already reduced` : `${label} ${original} reduces to ${reduced}`
  );
  const steps = [
    describe('month', month, monthReduced),
    describe('day', day, dayReduced),
    describe('year', year, yearReduced),
    `${monthReduced} + ${dayReduced} + ${yearReduced} = ${total}`,
  ];
  if (value !== total) steps.push(`${total} reduces to ${value}`);
  if ([11, 22, 33].includes(value)) steps.push(`${value} is a master number, so it is left unreduced`);
  return { value, steps };
}

function julianDay(date, hour, minute, second = 0) {
  let year = date.year;
  let month = date.month;
  const fractionalDay = date.day + hour / 24 + minute / 1440 + second / 86400;
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (year + 4716))
    + Math.floor(30.6001 * (month + 1))
    + fractionalDay + b - 1524.5;
}

function apparentSolarLongitude(date, time) {
  const [clock, fraction = ''] = time.split('.');
  const [hour, minute, second = '0'] = clock.split(':').map(Number);
  const fractionalSecond = Number(`0.${fraction || '0'}`);
  const utcMinutes = hour * 60 + minute - 330;
  const utcDate = new Date(Date.UTC(date.year, date.month - 1, date.day, 0, utcMinutes, second + fractionalSecond));
  const utc = {
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate(),
  };
  const jd = julianDay(utc, utcDate.getUTCHours(), utcDate.getUTCMinutes(), utcDate.getUTCSeconds() + utcDate.getUTCMilliseconds() / 1000);
  const t = (jd - 2451545.0) / 36525.0;
  const l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
  const mRad = m * Math.PI / 180;
  const c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(mRad)
    + (0.019993 - 0.000101 * t) * Math.sin(2 * mRad)
    + 0.000289 * Math.sin(3 * mRad);
  const omega = (125.04 - 1934.136 * t) * Math.PI / 180;
  return ((l0 + c - 0.00569 - 0.00478 * Math.sin(omega)) % 360 + 360) % 360;
}

function sunSign(date, time) {
  const longitude = apparentSolarLongitude(date, time);
  const index = Math.floor(longitude / 30);
  const degreesIntoSign = longitude - index * 30;
  const degreesToCusp = Math.min(degreesIntoSign, 30 - degreesIntoSign);
  const hoursToCusp = degreesToCusp / 0.9856 * 24;
  return {
    sign: SIGNS[index],
    longitude,
    degreesIntoSign,
    hoursToCusp,
    nearCusp: hoursToCusp < 24,
  };
}

function chineseZodiac(date) {
  const currentYear = calendar[String(date.year)];
  if (!currentYear) {
    throw new InputError(`no Chinese New Year data for ${date.year}; the table covers 1901-2100`, 'date_of_birth');
  }
  const [month, day] = currentYear;
  const boundary = `${date.year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const before = date.value < boundary;
  const zodiacYear = before ? date.year - 1 : date.year;
  const zodiac = calendar[String(zodiacYear)];
  if (!zodiac) {
    throw new InputError(`birth on ${date.value} falls in Chinese year ${zodiacYear}, which is outside the table range 1901-2100`, 'date_of_birth');
  }
  return { animal: zodiac[3], ganzhi: zodiac[2], zodiacYear, boundary, before };
}

function vara(date, time) {
  const shifted = time < '06:00';
  const day = new Date(`${date.value}T00:00:00Z`);
  if (shifted) day.setUTCDate(day.getUTCDate() - 1);
  const vedicDate = day.toISOString().slice(0, 10);
  const weekday = day.getUTCDay();
  const [name, englishWeekday, planet] = varaByWeekday[(weekday + 6) % 7];
  return { name, weekday: englishWeekday, planet, vedicDate, shifted };
}

function scoreSunSign(sign) {
  const element = signElements[sign];
  const modality = signModalities[sign];
  const scores = {};
  const notes = [];
  for (const trait of TRAITS) {
    const composed = Math.max(0, Math.min(10, 5 + elementContributions[element][trait] + modalityContributions[modality][trait]));
    const override = signOverrides[`${sign}|${trait}`];
    if (override) {
      scores[trait] = override[0];
      notes.push(`${trait}: overridden from ${composed} to ${override[0]}. ${override[1]}`);
    } else {
      scores[trait] = composed;
    }
  }
  return {
    scores,
    notes,
    basis: `${sign} is ${element} and ${modality}, so each trait is 5 plus the ${element} contribution plus the ${modality} contribution`,
  };
}

function scoredFrom(scores, basis) {
  return { scores: { ...scores }, notes: [], basis };
}

function converge(scoresByMethod) {
  return TRAITS.map((trait) => {
    const scores = Object.fromEntries(METHOD_ORDER.map((method) => [method, scoresByMethod[method].scores[trait]]));
    const agreeing = Object.keys(scores).filter((method) => scores[method] >= 7).sort();
    return {
      trait,
      scores,
      agreeing,
      n: agreeing.length,
      confidence: 1 - 1 / (2 ** agreeing.length),
    };
  });
}

function assumptions(date, sun, zodiac, name, day) {
  const notes = ['No birthplace is collected, so the clock time is read as IST (UTC+5.5).'];
  if (sun.nearCusp) {
    notes.push(`The Sun is within about ${Math.round(sun.hoursToCusp)} hours of a sign boundary. A different local timezone could place it in the neighbouring sign.`);
  }
  if (day.shifted) {
    notes.push(`Vara changes at the assumed 06:00 sunrise. This early birth is assigned to ${day.vedicDate}, the previous calendar day; the actual sunrise depends on birthplace.`);
  }
  if (zodiac.before) {
    notes.push(`This birthday comes before Chinese New Year (${zodiac.boundary}), so it still belongs to the previous lunar year's animal.`);
  }
  if (name.ignoredCharacters.length) {
    const characters = name.ignoredCharacters.map((character) => `'${character.replaceAll("'", "\\'")}'`).join(', ');
    notes.push(`${characters} do not have a letter value in the Chaldean table and were left out of the name calculation.`);
  }
  return notes;
}

export function buildReading(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new InputError('Please enter a name, date of birth and time of birth.');
  }
  const fullName = typeof request.full_name === 'string' ? request.full_name.trim() : '';
  if (!fullName) throw new InputError('Please enter a name.', 'full_name');
  if ([...fullName].length > MAX_NAME_LENGTH) {
    throw new InputError(`That name is longer than ${MAX_NAME_LENGTH} characters.`, 'full_name');
  }
  if (![...fullName].some((character) => /\p{L}/u.test(character))) {
    throw new InputError('A name needs at least one letter, so we can score it.', 'full_name');
  }
  const date = parseBirthDate(request.date_of_birth);
  const time = parseBirthTime(request.time_of_birth);
  const sun = sunSign(date, time);
  const zodiac = chineseZodiac(date);
  const path = lifePath(date);
  const name = nameNumber(fullName);
  const day = vara(date, time);

  const scored = {
    sun_sign: scoreSunSign(sun.sign),
    chinese_zodiac: scoredFrom(animalScores[zodiac.animal], `from the traditional trait list for the ${zodiac.animal}`),
    life_path: scoredFrom(lifePathScores[path.value], `from the published meaning of Life Path ${path.value}`),
    name_number: scoredFrom(nameNumberScores[name.value], `Cheiro attaches ${nameNumberPlanets[name.value]} to the number ${name.value}, and these follow its significations`),
    vara: scoredFrom(planetScores[day.planet], `from the traditional significations of ${day.planet}, lord of the vara`),
  };

  const detailByMethod = {
    sun_sign: `Solar longitude: ${sun.longitude.toFixed(2)}°. That places the Sun ${sun.degreesIntoSign.toFixed(1)}° into ${sun.sign}.`,
    chinese_zodiac: `The lunar year ${zodiac.zodiacYear} (${zodiac.ganzhi}) began ${zodiac.boundary}; this birthday falls under the ${zodiac.animal}.`,
    life_path: `${path.steps.join('; ')}.`,
    name_number: `The scored letters add to ${name.letterTotal}. Reduced name parts make ${name.compound}, which resolves to ${name.value}.`,
    vara: `${day.planet} rules ${day.weekday} in the sunrise-based vara cycle; this birth is assigned to ${day.name}.`,
  };
  const resultByMethod = {
    sun_sign: sun.sign,
    chinese_zodiac: zodiac.animal,
    life_path: String(path.value),
    name_number: String(name.value),
    vara: `${day.name} (${day.planet})`,
  };
  const methods = METHOD_ORDER.map((id) => ({
    id,
    label: METHOD_LABELS[id],
    result: resultByMethod[id],
    detail: detailByMethod[id],
    basis: scored[id].basis,
    notes: scored[id].notes,
    scores: scored[id].scores,
  }));
  const traits = converge(scored);

  return {
    full_name: fullName,
    date_of_birth: date.value,
    time_of_birth: time,
    methods,
    traits,
    assumptions: assumptions(date, sun, zodiac, name, day),
  };
}
