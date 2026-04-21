function SizeSelector({ availableSizes, sizeQuantities, selectedSize, onSelectSize }) {
  return (
    <div className="size-picker">
      <p className="size-picker__label">Select size</p>
      <div className="size-picker__buttons">
        {availableSizes.map((size) => (
          <button
            key={size}
            type="button"
            disabled={sizeQuantities ? (sizeQuantities[size] || 0) <= 0 : false}
            className={`size-button ${selectedSize === size ? 'size-button--active' : ''}`}
            onClick={() => onSelectSize(size)}
          >
            {size}
            {sizeQuantities ? ` (${sizeQuantities[size] || 0})` : ''}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SizeSelector;
