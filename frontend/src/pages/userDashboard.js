  import React, { useState, useEffect } from "react";
import api from "./axiosInstance";

// Chart.js part
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function UserDashboard() {
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");

  // form state
  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    description: "",
  });
  const [billFile, setBillFile] = useState(null);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const res = await api.get("/api/expenses/me");
      setExpenses(res.data);
    } catch (err) {
      setError("Failed to load expenses");
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setBillFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) data.append(key, value);
    });
    if (billFile) data.append("billImage", billFile);

    try {
      await api.post("/api/expenses", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFormData({ amount: "", category: "", description: "" });
      setBillFile(null);
      loadExpenses();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit expense");
    }
  };

  // prepare data for graph (by category)
  const categoryMap = {};
  expenses.forEach((exp) => {
    const cat = exp.category || "Other";
    categoryMap[cat] = (categoryMap[cat] || 0) + exp.amount;
  });

  const chartData = {
    labels: Object.keys(categoryMap),
    datasets: [
      {
        label: "Total Amount (₹)",
        data: Object.values(categoryMap),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Expenses by Category" },
    },
  };

  return (
    <div
      style={{
        padding: "30px",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f7f9fc",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#333",
            borderBottom: "2px solid #007bff",
            paddingBottom: "8px",
          }}
        >
          Expense Dashboard
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#555",
            marginTop: "6px",
          }}
        >
          Welcome,{" "}
          <strong style={{ color: "#007bff" }}>
            {localStorage.getItem("username") || "User"}
          </strong>
          !
        </p>
      </div>

      {/* Global error */}
      {error && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "#f8d7da",
            color: "#721c24",
            border: "1px solid #f5c6cb",
            borderRadius: "6px",
            marginBottom: "15px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      {/* Expense graph */}
      <div
        style={{
          width: "700px",
          margin: "40px auto",
          padding: "20px",
          backgroundColor: "#fff",
          borderRadius: "10px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2
          style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "#333",
            marginBottom: "10px",
          }}
        >
          Expenses by Category
        </h2>
        {chartData.labels.length > 0 ? (
          <div
            style={{
              width: "100%",
              height: "280px",
              margin: "0 auto",
            }}
          >
            <Bar data={chartData} options={chartOptions} />
          </div>
        ) : (
          <p
            style={{
              textAlign: "center",
              fontSize: "14px",
              color: "#999",
              margin: "60px 0",
            }}
          >
            No expenses to display on graph yet.
          </p>
        )}
      </div>

      {/* Submit form */}
      <div
        style={{
          width: "450px",
          margin: "40px auto",
          padding: "25px",
          backgroundColor: "#fff",
          borderRadius: "10px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "#333",
            marginBottom: "15px",
          }}
        >
          Submit Expense & Upload Bill
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Amount */}
          <div style={{ marginBottom: "14px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "500",
                color: "#555",
                marginBottom: "4px",
              }}
            >
              Amount
            </label>
            <input
              type="number"
              placeholder="Amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
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

          {/* Category */}
          <div style={{ marginBottom: "14px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "500",
                color: "#555",
                marginBottom: "4px",
              }}
            >
              Category
            </label>
            <input
              type="text"
              placeholder="Travel, Food, etc."
              name="category"
              value={formData.category}
              onChange={handleInputChange}
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

          {/* Description */}
          <div style={{ marginBottom: "14px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "500",
                color: "#555",
                marginBottom: "4px",
              }}
            >
              Description
            </label>
            <textarea
              placeholder="Short description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                resize: "vertical",
                minHeight: "60px",
              }}
            />
          </div>

          {/* Upload bill */}
          <div style={{ marginBottom: "14px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "500",
                color: "#555",
                marginBottom: "4px",
              }}
            >
              Upload Bill (Receipt)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "14px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                outline: "none",
              }}
            />
            {billFile && (
              <small
                style={{
                  marginLeft: "8px",
                  fontSize: "12px",
                  color: "#666",
                }}
              >
                Selected: {billFile.name}
              </small>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "10px 16px",
              backgroundColor: "#007bff",
              color: "#fff",
              fontSize: "14px",
              fontWeight: "600",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              marginTop: "10px",
            }}
          >
            Submit Expense
          </button>
        </form>
      </div>

      {/* Recent expenses list */}
      <div style={{ marginTop: "40px" }}>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "#333",
            marginBottom: "12px",
          }}
        >
          Recent Expenses
        </h2>

        {expenses.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              padding: "12px",
              fontSize: "14px",
              color: "#666",
              border: "1px dashed #ccc",
              borderRadius: "6px",
              backgroundColor: "#f9f9f9",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            No expenses yet.
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: "0",
              margin: "0 auto",
              maxWidth: "800px",
            }}
          >
            {expenses.map((exp) => (
              <li
                key={exp._id}
                style={{
                  padding: "12px 16px",
                  margin: "6px 0",
                  backgroundColor: "#fff",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong
                    style={{
                      fontSize: "14px",
                      color: "#333",
                    }}
                  >
                    ₹{exp.amount}
                  </strong>{" "}
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#666",
                      margin: "0 6px",
                    }}
                  >
                    – {exp.category} –
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "500",
                      color:
                        exp.status === "approved"
                          ? "#28a745"
                          : exp.status === "denied"
                          ? "#dc3545"
                          : "#ffc107",
                    }}
                  >
                    {exp.status}
                  </span>
                </div>

                {exp.billImage && (
                  <img
                    src={`/uploads/${exp.billImage}`}
                    alt="bill"
                    style={{
                      maxWidth: "80px",
                      maxHeight: "40px",
                      objectFit: "contain",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      marginLeft: "8px",
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}  

