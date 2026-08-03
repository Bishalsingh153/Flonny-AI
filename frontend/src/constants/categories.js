export const CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Utilities',
  'Salary',
  'Freelance',
  'Other'
];

export const getCategoryBadgeClass = (category) => {
  switch (category) {
    case 'Food & Dining': return 'badge-food';
    case 'Transportation': return 'badge-trans';
    case 'Shopping': return 'badge-shop';
    case 'Entertainment': return 'badge-ent';
    case 'Utilities': return 'badge-util';
    case 'Salary': return 'badge-sal';
    case 'Freelance': return 'badge-free';
    default: return 'badge-other';
  }
};
