// Proteção de menores: é menor quem tem menos de 18 anos (pela data de nascimento;
// sem data, usa-se a idade registada; sem nenhuma das duas, a pessoa conta como adulta).
const MINOR_AGE = 18;

const ageFrom = (birthDate, now = new Date()) => {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
};

const isMinor = (user) => {
  if (!user) return false;
  if (user.birthDate) {
    const age = ageFrom(user.birthDate);
    return age !== null && age < MINOR_AGE;
  }
  return typeof user.age === 'number' && user.age < MINOR_AGE;
};

// Quem nasceu depois desta data ainda é menor
const minorCutoffDate = (now = new Date()) =>
  new Date(now.getFullYear() - MINOR_AGE, now.getMonth(), now.getDate());

// Filtro Prisma para utilizadores menores
const minorWhere = () => ({
  OR: [{ birthDate: { gt: minorCutoffDate() } }, { birthDate: null, age: { lt: MINOR_AGE } }],
});

const churchHasMinors = async (prisma, churchId) =>
  (await prisma.user.count({ where: { churchId, ...minorWhere() } })) > 0;

module.exports = { MINOR_AGE, ageFrom, isMinor, minorCutoffDate, minorWhere, churchHasMinors };
