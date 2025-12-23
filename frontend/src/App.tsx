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
  const [showProfile, setShowProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const API_URL = "http://localhost:8000"


  // Функция для обновления access token
  const refreshAccessToken = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    return res.ok;
  } catch (error) {
    console.error("Ошибка обновления токена:", error);
    return false;
  }
};

  const fetchUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      credentials: "include", // ОЧЕНЬ ВАЖНО
      mode: "cors", // Явно указываем режим CORS
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Запрос к /auth/me, статус:", res.status);
    
    if (res.ok) {
      const data = await res.json();
      return data;
    } else {
      console.log("Ошибка авторизации, статус:", res.status);
      return null;
    }
  } catch (error) {
    console.error("Ошибка загрузки профиля:", error);
    return null;
  }
};

  // Обновление профиля
  const updateProfile = async (profileData: Partial<UserProfile>) => {
  try {
    const preparedData: Record<string, string | number | null> = {};
    
    for (const [key, value] of Object.entries(profileData)) {
      if (key === 'experience_years' || key === 'desired_salary') {
        preparedData[key] = value === '' || value === null ? null : Number(value);
      } else {
        preparedData[key] = value === '' ? null : value;
      }
    }

    // Очистите пустые значения
    Object.keys(preparedData).forEach(key => {
      if (preparedData[key] === undefined || preparedData[key] === null) {
        delete preparedData[key];
      }
    });

    console.log("Отправляемые данные:", preparedData);

    const res = await fetch(`${API_URL}/auth/profile`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json"
      },
      credentials: "include",  // Важно! Отправляет куки с access token
      body: JSON.stringify(preparedData),
    });

    console.log("Статус ответа:", res.status);

    if (res.ok) {
      const data = await res.json();
      setUserProfile(data);
      alert("Профиль успешно обновлен!");
      return true;
    } else {
      const errorText = await res.text();
      console.error("Ошибка сервера:", errorText);
      
      try {
        const error = JSON.parse(errorText);
        alert(`Ошибка: ${error.detail || "Не удалось обновить профиль"}`);
      } catch {
        alert(`Ошибка ${res.status}: ${errorText}`);
      }
      
      // Если 401, возможно токен истек
      if (res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Повторяем запрос после обновления токена
          return await updateProfile(profileData);
        } else {
          setIsAuthenticated(false);
        }
      }
      
      return false;
    }
  } catch (error) {
    console.error("Ошибка обновления профиля:", error);
    alert("Ошибка подключения к серверу");
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
        
        setIsAuthenticated(true);
        const profile = await fetchUserProfile();
        setUserProfile(profile);
        fetchHHVacancies();
        alert("Вы успешно вошли");
      } else {
        const errorData = await res.json().catch(() => ({ detail: "Ошибка входа" }));
        alert(`Ошибка входа: ${errorData.detail || "Проверь логин или пароль"}`);
        return;
      }

    } catch (err) {
      console.error(err);
      alert("Ошибка подключения к серверу");
    }
  };

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

  interface UserProfile {
    id: number;
    email: string;
    full_name?: string;
    phone?: string;
    city?: string;
    position?: string;
    experience_years?: number | null;
    skills?: string; // JSON строка
    desired_salary?: number | null;
    work_format?: string;
    employment_type?: string;
    about?: string;
    created_at: string;
  }


  const handleClear = () => {
    setTitle("");
    setCompany("");
    setMinSalary("");
  };


  const fetchHHVacancies = async (useProfile = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Используем данные профиля для поиска, если включена опция
      let searchTitle = title;
      let searchMinSalary = minSalary;
      
      if (useProfile && userProfile) {
        if (!searchTitle && userProfile.position) {
          searchTitle = userProfile.position;
        }
        if (!searchMinSalary && userProfile.desired_salary) {
          searchMinSalary = userProfile.desired_salary.toString();
        }
      }
      
      if (!searchTitle.trim() && !company.trim() && !searchMinSalary.trim()) {
        params.append("text", "разработчик");
      } else {
        let searchText = "";
        if (searchTitle.trim()) searchText += searchTitle.trim();
        if (company.trim()) {
          if (searchText) searchText += " ";
          searchText += company.trim();
        }
        
        if (searchText) params.append("text", searchText);
      }
      
      params.append("per_page", "20");
      
      if (searchMinSalary.trim()) {
        params.append("salary", searchMinSalary);
      }
      params.append("currency", "RUR");
      params.append("only_with_salary", "true");

      const res = await fetch(`https://api.hh.ru/vacancies?${params.toString()}`);
      if (!res.ok) throw new Error("Ошибка загрузки вакансий hh.ru");

      const data = await res.json();

      // Дополнительная фильтрация по профилю
      const hhData: Vacancy[] = data.items
        .filter((v: HHVacancy) => {
          if (!v.salary || v.salary.currency !== "RUR" || !v.salary.from || v.salary.from === 0) {
            return false;
          }

          // Фильтр по минимальной зарплате
          const minSalaryNum = searchMinSalary.trim() ? Number(searchMinSalary) : 0;
          if (minSalaryNum > 0 && v.salary.from < minSalaryNum) return false;

          // Фильтр по компании
          if (company.trim()) {
            const companyName = v.employer?.name?.toLowerCase() || "";
            if (!companyName.includes(company.toLowerCase().trim())) {
              return false;
            }
          }

          // Фильтр по названию
          if (searchTitle.trim()) {
            const vacancyTitle = v.name.toLowerCase();
            if (!vacancyTitle.includes(searchTitle.toLowerCase().trim())) {
              return false;
            }
          }

          // Дополнительная фильтрация по данным профиля
          if (useProfile && userProfile) {
            // Можно добавить фильтры по формату работы, типу занятости и т.д.
            // Например, если в профиле указан город, искать вакансии в этом городе
            // или фильтровать по нужным навыкам
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
    try {
      // Сначала пробуем проверить текущую сессию через /auth/me
      const res = await fetch(`${API_URL}/auth/me`, {
        credentials: "include",
      });

      if (res.ok) {
        const userData = await res.json(); // Добавьте эту строку
        setUserProfile(userData);
        setIsAuthenticated(true);
        fetchHHVacancies();
      } else if (res.status === 401) {
        // Если access token истек, пробуем обновить его
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          const profileData = await fetchUserProfile();
          setUserProfile(profileData);
          setIsAuthenticated(true);
          fetchHHVacancies();
        } else {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Ошибка проверки авторизации:", error);
      setIsAuthenticated(false);
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
      setIsAuthenticated(false);
      setUserProfile(null);
      window.location.reload();
    }
  };

  const ProfileForm = () => {
    const [formData, setFormData] = useState({
      full_name: userProfile?.full_name || "",
      phone: userProfile?.phone || "",
      city: userProfile?.city || "",
      position: userProfile?.position || "",
      experience_years: userProfile?.experience_years?.toString() || "",
      skills: userProfile?.skills || "",
      desired_salary: userProfile?.desired_salary?.toString() || "",
      work_format: userProfile?.work_format || "office",
      employment_type: userProfile?.employment_type || "full",
      about: userProfile?.about || "",
    });
  
    useEffect(() => {
      if (userProfile) {
        setFormData({
          full_name: userProfile.full_name || "",
          phone: userProfile.phone || "",
          city: userProfile.city || "",
          position: userProfile.position || "",
          experience_years: userProfile.experience_years?.toString() || "",
          skills: userProfile.skills || "",
          desired_salary: userProfile.desired_salary?.toString() || "",
          work_format: userProfile.work_format || "office",
          employment_type: userProfile.employment_type || "full",
          about: userProfile.about || "",
        });
      }
    }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Используем Record с конкретными типами
  const dataToSend: Record<string, string | number | null> = {};
  
  // Обрабатываем каждое поле отдельно с правильной типизацией
  const formFields = {
    full_name: formData.full_name,
    phone: formData.phone,
    city: formData.city,
    position: formData.position,
    experience_years: formData.experience_years,
    skills: formData.skills,
    desired_salary: formData.desired_salary,
    work_format: formData.work_format,
    employment_type: formData.employment_type,
    about: formData.about,
  };
  
  // Преобразуем данные с учетом типов
  Object.entries(formFields).forEach(([key, value]) => {
    if (key === 'experience_years' || key === 'desired_salary') {
      // Для числовых полей
      dataToSend[key] = value === '' ? null : (value ? parseInt(value as string) || null : null);
    } else {
      // Для строковых полей
      dataToSend[key] = value === '' ? null : value;
    }
  });
  
  console.log("Отправка данных профиля:", dataToSend);
  
  const success = await updateProfile(dataToSend as Partial<UserProfile>);
  if (success) {
    // Обновляем локальный профиль
    const updatedProfile = await fetchUserProfile();
    setUserProfile(updatedProfile);
    setShowProfile(false);
  }
};

    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}>
        <div style={{
          background: "#333333ff",
          padding: "30px",
          borderRadius: "15px",
          width: "90%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0px 0px 20px rgba(234, 212, 16, 0.5)",
          border: "2px solid #ead410ff",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ color: "#ead410ff", margin: 0 }}>Личный кабинет</h2>
            <button
              onClick={() => setShowProfile(false)}
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gap: "15px" }}>
              <div>
                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>
                  ФИО *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #666",
                    background: "#222",
                    color: "#fff",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>
                  Телефон
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #666",
                    background: "#222",
                    color: "#fff",
                  }}
                />
              </div>

              <div>
                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>
                  Город
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #666",
                    background: "#222",
                    color: "#fff",
                  }}
                />
              </div>

              <div>
                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>
                  Должность *
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #666",
                    background: "#222",
                    color: "#fff",
                  }}
                  placeholder="Например: Python разработчик"
                  required
                />
              </div>

              <div>
                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>
                  Опыт работы (лет)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.experience_years}
                  onChange={(e) => setFormData({...formData, experience_years: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #666",
                    background: "#222",
                    color: "#fff",
                  }}
                />
              </div>

              <div>
                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>
                  Желаемая зарплата (руб)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.desired_salary}
                  onChange={(e) => setFormData({...formData, desired_salary: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #666",
                    background: "#222",
                    color: "#fff",
                  }}
                  placeholder="Например: 150000"
                />
              </div>

              <div>
                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>
                  Формат работы
                </label>
                <select
                  value={formData.work_format}
                  onChange={(e) => setFormData({...formData, work_format: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #666",
                    background: "#222",
                    color: "#fff",
                  }}
                >
                  <option value="office">Офис</option>
                  <option value="remote">Удалённо</option>
                  <option value="hybrid">Гибрид</option>
                  <option value="any">Не важно</option>
                </select>
              </div>

              <div>
                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>
                  Тип занятости
                </label>
                <select
                  value={formData.employment_type}
                  onChange={(e) => setFormData({...formData, employment_type: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #666",
                    background: "#222",
                    color: "#fff",
                  }}
                >
                  <option value="full">Полная занятость</option>
                  <option value="part">Частичная занятость</option>
                  <option value="project">Проектная работа</option>
                  <option value="internship">Стажировка</option>
                </select>
              </div>

              <div>
                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>
                  Навыки (через запятую)
                </label>
                <textarea
                  value={formData.skills}
                  onChange={(e) => setFormData({...formData, skills: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #666",
                    background: "#222",
                    color: "#fff",
                    minHeight: "80px",
                  }}
                  placeholder="Python, JavaScript, React, SQL, Docker"
                />
              </div>

              <div>
                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>
                  О себе
                </label>
                <textarea
                  value={formData.about}
                  onChange={(e) => setFormData({...formData, about: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #666",
                    background: "#222",
                    color: "#fff",
                    minHeight: "100px",
                  }}
                  placeholder="Расскажите о своих профессиональных целях и опыте..."
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "6px",
                  border: "none",
                  background: "linear-gradient(135deg, #f5ab17ff 0%, #e0b60aff 100%)",
                  color: "white",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Сохранить
              </button>
              <button
                type="button"
                onClick={() => setShowProfile(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #666",
                  background: "transparent",
                  color: "#fff",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    );
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
            width: "100%",
            maxWidth: "1200px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
            flexWrap: "wrap",
            gap: "20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <h1 style={{ 
                margin: 0, 
                fontSize: "48px", 
                fontWeight: "700",
                background: "linear-gradient(135deg, #ead410ff 0%, #dc5e0fff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}>
                Joby
              </h1>
              
              {userProfile && (
                <div style={{
                  padding: "10px 20px",
                  background: "rgba(234, 212, 16, 0.1)",
                  borderRadius: "8px",
                  border: "1px solid rgba(234, 212, 16, 0.3)",
                  color: "#fff",
                }}>
                  <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                    {userProfile.full_name || userProfile.email}
                  </div>
                  {userProfile.position && (
                    <div style={{ fontSize: "14px", color: "#aaa" }}>
                      {userProfile.position}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowProfile(true)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "6px",
                  border: "none",
                  background: "linear-gradient(135deg, #f5ab17ff 0%, #e0b60aff 100%)",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Личный кабинет
              </button>
              
              <button
                onClick={() => fetchHHVacancies(true)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "6px",
                  border: "none",
                  background: "linear-gradient(135deg, #708964ff 0%, #5a7249ff 100%)",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
                title="Искать по данным профиля"
              >
                Искать по моему профилю
              </button>
              
              <button
                onClick={handleLogout}
                style={{
                  padding: "10px 20px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#444",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Выйти
              </button>
            </div>
          </div>

          <h3 style={{ color: "white", marginBottom: "20px" }}>Параметры поиска:</h3>

          <div
            style={{
              display: "grid",
              gap: "10px",
              justifyContent: "center",
              marginBottom: "30px",
              width: "100%",
              maxWidth: "800px",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            }}
          >
            <input
              type="text"
              placeholder="Название вакансии"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #666",
                background: "#222",
                color: "white",
              }}
            />
            <input
              type="text"
              placeholder="Компания"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              style={{
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #666",
                background: "#222",
                color: "white",
              }}
            />
            <input
              type="number"
              placeholder="Мин. зарплата"
              value={minSalary}
              onChange={(e) => setMinSalary(e.target.value)}
              style={{
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #666",
                background: "#222",
                color: "white",
              }}
            />
            <button
              onClick={() => fetchHHVacancies(false)}
              style={{
                padding: "12px 20px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#708964ff",
                color: "white",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Поиск
            </button>
            <button
              onClick={handleClear}
              style={{
                padding: "12px 20px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#860e0eff",
                color: "white",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Очистить фильтры
            </button>
          </div>

          {loading && <p style={{ color: "white", textAlign: "center" }}>Загрузка вакансий...</p>}
          
          <div style={{ width: "100%", maxWidth: "1200px" }}>
            {vacancies.length === 0 && !loading && (
              <p style={{ color: "white", textAlign: "center" }}>
                Нет подходящих вакансий. Попробуйте изменить параметры поиска.
              </p>
            )}
            
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
              gap: "20px" 
            }}>
              {vacancies.map((v) => (
                <div 
                  key={v.id}
                  style={{ 
                    background: "#333",
                    padding: "20px",
                    borderRadius: "10px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    border: "1px solid #444",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    cursor: "pointer",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-5px)";
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(234, 212, 16, 0.2)";
                    e.currentTarget.style.borderColor = "#ead410ff";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
                    e.currentTarget.style.borderColor = "#444";
                  }}
                  onClick={() => window.open(v.url, '_blank')}
                >
                  <h3 style={{ margin: "0 0 10px 0", color: "#fff" }}>
                    {v.title}
                  </h3>
                  <p style={{ margin: "0 0 10px 0", color: "#aaa" }}>
                    {v.company}
                  </p>
                  <p style={{ margin: "0 0 15px 0", color: "#4CAF50", fontWeight: "bold" }}>
                    {v.salary.toLocaleString()} ₽
                    {v.salaryTo && ` - ${v.salaryTo.toLocaleString()} ₽`}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(v.url, '_blank');
                    }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "6px",
                      border: "none",
                      background: "linear-gradient(135deg, #f5ab17ff 0%, #e0b60aff 100%)",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "14px",
                    }}
                  >
                    Открыть на hh.ru
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Модальное окно профиля */}
      {showProfile && <ProfileForm />}
    </div>
  );
}

export default App;

