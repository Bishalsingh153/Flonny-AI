import React from 'react';
import { getCategoryBadgeClass } from '../../constants/categories';

export const Badge = ({ category }) => {
  return (
    <span className={`category-badge ${getCategoryBadgeClass(category)}`}>
      {category}
    </span>
  );
};
