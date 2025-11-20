import { useEffect, useState } from "react";

function App() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const handleAuth = async () => {
    try {
      if (mode === "register") {
        // регистрация
        const res = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        });

        if (!res.ok) {
          const msg = await res.text();
          alert(`Ошибка регистрации: ${msg}`);
          return;
        }

        alert("Регистрация успешна! Теперь войди в систему.");
        setMode("login");
        return;
      }

      // вход (логин)
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
        credentials: "include",
      });

      if (res.ok) {
        setIsAuthenticated(true);
        fetchHHVacancies();
      } else {
        alert("Ошибка входа — проверь логин или пароль");
        return;
      }
      alert("Вы успешно вошли");

      // const data = await res.json();
      // setToken(data.access_token);
      // localStorage.setItem("token", data.access_token);
    } catch (err) {
      console.error(err);
      alert("Ошибка подключения к серверу");
    }
  };

  // const fetchVacancies = async () => {
  //   setLoading(true);
  //   try {
  //     const params = new URLSearchParams();
  //     if (title) params.append("title", title);
  //     if (company) params.append("company", company);
  //     if (minSalary) params.append("min_salary", minSalary);

  //     const res = await fetch(`${API_URL}/vacancies?${params}`, {
  //       headers: token ? { Authorization: `Bearer ${token}` } : {},
  //     });

  //     if (!res.ok) throw new Error("Ошибка загрузки данных");
  //     const data = await res.json();
  //     setVacancies(data);
  //   } catch (err) {
  //     console.error(err);
  //     alert("Не удалось получить вакансии");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // interface Vacancy {
  //   id: number;
  //   title: string;
  //   company: string;
  //   salary: number;
  //   url: string | undefined;
  // }

  // interface HHVacancy {
  //   id: string;
  //   name: string;
  //   employer?: { name: string };
  //   salary?: { from: number | null; to: number | null };
  //   alternate_url: string;
  // }

  interface Vacancy {
    id: number;
    title: string;
    company: string;
    salary: number;
    salaryTo?: number | null;
    currency?: string;
    url: string | undefined;
  }

  interface HHVacancy {
    id: string;
    name: string;
    employer?: { name: string };
    salary?: {
      from: number | null;
      to: number | null;
      currency?: string;   // <-- добавили
    };
    alternate_url: string;
  }

  // const fetchHHVacancies = async () => {
  //   setLoading(true);
  //   try {
  //     const query = encodeURIComponent(title);
  //     const res = await fetch(`https://api.hh.ru/vacancies?text=${query}&per_page=10`);
  //     if (!res.ok) throw new Error("Ошибка загрузки вакансий hh.ru");

  //     const data = await res.json();

  //     let hhData: Vacancy[] = data.items.map((v: HHVacancy) => ({
  //       id: Number(v.id),
  //       title: v.name,
  //       company: v.employer?.name || "Не указано",
  //       salary: v.salary?.from ?? 0,
  //       url: v.alternate_url,
  //     }));

  //     if (company.trim()) {
  //       hhData = hhData.filter((vac) =>
  //         vac.company.toLowerCase().includes(company.toLowerCase())
  //       );
  //     }

  //     if (minSalary.trim()) {
  //       const min = Number(minSalary);
  //       hhData = hhData.filter((vac) => vac.salary >= min);
  //     }

  //     setVacancies(hhData);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  // const fetchHHVacancies = async () => {
  //   setLoading(true);
  //   try {
  //     // Формируем параметры
  //     const params = new URLSearchParams();
  //     if (title.trim()) params.append("text", title);
  //     if (company.trim()) params.append("employer_name", company);
  //     if (minSalary.trim()) params.append("salary_from", minSalary);
  //     params.append("per_page", "20");
  //     params.append("only_with_salary", "true");
  //     params.append("salary_currency", "RUR");

  //     const res = await fetch(`https://api.hh.ru/vacancies?${params.toString()}`);
  //     if (!res.ok) throw new Error("Ошибка загрузки вакансий hh.ru");

  //     const data = await res.json();

  //     const hhData: Vacancy[] = data.items.filter((v: HHVacancy) => v.salary?.from && v.salary.currency === "RUR").map((v: HHVacancy) => ({
  //       id: Number(v.id),
  //       title: v.name,
  //       company: v.employer?.name || "Отсутствует",
  //       salary: v.salary?.from ?? 0,
  //       url: v.alternate_url,
  //     }));

  //     setVacancies(hhData);
  //   } catch (err) {
  //     console.error(err);
  //     alert("Ошибка получения вакансий");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleClear = () => {
    setTitle("");
    setCompany("");
    setMinSalary("");
  };

  const fetchHHVacancies = async () => {
    setLoading(true);
    try {
      // Формируем параметры для API hh.ru
      const params = new URLSearchParams();
      
      // Собираем поисковый запрос из всех фильтров
      let searchText = "";
      if (title.trim()) searchText += title.trim();
      if (company.trim()) {
        if (searchText) searchText += " ";
        searchText += company.trim();
      }
      
      if (searchText) params.append("text", searchText);
      params.append("per_page", "20"); // увеличим количество для лучшей фильтрации
      
      // Фильтры по зарплате
      if (minSalary.trim()) {
        params.append("salary", minSalary);
      }
      params.append("currency", "RUR"); // только рубли
      params.append("only_with_salary", "true"); // только с указанной зарплатой

      const res = await fetch(`https://api.hh.ru/vacancies?${params.toString()}`);
      if (!res.ok) throw new Error("Ошибка загрузки вакансий hh.ru");

      const data = await res.json();

      // Фильтруем вакансии на клиенте для точного соответствия
      const hhData: Vacancy[] = data.items
        .filter((v: HHVacancy) => {
          // Проверяем что зарплата в рублях и не равна 0
          if (!v.salary || v.salary.currency !== "RUR" || !v.salary.from || v.salary.from === 0) {
            return false;
          }

          // Фильтр по минимальной зарплате (если указан)
          if (minSalary.trim()) {
            const minSalaryNum = Number(minSalary);
            if (v.salary.from < minSalaryNum) return false;
          }

          // Фильтр по компании (точное соответствие)
          if (company.trim()) {
            const companyName = v.employer?.name?.toLowerCase() || "";
            if (!companyName.includes(company.toLowerCase().trim())) {
              return false;
            }
          }

          // Фильтр по названию вакансии
          if (title.trim()) {
            const vacancyTitle = v.name.toLowerCase();
            if (!vacancyTitle.includes(title.toLowerCase().trim())) {
              return false;
            }
          }

          return true;
        })
        .map((v: HHVacancy) => ({
          id: Number(v.id),
          title: v.name,
          company: v.employer?.name || "Не указано",
          salary: v.salary?.from ?? 0,
          salaryTo: v.salary?.to || null,
          currency: v.salary?.currency,
          url: v.alternate_url,
        }));

      setVacancies(hhData);
    } catch (err) {
      console.error(err);
      alert("Ошибка получения вакансий");
    } finally {
      setLoading(false);
    }
  };

  // useEffect(() => {
  //   const savedToken = localStorage.getItem("token");
  //   if (savedToken) {
  //     setToken(savedToken);
  //     // fetchVacancies();
  //     fetchHHVacancies();
  //   }
  // }, []);
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          credentials: "include", // важно, чтобы cookie отправились
        });
        setIsAuthenticated(res.ok);

        if (res.ok) {
          fetchHHVacancies();
        }

      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ marginBottom: "20px" }}>Joby</h1>

      {!isAuthenticated ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <button
              onClick={() => setMode("login")}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: mode === "login" ? "#076614ff" : "#6e6c6cff",
                color: "white",
                cursor: "pointer",
              }}
            >
              Вход
            </button>
            <button
              onClick={() => setMode("register")}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: mode === "register" ? "#076614ff" : "#6e6c6cff",
                color: "white",
                cursor: "pointer",
              }}
            >
              Регистрация
            </button>
          </div>

          <input
            type="email"
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
          <button
            onClick={handleAuth}
            style={{
              padding: "10px 20px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#076614ff",
              color: "white",
              cursor: "pointer",
            }}
          >
            {mode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>
        </div>
      ) : (
        <>
          <h3>Параметры поиска:</h3>

          <div
            style={{
              display: "grid",
              gap: "10px",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            <input
              type="text"
              placeholder="Название"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="text"
              placeholder="Компания"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <input
              type="text"
              placeholder="Мин. зарплата"
              value={minSalary}
              onChange={(e) => setMinSalary(e.target.value)}
            />
            <button
              onClick={fetchHHVacancies}
              style={{
                padding: "10px 20px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#708964ff",
                color: "white",
                cursor: "pointer",
              }}
            >
              Поиск
            </button>
            <button
              onClick={handleClear}
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
            <button
              onClick={async () => {
                // setToken(null);
                // localStorage.removeItem("token");
                await fetch(`${API_URL}/auth/logout`, {
                  method: "POST",
                  credentials: "include",
                });
                setIsAuthenticated(false);
                window.location.reload();
              }}
              style={{
                padding: "10px 20px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#444",
                color: "white",
                cursor: "pointer",
              }}
            >
              Выйти
            </button>
          </div>

          {loading && <p>Загрузка...</p>}
          <ul>
            {vacancies.length === 0 && !loading && <p>Нет данных</p>}
            {vacancies.map((v) => (
              <li key={v.id}>
                {v.title}, {v.company}, {v.salary.toLocaleString()} ₽
                {v.url && (
                  <a href={v.url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "10px", color: "blue" }}>
                    Ссылка
                  </a>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;

