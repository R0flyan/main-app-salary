// import { useEffect, useState } from "react";

// interface Vacancy {
//   id: number;
//   title: string;
//   company: string;
//   salary: number;
// }

// function App() {
//   const [vacancies, setVacancies] = useState<Vacancy[]>([]);
//   const [title, setTitle] = useState("");
//   const [company, setCompany] = useState("");
//   const [minSalary, setMinSalary] = useState("");

//   const fetchVacancies = async () => {
//     const params = new URLSearchParams();
//     if (title) params.append("title", title);
//     if (company) params.append("company", company);
//     if (minSalary) params.append("min_salary", minSalary);

//     const url = `http://127.0.0.1:8000/vacancies?${params.toString()}`;
//     const res = await fetch(url);
//     const data = await res.json();
//     setVacancies(data);
//   };

//   const handleClear = () => {
//     setTitle("");
//     setCompany("");
//     setMinSalary("");
//   };

//   // "http://127.0.0.1:8000/vacancies")
//   //     .then(res => res.json())
//   //     .then(data => setVacancies(data))
//   //     .catch(console.error);

//   useEffect(() => {
//     fetchVacancies();
//   }, []);

//   return(
//       <div style={{ width: "100vw",
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//         justifyContent: "center",
//         minHeight: "100vh",
//         fontFamily: "Arial, sans-serif",}}>

//         <h1 style={{ marginBottom: "20px" }}>
//           Joby
//         </h1>
//         <h3> параметры поиска:</h3>

//         <div style={{
//           display: "grid",
//           gap: "10px",
//           flexWrap: "wrap",
//           justifyContent: "center",
//           marginBottom: "20px",
//         }}>
//           <input
//             type="text"
//             placeholder="Название"
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//             style={{ marginRight: "0.5rem" }}
//           />
//           <input
//             type="text"
//             placeholder="Компания"
//             value={company}
//             onChange={(e) => setCompany(e.target.value)}
//             style={{ marginRight: "0.5rem" }}
//           />
//           <input
//             type="number"
//             placeholder="Мин. зарплата"
//             value={minSalary}
//             onChange={(e) => setMinSalary(e.target.value)}
//             style={{ marginRight: "0.5rem" }}
//           />
//           <button onClick={fetchVacancies}
//             style={{
//               padding: "10px 20px",
//               borderRadius: "6px",
//               border: "none",
//               backgroundColor: "#708964ff",
//               color: "white",
//               cursor: "pointer",
//             }}
//           >
//             Поиск</button>
//           <button onClick={handleClear}
//             style={{
//               padding: "10px 20px",
//               borderRadius: "6px",
//               border: "none",
//               backgroundColor: "#860e0eff",
//               color: "white",
//               cursor: "pointer",
//             }}
//           >
//             Очистить фильтры
//           </button>
//         </div>

//         <ul>
//           {vacancies.length === 0 && <p>Нет данных</p>}
//           {vacancies.map((v) => (
//             <li key={v.id} >
//               {v.title}, {v.company}, {v.salary.toLocaleString()} ₽
//             </li>
//           ))}
//         </ul>
//       </div>
//     );
// }

// export default App;

import { useState, useEffect } from "react";

interface Vacancy {
  id: number;
  title: string;
  company: string;
  salary: number;
}

function App() {
  const API_URL = "http://127.0.0.1:8000";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [error, setError] = useState("");

  // Авторизация
  const handleAuth = async (endpoint: "login" | "register") => {
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Ошибка");

      if (endpoint === "login") {
        localStorage.setItem("token", data.access_token);
        setToken(data.access_token);
      } else {
        alert("Регистрация успешна, теперь войдите");
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setVacancies([]);
  };

  // Получение вакансий
  const fetchVacancies = async () => {
    setError("");
    try {
      const params = new URLSearchParams();
      if (title) params.append("title", title);
      if (company) params.append("company", company);
      if (minSalary) params.append("min_salary", minSalary);

      const res = await fetch(`${API_URL}/vacancies?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401) throw new Error("Требуется вход");
      const data = await res.json();
      setVacancies(data);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    if (token) fetchVacancies();
  }, [token]);

  // UI
  return (
    <div style={{ fontFamily: "sans-serif", textAlign: "center", padding: "20px" }}>
      <h1>Joby</h1>

      {!token ? (
        <div>
          <h3>Вход / Регистрация</h3>
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div style={{ marginTop: "10px" }}>
            <button onClick={() => handleAuth("login")}>Войти</button>
            <button onClick={() => handleAuth("register")}>Регистрация</button>
          </div>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "10px" }}>
            <button onClick={logout}>Выйти</button>
          </div>

          <h3>Фильтр вакансий</h3>
          <input
            placeholder="Название"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            placeholder="Компания"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <input
            type="number"
            placeholder="Мин. зарплата"
            value={minSalary}
            onChange={(e) => setMinSalary(e.target.value)}
          />
          <button onClick={fetchVacancies}>Поиск</button>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <ul style={{ listStyle: "none", padding: 0 }}>
            {vacancies.length === 0 ? (
              <p>Нет данных</p>
            ) : (
              vacancies.map((v) => (
                <li key={v.id}>
                  {v.title}, {v.company}, {v.salary.toLocaleString()} ₽
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;
