import React from 'react';
import { CATEGORIES } from '../../constants/categories';

export const FilterBar = ({ 
  searchQuery, 
  setSearchQuery, 
  filterCategory, 
  setFilterCategory, 
  filterType, 
  setFilterType 
}) => {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
      <div style={{ flexGrow: 1, minWidth: '200px' }}>
        <input 
          type="text" 
          className="form-control"
          placeholder="Search merchant or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div>
        <select 
          className="form-control" 
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ minWidth: '150px' }}
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <select 
          className="form-control"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ minWidth: '120px' }}
        >
          <option value="All">All Flows</option>
          <option value="expense">Expenses Only</option>
          <option value="income">Income Only</option>
        </select>
      </div>
    </div>
  );
};
