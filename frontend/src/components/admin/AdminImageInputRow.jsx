import Button from '@mui/material/Button';

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
      <Button
        type="button"
        variant="outlined"
        size="small"
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        sx={{ fontFamily: '"Space Mono", monospace', fontSize: '10px', letterSpacing: '0.08em' }}
      >
        Remove
      </Button>
    </div>
  );
}

export default AdminImageInputRow;
