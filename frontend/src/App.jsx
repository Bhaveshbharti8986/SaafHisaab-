import React, { useState, useEffect, useCallback } from "react";
import { Router, Route, Switch, useLocation } from "wouter";
import Dashboard from "./pages/Dashboard.jsx";
import Farmers from "./pages/Farmers.jsx";
import FarmerDetail from "./pages/farmers/FarmerDetail.jsx";
import Munsi from "./pages/Munsi.jsx";
import WeighCrop from "./pages/WeighCrop.jsx";
import Godown from "./pages/Godown.jsx";
import Wallets from "./pages/Wallets.jsx";
import Expenses from "./pages/Expenses.jsx";
import Rates from "./pages/Rates.jsx";
import Analytics from "./pages/Analytics.jsx";
import Reports from "./pages/Reports.jsx";
import Login from "./pages/auth/Login.jsx";
import B2bExport from "./pages/B2bExport.jsx";
import Settings from "./pages/Settings.jsx";
import InterestDashboard from "./pages/InterestDashboard.jsx";
import Employees from "./pages/Employees.jsx";
import { decodeToken } from "./lib/jwt.js";
import { api } from "./lib/api.js";
import Register from "./pages/auth/Register.jsx";
import Labour from "./pages/Labour.jsx";
import ViewRates from "./pages/ViewRates.jsx";
import GodownAnalysis from "./pages/GodownAnalysis.jsx";
import Landing from "./pages/Landing.jsx";
import Welcome from "./pages/welcome.jsx";

