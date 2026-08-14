const CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Fuel',
  'Shopping',
  'Entertainment',
  'Utilities',
  'Rent',
  'Healthcare',
  'Education',
  'Subscriptions',
  'Transfers',
  'Salary',
  'Freelance',
  'Other'
];

const INCOME_CATEGORIES = ['Salary', 'Freelance'];
const EXPENSE_CATEGORIES = CATEGORIES.filter((c) => !INCOME_CATEGORIES.includes(c));
const CATEGORY_LIST = CATEGORIES.join(', ');

module.exports = {
  CATEGORIES,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  CATEGORY_LIST
};
