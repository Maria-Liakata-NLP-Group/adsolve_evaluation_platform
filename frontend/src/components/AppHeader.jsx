/** @format */

import { Link } from "react-router-dom";
import { useBreadcrumbs } from "./BreadcrumbContext";

const AppHeader = () => {
  const { breadcrumbs } = useBreadcrumbs();

  return (
    <header style={{
      background: "#151515",
      height: "48px",
      display: "flex",
      alignItems: "center",
      padding: "0 1.5rem",
      gap: "1rem",
      borderBottom: "2px solid #ffc451",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo — links back to home */}
      <Link to="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <svg
          style={{ height: "16px", width: "auto" }}
          viewBox="0 0 1526 271"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path fillRule="evenodd" fill="#ffffff" d="M1459.81 203H1519.31C1509.86 224.7 1496.21 241.5 1479.76 252.7C1463.66 264.25 1444.41 270.2 1424.46 270.2C1368.81 270.2 1321.56 225.05 1321.56 167.3C1321.56 113.05 1364.26 63 1423.41 63C1482.56 63 1525.96 109.9 1525.96 169.05C1525.96 176.75 1525.26 179.9 1524.56 184.45H1378.96C1382.46 207.55 1401.71 221.2 1424.46 221.2C1442.31 221.2 1451.76 213.15 1459.81 203ZM1379.66 145.25H1467.86C1465.41 133.7 1453.86 112 1423.76 112C1393.66 112 1382.11 133.7 1379.66 145.25Z"/>
          <path fill="#ffffff" d="M1312.02 69.65L1242.02 263.9H1186.37L1116.72 69.65H1176.92L1214.02 190.75H1214.72L1251.82 69.65H1312.02Z"/>
          <path fill="#ffffff" d="M965.409 263.9V4.9H1031.56V205.8H1108.21V263.9H965.409Z"/>
          <path fill="#ffffff" d="M719.004 166.6C719.004 119 752.954 63.35 823.654 63.35C894.354 63.35 928.304 119 928.304 166.6C928.304 214.2 894.354 269.85 823.654 269.85C752.954 269.85 719.004 214.2 719.004 166.6ZM777.104 166.6C777.104 196 798.454 215.6 823.654 215.6C848.854 215.6 870.204 194.95 870.204 166.6C870.204 138.25 848.854 117.6 823.654 117.6C798.454 117.6 777.104 138.25 777.104 166.6Z"/>
          <path fill="#ffffff" d="M696.869 80.5H631.419C630.019 71.75 627.919 55.3 607.619 55.3C596.069 55.3 584.869 63.35 584.869 75.6C584.869 91 591.869 94.15 638.419 115.15C686.719 136.85 698.969 159.25 698.969 189.35C698.969 227.15 677.269 268.8 608.669 268.8C533.769 268.8 515.219 219.8 515.219 186.55V178.15H581.019C581.019 208.25 599.569 213.5 607.969 213.5C623.719 213.5 633.169 200.55 633.169 188.65C633.169 171.5 622.319 167.3 582.419 150.5C564.219 143.15 519.069 124.95 519.069 76.3C519.069 27.65 566.319 0 609.719 0C635.269 0 662.919 9.44998 679.719 29.4C695.119 48.3 696.169 65.8 696.869 80.5Z"/>
          <path fillRule="evenodd" fill="#ffffff" d="M485.384 4.9V263.9H430.084V242.9H429.384C424.484 250.95 410.484 270.2 371.284 270.2C312.484 270.2 273.984 224.7 273.984 166.25C273.984 100.45 320.884 63 370.234 63C404.534 63 420.984 79.8 427.284 86.1V4.9H485.384ZM332.084 165.9C332.084 196 353.434 215.95 380.734 215.95C417.134 215.95 430.434 186.2 430.434 165.9C430.434 142.45 413.634 117.25 381.434 117.25C347.834 117.25 332.084 143.5 332.084 165.9Z"/>
          <circle cx="129.35" cy="227.4" r="40.5" fill="#ffc451"/>
          <path fill="#ffffff" d="M129.5 118.4L71.05 263.9H0L103.95 4.9H156.1L259 263.9H187.25L129.5 118.4Z"/>
        </svg>
      </Link>

      {/* Separator */}
      <div style={{ width: "1px", height: "18px", background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />

      {/* Breadcrumb trail */}
      {breadcrumbs.length > 0 && (
        <nav style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
              {i > 0 && (
                <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.75rem", flexShrink: 0 }}>/</span>
              )}
              {crumb.path ? (
                <Link
                  to={crumb.path}
                  style={{
                    color: "rgba(255,255,255,0.55)",
                    fontSize: "0.78rem",
                    fontFamily: '"Raleway", sans-serif',
                    fontWeight: 500,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span style={{
                  color: "#ffffff",
                  fontSize: "0.78rem",
                  fontFamily: '"Raleway", sans-serif',
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}
    </header>
  );
};

export default AppHeader;