// ✅ Helper: try to refresh the access token silently
async function tryRefreshToken() {
  try {
    const res = await fetch("/api/auth/refresh-token", {
      method: "POST",
      credentials: "include", // sends the httpOnly refreshToken cookie
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.accessToken || null;
  } catch {
    return null;
  }
}

export default function App() {
  const [location] = useLocation();

  // ✅ All hooks at the top — never inside conditions
  const [checking, setChecking] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const startTime = Date.now();
    const minAnimationDuration = 3000; // 3 second splash

    const validate = async () => {
      let token = localStorage.getItem("accessToken");

      if (token) {
        // Decode role from stored token
        const decoded = decodeToken(token);

        // ✅ If token is expired or about to expire (within 60s), refresh it
        const now = Math.floor(Date.now() / 1000);
        const isExpiredOrSoon = !decoded?.exp || decoded.exp - now < 60;

        if (isExpiredOrSoon) {
          const newToken = await tryRefreshToken();
          if (newToken) {
            localStorage.setItem("accessToken", newToken);
            token = newToken;
          } else {
            // Refresh also failed — clear and logout
            localStorage.removeItem("accessToken");
            sessionStorage.removeItem("unlocked");
            setIsValid(false);
            setRole(null);
            finish(startTime, minAnimationDuration);
            return;
          }
        }

        // Now validate with the backend
        try {
          await api.get("/auth/profile");
          const freshDecoded = decodeToken(token);
          setRole(freshDecoded?.role || null);
          setIsValid(true);
        } catch {
          // Profile fetch failed even with valid-looking token
          // Try refresh once more
          const newToken = await tryRefreshToken();
          if (newToken) {
            localStorage.setItem("accessToken", newToken);
            const freshDecoded = decodeToken(newToken);
            setRole(freshDecoded?.role || null);
            setIsValid(true);
          } else {
            localStorage.removeItem("accessToken");
            sessionStorage.removeItem("unlocked");
            setIsValid(false);
            setRole(null);
          }
        }
      } else {
        setIsValid(false);
        setRole(null);
      }

      finish(startTime, minAnimationDuration);
    };

    validate();
  }, []);

  function finish(startTime, minDuration) {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, minDuration - elapsed);
    setTimeout(() => setChecking(false), remaining);
  }

  // ✅ Auto-refresh token every 12 minutes (token lasts 15min)
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      const decoded = decodeToken(token);
      const now = Math.floor(Date.now() / 1000);
      // Refresh if expiring within 3 minutes
      if (decoded?.exp && decoded.exp - now < 180) {
        const newToken = await tryRefreshToken();
        if (newToken) {
          localStorage.setItem("accessToken", newToken);
        }
      }
    }, 12 * 60 * 1000); // every 12 minutes

    return () => clearInterval(interval);
  }, []);

  // --- Render Logic ---

  // Show auth pages immediately (no token needed)
  if (!checking && !isValid) {
    if (location === "/register") {
      return (
        <Router>
          <Route path="/register" component={Register} />
        </Router>
      );
    }
    if (location === "/login") {
      return (
        <Router>
          <Route path="/login" component={Login} />
        </Router>
      );
    }
    return <Welcome isSplash={false} />;
  }

  // Show splash while validating session
  if (checking) {
    return <Welcome isSplash={true} />;
  }

  // Should not reach here without a role, but guard just in case
  if (!role) {
    return <Welcome isSplash={false} />;
  }

  const isMunsi = role === "munsi";
  const isLabour = role === "labour";
  const isSeth = role === "seth";

  return (
    <Router>
      <Switch>
        {/* Root Route based on role */}
        <Route path="/">
          {isSeth ? <Dashboard /> : isMunsi ? <Munsi /> : <Labour />}
        </Route>

        <Route path="/munsi">
          {isMunsi ? <Munsi /> : <div className="flex items-center justify-center h-screen"><p className="text-gray-400 font-bold">Unauthorized Access</p></div>}
        </Route>
        
        <Route path="/labour">
          {isLabour ? <Labour /> : <div className="flex items-center justify-center h-screen"><p className="text-gray-400 font-bold">Unauthorized Access</p></div>}
        </Route>

        <Route path="/settings" component={Settings} />
        
        <Route path="/weigh">
          {(isMunsi || isLabour || isSeth) ? <WeighCrop /> : <div className="flex items-center justify-center h-screen"><p className="text-gray-400 font-bold">Unauthorized Access</p></div>}
        </Route>
        
        <Route path="/munsi/weigh">
          {(isMunsi || isLabour || isSeth) ? <WeighCrop /> : <div className="flex items-center justify-center h-screen"><p className="text-gray-400 font-bold">Unauthorized Access</p></div>}
        </Route>

        <Route path="/rates">
          {isSeth ? <Rates /> : <ViewRates />}
        </Route>

        <Route path="/godown">
          {(isMunsi || isSeth) ? <Godown /> : <p>Unauthorized</p>}
        </Route>
        
        <Route path="/godown-analysis">
          {(isMunsi || isSeth) ? <GodownAnalysis /> : <p>Unauthorized</p>}
        </Route>

        <Route path="/wallets">
          {(isMunsi || isSeth) ? <Wallets /> : <p>Unauthorized</p>}
        </Route>

        <Route path="/expenses">
          {(isMunsi || isSeth) ? <Expenses /> : <p>Unauthorized</p>}
        </Route>

        <Route path="/farmers">
          {(isMunsi || isSeth) ? <Farmers /> : <p>Unauthorized</p>}
        </Route>

        <Route path="/farmers/:id">
          {(isMunsi || isSeth) ? <FarmerDetail /> : <p>Unauthorized</p>}
        </Route>

        {/* Seth ONLY Routes */}
        <Route path="/analytics">
          {isSeth ? <Analytics /> : <p>Unauthorized</p>}
        </Route>
        
        <Route path="/interest">
          {isSeth ? <InterestDashboard /> : <p>Unauthorized</p>}
        </Route>
        
        <Route path="/reports">
          {isSeth ? <Reports /> : <p>Unauthorized</p>}
        </Route>
        
        <Route path="/b2b">
          {isSeth ? <B2bExport /> : <p>Unauthorized</p>}
        </Route>

        <Route path="/employees">
          {isSeth ? <Employees /> : <p>Unauthorized</p>}
        </Route>

        <Route>
          <div className="flex items-center justify-center h-screen">
            <p className="text-gray-400">Page not found</p>
          </div>
        </Route>
      </Switch>
    </Router>
  );
}
