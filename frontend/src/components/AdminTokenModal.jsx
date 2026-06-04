/** @format */

import { useState } from "react";
import { useAdmin } from "../hooks/useAdmin";

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
    } catch {
      setError("Invalid token. Please try again.");
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
    <div style={overlayStyle} onClick={onClose}>
      <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ color: "#fff", fontFamily: '"Raleway", sans-serif', marginBottom: "1rem" }}>
          Admin Access
        </h3>

        {isAdmin ? (
          <>
            <p style={{ color: "#aaa", fontSize: "0.85rem", marginBottom: "1rem" }}>
              You are signed in as admin.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={onClose} style={secondaryBtn}>Cancel</button>
              <button onClick={handleLogout} style={dangerBtn}>Sign out</button>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: "#aaa", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
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
              <p style={{ color: "#e07070", fontSize: "0.78rem", marginBottom: "0.75rem" }}>
                {error}
              </p>
            )}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={onClose} style={secondaryBtn}>Cancel</button>
              <button
                onClick={handleLogin}
                disabled={loading || !tokenInput}
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
  background: "#ffc451", color: "#151515", border: "none",
  padding: "0.45rem 1rem", borderRadius: "4px",
  fontFamily: '"Raleway", sans-serif', fontWeight: 700,
  fontSize: "0.82rem", cursor: "pointer",
};

const secondaryBtn = {
  background: "transparent", color: "#aaa", border: "1px solid #444",
  padding: "0.45rem 1rem", borderRadius: "4px", fontSize: "0.82rem", cursor: "pointer",
};

const dangerBtn = {
  background: "rgba(139,32,32,0.3)", color: "#e07070", border: "1px solid #8b2020",
  padding: "0.45rem 1rem", borderRadius: "4px", fontSize: "0.82rem", cursor: "pointer",
};

export default AdminTokenModal;
