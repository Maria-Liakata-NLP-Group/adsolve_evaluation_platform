/** @format */

import { useState } from "react";
import { useAdmin } from "../../hooks/useAdmin";

// A 401 means the token itself was rejected. Anything else is a server-side
// problem (e.g. 503 when ADMIN_TOKEN is not configured) and the server's own
// message is more useful than a generic "invalid token".
const loginErrorMessage = (error) =>
  error.status === 401
    ? "Invalid token. Please try again."
    : error.message || "Could not verify token. Please try again.";

const AdminTokenModal = ({ isOpen, onClose }) => {
  const { isAdmin, login, logout } = useAdmin();
  const [tokenInput, setTokenInput] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(tokenInput);
      setTokenInput("");
      onClose();
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const overlayStyle = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  };

  const boxStyle = {
    background: "#1e1e1e", border: "1px solid #333", borderRadius: "8px",
    padding: "1.5rem", width: "360px", maxWidth: "90vw",
  };

  return (
    <div style={overlayStyle} onClick={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()} tabIndex={-1}>
      <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
        <h3 className="font-ui mb-4" style={{ color: "#fff" }}>
          Admin Access
        </h3>

        {isAdmin ? (
          <>
            <p className="mb-4" style={{ color: "#aaa", fontSize: "0.85rem" }}>
              You are signed in as admin.
            </p>
            <div className="is-flex is-justify-content-flex-end gap-2">
              <button type="button" onClick={onClose} className="btn-secondary" style={secondaryBtn}>Cancel</button>
              <button type="button" onClick={handleLogout} style={dangerBtn}>Sign out</button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-3" style={{ color: "#aaa", fontSize: "0.85rem" }}>
              Paste your admin token to enable edit controls.
            </p>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tokenInput && handleLogin()}
              placeholder="Admin token"
              style={{
                width: "100%", boxSizing: "border-box", padding: "0.5rem 0.75rem",
                background: "rgba(255,255,255,0.07)", border: "1px solid #444",
                borderRadius: "4px", color: "#fff", fontSize: "0.85rem",
                marginBottom: error ? "0.35rem" : "1rem",
              }}
            />
            {error && (
              <p className="text-error mb-3">
                {error}
              </p>
            )}
            <div className="is-flex is-justify-content-flex-end gap-2">
              <button type="button" onClick={onClose} className="btn-secondary" style={secondaryBtn}>Cancel</button>
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading || !tokenInput}
                className="btn-primary"
                style={{ ...primaryBtn, opacity: loading || !tokenInput ? 0.5 : 1 }}
              >
                {loading ? "Verifying…" : "Verify"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const primaryBtn = {
  padding: "0.45rem 1rem",
  fontSize: "0.82rem",
};

const secondaryBtn = {
  padding: "0.45rem 1rem",
  fontSize: "0.82rem",
};

const dangerBtn = {
  background: "rgba(139,32,32,0.3)", color: "#e07070", border: "1px solid #8b2020",
  padding: "0.45rem 1rem", borderRadius: "4px", fontSize: "0.82rem", cursor: "pointer",
};

export default AdminTokenModal;
