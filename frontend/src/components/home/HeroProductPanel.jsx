function HeroProductPanel({ tone, category, name, price, swatchType, swatches }) {
  return (
    <div className={`hero__product hero__product--${tone}`}>
      <div className="hero__product-header">
        <div>
          <p className={`hero__product-category hero__product-category--${tone}`}>
            {category}
          </p>
          <p className={`hero__product-name hero__product-name--${tone}`}>
            {name}
          </p>
        </div>
        <p className={`hero__product-price hero__product-price--${tone}`}>
          {price}
        </p>
      </div>

      {swatchType === 'blocks' ? (
        <div className="hero__swatches">
          {swatches.map((swatchClass) => (
            <div key={swatchClass} className={`hero__swatch-block ${swatchClass}`} />
          ))}
        </div>
      ) : (
        <div className="colour-swatches">
          {swatches.map((swatchClass) => (
            <div key={swatchClass} className={`swatch ${swatchClass}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export default HeroProductPanel;
