function HeroProductPanel({ tone, category, name, price, swatchType, swatches }) {
  return (
    
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
