# Product Images Folder

Put product photos in this folder.

Naming convention used by the frontend:

- `product-<id>.jpg` (main image)
- `product-<id>-2.jpg` (optional second image)
- `product-<id>-3.jpg` (optional third image)

Examples:

- `product-1.jpg`
- `product-1-2.jpg`
- `product-1-3.jpg`
- `product-2.jpg`

Notes:

- `<id>` is the product `id` from the database.
- Use lowercase `.jpg` extension.
- If a local image is missing, the app falls back to `image_url` from the API if available.
