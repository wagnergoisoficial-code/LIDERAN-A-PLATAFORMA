const DAY = 24 * 60 * 60 * 1000;
const TIME_ZONE = process.env.BIRTHDAY_TZ || 'Africa/Maputo';

const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

// Dia do aniversário naquele ano, à meia-noite UTC (29/02 passa a 28/02 nos anos comuns)
const birthdayIn = (birthDate, year) => {
  const birth = new Date(birthDate);
  const leapDay = birth.getUTCMonth() === 1 && birth.getUTCDate() === 29 && !isLeap(year);
  return Date.UTC(year, birth.getUTCMonth(), leapDay ? 28 : birth.getUTCDate());
};

// Quem faz anos amanhã (ou hoje, se o aviso da véspera não saiu) e ainda não teve aviso nesse ano
const dueBirthdays = (members, now = new Date(), timeZone = TIME_ZONE) => {
  const today = Date.parse(`${new Intl.DateTimeFormat('en-CA', { timeZone }).format(now)}T00:00:00Z`);
  const due = [];
  for (const member of members) {
    if (!member.birthDate) continue;
    for (const [day, tomorrow] of [[today + DAY, true], [today, false]]) {
      const year = new Date(day).getUTCFullYear();
      if (birthdayIn(member.birthDate, year) === day && (member.birthdayNoticeYear || 0) < year) {
        due.push({ member, year, tomorrow });
        break;
      }
    }
  }
  return due;
};

module.exports = { dueBirthdays, birthdayIn };
