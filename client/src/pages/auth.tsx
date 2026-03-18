import { useState } from "react";
import "./auth.css";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  const toggleView = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="card">
      <div className={`card-bg ${isLogin ? "login" : ""}`} />

      {/* LOGIN SIDE */}
      <div className={`hero login ${isLogin ? "active" : ""}`}>
        <h2>Hello there</h2>
        <p>Begin your journey...</p>
        <button type="button" onClick={toggleView}>
          SIGN UP
        </button>
      </div>

      <div className={`form login ${isLogin ? "active" : ""}`}>
        <h2>Login</h2>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button>Login</button>
      </div>

      {/* REGISTER SIDE */}
      <div className={`hero register ${!isLogin ? "active" : ""}`}>
        <h2>Welcome back</h2>
        <p>Login to review...</p>
        <button type="button" onClick={toggleView}>
          LOGIN
        </button>
      </div>

      <div className={`form register ${!isLogin ? "active" : ""}`}>
        <h2>Sign Up</h2>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button>Register</button>
      </div>
    </div>
  );
}
