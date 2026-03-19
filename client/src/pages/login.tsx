import { useState } from "react";
import { useLocation } from "wouter";
import "./login.css";

export default function Login() {
  const [isLogin, setIsLogin]   = useState(true);
  const [role, setRole]         = useState("donor");
  const [loading, setLoading]   = useState(false);
  const [, setLocation]         = useLocation();

  const handleSubmit = async () => {
    const email    = (document.getElementById("email") as HTMLInputElement).value.trim();
    const password = (document.getElementById("password") as HTMLInputElement).value.trim();

    if (!email || !password) { alert("Please enter email and password"); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { alert("Please enter a valid email"); return; }
    if (password.length < 4) { alert("Password must be at least 4 characters"); return; }

    setLoading(true);
    const endpoint = isLogin ? "/api/login" : "/api/register";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: isLogin ? undefined : role }),
      });

      const data = await res.json();
      if (!res.ok) { alert(data.message || "Something went wrong"); return; }

      if (isLogin) {
        localStorage.setItem("userId",    data.user.id);
        localStorage.setItem("userEmail", data.user.email);
        localStorage.setItem("userRole",  data.user.role);

        if (data.user.role === "admin")         setLocation("/admin");
        else if (data.user.role === "hospital") setLocation("/hospital");
        else                                     setLocation("/profile");
      } else {
        alert("Registered successfully! Please login now.");
        setIsLogin(true);
      }
    } catch { alert("Connection error. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className={`card ${isLogin ? "login-mode" : "register-mode"}`}>
      <div className="card-bg"></div>

      <div className="hero">
        <h1 className="logo">Rapid<span>Red</span></h1>
        <p>{isLogin ? "Welcome back! Save lives today." : "Join RapidRed and save lives."}</p>
        <button onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "SIGN UP" : "LOGIN"}
        </button>
      </div>

      <div className="form">
        <h2>{isLogin ? "Login" : "Register"}</h2>

        <input id="email" type="email" placeholder="Email" />
        <input id="password" type="password" placeholder="Password" />

        {/* Role selector for signup */}
        {!isLogin && (
          <div style={{ marginBottom: "12px" }}>
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "8px", fontWeight: 500 }}>Register as:</p>
            <div style={{ display: "flex", gap: "8px" }}>
              {["donor", "hospital"].map(r => (
                <button key={r} onClick={() => setRole(r)}
                  style={{
                    flex: 1, padding: "8px", borderRadius: "10px", border: "2px solid",
                    borderColor: role === r ? "#ef4444" : "#ddd",
                    background: role === r ? "#ef4444" : "white",
                    color: role === r ? "white" : "#666",
                    fontWeight: 600, fontSize: "13px", cursor: "pointer", textTransform: "capitalize",
                  }}>
                  {r === "donor" ? "🩸 Donor" : "🏥 Hospital"}
                </button>
              ))}
            </div>
          </div>
        )}

        <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
        </button>

        {isLogin && (
          <p style={{ fontSize: "12px", color: "#999", textAlign: "center", marginTop: "8px" }}>
            Don't have an account? Click SIGN UP
          </p>
        )}
      </div>
    </div>
  );
}
