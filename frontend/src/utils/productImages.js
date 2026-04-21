export function getLocalProductImageUrls(productId) {
  if (!productId) return [];

  return [
    `/images/products/product-${productId}.jpg`,
    `/images/products/product-${productId}-2.jpg`,
    `/images/products/product-${productId}-3.jpg`,
    `/images/products/product-${productId}-4.jpg`,

  ];
}
