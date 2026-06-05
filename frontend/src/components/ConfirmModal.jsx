/** @format */

// Generic confirmation dialog. Renders nothing when isOpen is false.
const ConfirmModal = ({ isOpen, title, message, confirmLabel = "Yes, delete", onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="modal is-active">
      <div className="modal-background" onClick={onCancel} />
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">{title}</p>
          <button className="delete" onClick={onCancel} aria-label="close" />
        </header>
        <section className="modal-card-body">
          <p>{message}</p>
        </section>
        <footer className="modal-card-foot is-justify-content-flex-end">
          <button type="button" className="button" onClick={onCancel}>Cancel</button>
          <button type="button" className="button is-danger" onClick={onConfirm}>{confirmLabel}</button>
        </footer>
      </div>
    </div>
  );
};

export default ConfirmModal;
