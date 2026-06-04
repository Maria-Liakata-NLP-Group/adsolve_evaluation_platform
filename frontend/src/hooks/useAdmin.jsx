/** @format */

import { createContext, useContext, useState } from "react";
import { verifyAdminToken } from "../api/config";

const AdminContext = createContext({
  isAdmin: false,
  token: null,
  login: async () => {},
  logout: () => {},
});

// Wraps the app so any component can call useAdmin()
export const AdminProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("adminToken"));

  const login = async (inputToken) => {
    // Throws ApiError if the token is invalid — caller handles the error
    await verifyAdminToken(inputToken);
    localStorage.setItem("adminToken", inputToken);
    setToken(inputToken);
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    setToken(null);
  };

  return (
    <AdminContext.Provider value={{ isAdmin: !!token, token, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => useContext(AdminContext);
