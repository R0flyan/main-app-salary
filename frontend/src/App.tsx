import { useEffect, useState } from "react";

interface Vacancy {
  id: number;
  title: string;
  company: string;
  salary: number;
}

function App() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [minSalary, setMinSalary] = useState("");

  const fetchVacancies = async () => {
    const params = new URLSearchParams();
    if (title) params.append("title", title);
    if (company) params.append("company", company);
    if (minSalary) params.append("min_salary", minSalary);

    const url = `http://127.0.0.1:8000/vacancies?${params.toString()}`;
    const res = await fetch(url);
    const data = await res.json();
    setVacancies(data);
  };

  const handleClear = () => {
    setTitle("");
    setCompany("");
    setMinSalary("");
  };

  // "http://127.0.0.1:8000/vacancies")
  //     .then(res => res.json())
  //     .then(data => setVacancies(data))
  //     .catch(console.error);

  useEffect(() => {
    fetchVacancies();
  }, []);

  return(
      <div style={{ width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "Arial, sans-serif",}}>

        <h1 style={{ marginBottom: "20px" }}>
          Joby
        </h1>
        <h3> параметры поиска:</h3>

        <div style={{
          display: "grid",
          gap: "10px",
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: "20px",
        }}>
          <input
            type="text"
            placeholder="Название"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ marginRight: "0.5rem" }}
          />
          <input
            type="text"
            placeholder="Компания"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            style={{ marginRight: "0.5rem" }}
          />
          <input
            type="number"
            placeholder="Мин. зарплата"
            value={minSalary}
            onChange={(e) => setMinSalary(e.target.value)}
            style={{ marginRight: "0.5rem" }}
          />
          <button onClick={fetchVacancies}
            style={{
              padding: "10px 20px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#708964ff",
              color: "white",
              cursor: "pointer",
            }}
          >
            Поиск</button>
          <button onClick={handleClear}
            style={{
              padding: "10px 20px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#860e0eff",
              color: "white",
              cursor: "pointer",
            }}
          >
            Очистить фильтры
          </button>
        </div>

        <ul>
          {vacancies.length === 0 && <p>Нет данных</p>}
          {vacancies.map((v) => (
            <li key={v.id} >
              {v.title}, {v.company}, {v.salary.toLocaleString()} ₽
            </li>
          ))}
        </ul>
      </div>
    );
}

export default App;
