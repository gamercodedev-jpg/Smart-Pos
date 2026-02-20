import React from "react";
import { useLocation, Link } from "react-router-dom";

const breadcrumbNameMap: Record<string, string> = {
  "/": "Dashboard",
  "/pos": "POS",
  "/inventory": "Inventory",
  "/settings": "Settings",
  // Add more mappings as needed
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  return (
    <nav className="text-xs text-muted-foreground mb-2" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link to="/" className="hover:underline">Home</Link>
        </li>
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          return (
            <li key={to} className="flex items-center">
              <span className="mx-1">/</span>
              {index === pathnames.length - 1 ? (
                <span className="font-semibold">{breadcrumbNameMap[to] || value}</span>
              ) : (
                <Link to={to} className="hover:underline">{breadcrumbNameMap[to] || value}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
