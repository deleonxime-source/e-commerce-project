function AdminImageInputRow({
  index,
  value,
  error,
  canRemove,
  onUrlChange,
  onFileChange,
  onRemove,
}) {
  return (
    <div className="admin-image-row">
      <div className="admin-image-row__field">
        <input
          type="text"
          value={value}
          onChange={(event) => onUrlChange(index, event.target.value)}
          placeholder="https://... or data:image/..."
          aria-invalid={Boolean(error)}
        />
        {error && <p className="admin-field-error">{error}</p>}
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={(event) => onFileChange(index, event.target.files?.[0])}
      />
      <button
        type="button"
        className="admin-secondary"
        onClick={() => onRemove(index)}
        disabled={!canRemove}
      >
        Remove
      </button>
    </div>
  );
}

export default AdminImageInputRow;
