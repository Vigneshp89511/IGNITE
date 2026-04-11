 import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./axiosInstance";

export default function UserLoginPage() {
  const [email, setEmail] = useState("");   // ✅ changed
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/api/auth/login", {
        email,   // ✅ backend expects "username"
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("username", res.data.username);

      navigate("/user");
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Login failed";
      setError(message);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f7f9fc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "400px",
          padding: "30px",
          backgroundColor: "#fff",
          borderRadius: "12px",
          boxShadow: "0 6px 18px rgba(0, 0, 0, 0.12)",
        }}
      >
        <h1
          style={{
            fontSize: "22px",
            fontWeight: "bold",
            color: "#333",
            textAlign: "center",
            marginBottom: "8px",
          }}
        >
          Expense Reimbursement Platform
        </h1>

        <p
          style={{
            fontSize: "14px",
            color: "#666",
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          Login to submit expenses and view dashboard
        </p>

        {error && (
          <div
            style={{
              padding: "10px",
              backgroundColor: "#f8d7da",
              color: "#721c24",
              border: "1px solid #f5c6cb",
              borderRadius: "6px",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "500",
                color: "#555",
                marginBottom: "4px",
              }}
            >
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                outline: "none",
              }}
              required
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "500",
                color: "#555",
                marginBottom: "4px",
              }}
            >
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                outline: "none",
              }}
              required
            />
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#fff",
              backgroundColor: "#007bff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Log In
          </button>
        </form>

        <p
          style={{
            marginTop: "16px",
            fontSize: "12px",
            color: "#999",
            textAlign: "center",
          }}
        >
          * Backend route: <code>/api/auth/login</code>
        </p>
      </div>
    </div>
  );
}