function ProductGallery({ productName, images, selectedImage, onSelectImage }) {
  return (
    <div className="product-gallery">
      <div className="product-gallery__main">
        <img src={selectedImage} alt={productName} />
      </div>

      <div className="product-gallery__thumbs">
        {images.map((imageUrl, index) => (
          <button
            key={`${imageUrl}-${index}`}
            type="button"
            className={`gallery-thumb ${selectedImage === imageUrl ? 'gallery-thumb--active' : ''}`}
            onClick={() => onSelectImage(imageUrl)}
          >
            <img src={imageUrl} alt={`${productName} ${index + 1}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default ProductGallery;
