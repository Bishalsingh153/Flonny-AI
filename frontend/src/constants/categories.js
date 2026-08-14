export const CATEGORIES = [
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

export const EXPENSE_CATEGORIES = CATEGORIES.filter(
  (c) => c !== 'Salary' && c !== 'Freelance'
);

export const getCategoryBadgeClass = (category) => {
  switch (category) {
    case 'Food & Dining': return 'badge-food';
    case 'Transportation': return 'badge-trans';
    case 'Fuel': return 'badge-fuel';
    case 'Shopping': return 'badge-shop';
    case 'Entertainment': return 'badge-ent';
    case 'Utilities': return 'badge-util';
    case 'Rent': return 'badge-rent';
    case 'Healthcare': return 'badge-health';
    case 'Education': return 'badge-edu';
    case 'Subscriptions': return 'badge-sub';
    case 'Transfers': return 'badge-xfer';
    case 'Salary': return 'badge-sal';
    case 'Freelance': return 'badge-free';
    default: return 'badge-other';
  }
};
