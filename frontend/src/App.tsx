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
  const [authLoading, setAuthLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  // Функция для сохранения токена
  const saveTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("token_saved_at", Date.now().toString());
  };

  // Функция для получения refresh token
  const getRefreshToken = () => {
    return localStorage.getItem("refresh_token");
  };

  // Функция для очистки токенов
  const clearTokens = () => {
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token_saved_at");
  };

  // Функция для обновления access token
  const refreshAccessToken = async (): Promise<boolean> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${refreshToken}`
        },
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        // Если бэкенд возвращает новый access token
        if (data.access_token) {
          saveTokens(data.access_token, data.refresh_token);
        }
        return true;
      } else {
        clearTokens();
        return false;
      }
    } catch (error) {
      console.error("Ошибка обновления токена:", error);
      clearTokens();
      return false;
    }
  };

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
        body: new URLSearchParams({ username: email, password, grant_type: "password" }),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        
        // Сохраняем refresh token
        saveTokens(data.access_token, data.refresh_token);
        
        setIsAuthenticated(true);
        fetchHHVacancies();
        alert("Вы успешно вошли");
      } else {
        const errorData = await res.json().catch(() => ({ detail: "Ошибка входа" }));
        alert(`Ошибка входа: ${errorData.detail || "Проверь логин или пароль"}`);
        return;
      }

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
    if (isAuthenticated) {
      const timeoutId = setTimeout(() => {
        fetchHHVacancies();
      }, 800);

      return () => clearTimeout(timeoutId);
    }
  }, [title, company, minSalary, isAuthenticated, authLoading]);

  useEffect(() => {
    const checkAuth = async () => {
      setAuthLoading(true);
      // try {
      //   const res = await fetch(`${API_URL}/auth/me`, {
      //     credentials: "include", // важно, чтобы cookie отправились
      //   });
      //   setIsAuthenticated(res.ok);

      //   if (res.ok) {
      //     fetchHHVacancies();
      //   }

      // } catch {
      //   setIsAuthenticated(false);
      // }
      try {
        // Сначала пробуем проверить текущую сессию через /auth/me
        const res = await fetch(`${API_URL}/auth/me`, {
          credentials: "include",
        });

        if (res.ok) {
          setIsAuthenticated(true);
          fetchHHVacancies();
        } else if (res.status === 401) {
          // Если access token истек, пробуем обновить его
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            setIsAuthenticated(true);
            fetchHHVacancies();
          } else {
            setIsAuthenticated(false);
            clearTokens();
          }
        } else {
          setIsAuthenticated(false);
          clearTokens();
        }
      } catch (error) {
        console.error("Ошибка проверки авторизации:", error);
        setIsAuthenticated(false);
        clearTokens();
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Ошибка при выходе:", error);
    } finally {
      clearTokens();
      setIsAuthenticated(false);
      window.location.reload();
    }
  };

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

      {!isAuthenticated ? (
        <div
          style={{
            width: "60vw",
            height: "75vh",
            backgroundColor: "#333333ff",
            boxShadow: "0px 0px 13px 13px #000000",
            border: "1px solid black",
            borderColor: "#333333ff",
            borderRadius: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <h1 style={{ 
              margin: "0 0 8px 0", 
              fontSize: "78px", 
              fontWeight: "700",
              background: "linear-gradient(135deg, #ead410ff 0%, #dc5e0fff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>
              Joby
            </h1>
            <p style={{ 
              margin: "0", 
              color: "#ffffffff",
              fontSize: "16px",
              fontStyle: "italic"
            }}>
              Найди работу мечты
            </p>
          </div>
          <div
            style={{
              display: "flex",
              background: "#b3b3b3ff",
              borderRadius: "12px",
              padding: "4px",
              marginBottom: "30px",
            }}
          >
            <button
              onClick={() => setMode("login")}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: "8px",
                border: "none",
                background: mode === "login" ? "white" : "transparent",
                color: mode === "login" ? "#333" : "#666",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.55s ease",
                boxShadow: mode === "login" ? "0 2px 8px rgba(0, 0, 0, 0.1)" : "none",
              }}
            >
              Вход
            </button>
            <button
              onClick={() => setMode("register")}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: "8px",
                border: "none",
                background: mode === "register" ? "white" : "transparent",
                color: mode === "register" ? "#333" : "#666",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.55s ease",
                boxShadow: mode === "register" ? "0 2px 8px rgba(255, 255, 255, 0.4)" : "none",
              }}
            >
              Регистрация
            </button>
          </div>

          <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid #e1e5e9",
                  fontSize: "16px",
                  outline: "none",
                  transition: "all 0.3s ease",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#ef9f25ff";
                  e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e1e5e9";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          <div>
              <input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid #e1e5e9",
                  fontSize: "16px",
                  outline: "none",
                  transition: "all 0.3s ease",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#ef9f25ff";
                  e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e1e5e9";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          <button
              onClick={handleAuth}
              style={{
                width: "20%",
                padding: "16px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #f5ab17ff 0%, #e0b60aff 100%)",
                color: "white",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease",
                marginTop: "8px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 15px rgba(208, 120, 58, 0.84)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 0 10px rgba(140, 119, 104, 0.94)";
              }}
            >
              {mode === "login" ? "Войти в аккаунт" : "Создать аккаунт"}
            </button>
        </div>
      ) : (
        <>
          <div style={{
            textAlign: "left",
            marginBottom: "30px",
            alignItems:"left"
            }}>
            <h1 style={{ 
              margin: "0 0 8px 0", 
              fontSize: "78px", 
              fontWeight: "700",
              background: "linear-gradient(135deg, #ead410ff 0%, #dc5e0fff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>
              Joby
            </h1>
          </div>
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
              onClick={handleLogout}
              // onClick={async () => {
              //   // setToken(null);
              //   // localStorage.removeItem("token");
              //   await fetch(`${API_URL}/auth/logout`, {
              //     method: "POST",
              //     credentials: "include",
              //   });
              //   setIsAuthenticated(false);
              //   window.location.reload();
              // }}
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

