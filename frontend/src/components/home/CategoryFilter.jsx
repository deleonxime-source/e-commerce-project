function CategoryFilter({ categories, selectedCategory, onSelectCategory }) {
  return (
    <section className="category-filter">
      <span className="category-filter__label">Filter:</span>
      <button
        className={`filter-chip ${!selectedCategory ? 'filter-chip--active' : 'filter-chip--inactive'}`}
        onClick={() => onSelectCategory(null)}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          className={`filter-chip ${selectedCategory === category.id ? 'filter-chip--active' : 'filter-chip--inactive'}`}
          onClick={() => onSelectCategory(category.id)}
        >
          {category.name}
        </button>
      ))}
    </section>
  );
}

export default CategoryFilter;
