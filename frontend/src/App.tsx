// frontend/src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import PublicHomePage from "./pages/PublicHomePage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import VacanciesManager from "./components/VacanciesManager";
import { useEffect, useState } from "react";
import SalaryAnalysis from "./SalaryAnalysis";
import { useAuth } from './contexts/AuthContext';
import type { UserProfile } from './contexts/AuthContext';

function App() {
    const { 
        user, 
        isLoading: authLoading, 
        isAuthenticated, 
        login, 
        logout,
        updateUser,
        refreshToken 
    } = useAuth();
    
    //const [vacancies, setVacancies] = useState<Vacancy[]>([]);
    //const [title, setTitle] = useState("");
    //const [company, setCompany] = useState("");
    //const [minSalary, setMinSalary] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    //const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<"login" | "register">("login");
    const [showProfile, setShowProfile] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [usersList, setUsersList] = useState<UserProfile[]>([]);

    const API_URL = "http://localhost:8000";
    const isAdmin = user?.role === 'admin';

    // Функция для обновления профиля
    const updateProfile = async (profileData: Partial<UserProfile>) => {
        try {
            const preparedData: Record<string, string | number | null> = {};

            for (const [key, value] of Object.entries(profileData)) {
                if (key === 'experience_years' || key === 'desired_salary') {
                    preparedData[key] = value === '' || value === null ? null : Number(value);
                } else if (key !== 'role' && key !== 'id' && key !== 'email' && key !== 'created_at') {
                    preparedData[key] = value === '' ? null : value;
                }
            }

            Object.keys(preparedData).forEach(key => {
                if (preparedData[key] === undefined || preparedData[key] === null) {
                    delete preparedData[key];
                }
            });

            const res = await fetch(`${API_URL}/auth/profile`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(preparedData),
            });

            if (res.ok) {
                const data = await res.json();
                updateUser(data);
                alert("Профиль успешно обновлен!");
                return true;
            } else if (res.status === 401) {
                const refreshed = await refreshToken();
                if (refreshed) {
                    return await updateProfile(profileData);
                }
            }
            return false;
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

            // вход (логин) - используем функцию из контекста
            const success = await login(email, password);
            if (success) {
                //fetchHHVacancies();
                alert("Вы успешно вошли");
            } else {
                alert("Ошибка входа: Проверь логин или пароль");
            }
        } catch (err) {
            console.error(err);
            alert("Ошибка подключения к серверу");
        }
    };

    // interface Vacancy {
    //     id: number;
    //     title: string;
    //     company: string;
    //     salary: number;
    //     salaryTo?: number | null;
    //     currency?: string;
    //     url: string | undefined;
    // }

    // interface HHVacancy {
    //     id: string;
    //     name: string;
    //     employer?: { name: string };
    //     salary?: {
    //         from: number | null;
    //         to: number | null;
    //         currency?: string;
    //     };
    //     alternate_url: string;
    // }

    // const handleClear = () => {
    //     setTitle("");
    //     setCompany("");
    //     setMinSalary("");
    // };

    // const fetchHHVacancies = async (useProfile = false) => {
    //     setLoading(true);
    //     try {
    //         const params = new URLSearchParams();

    //         let searchTitle = title;
    //         let searchMinSalary = minSalary;

    //         if (useProfile && user) {
    //             if (!searchTitle && user.position) {
    //                 searchTitle = user.position;
    //             }
    //             if (!searchMinSalary && user.desired_salary) {
    //                 searchMinSalary = user.desired_salary.toString();
    //             }
    //         }

    //         if (!searchTitle.trim() && !company.trim() && !searchMinSalary.trim()) {
    //             params.append("text", "разработчик");
    //         } else {
    //             let searchText = "";
    //             if (searchTitle.trim()) searchText += searchTitle.trim();
    //             if (company.trim()) {
    //                 if (searchText) searchText += " ";
    //                 searchText += company.trim();
    //             }
    //             if (searchText) params.append("text", searchText);
    //         }

    //         params.append("per_page", "20");

    //         if (searchMinSalary.trim()) {
    //             params.append("salary", searchMinSalary);
    //         }
    //         params.append("currency", "RUR");
    //         params.append("only_with_salary", "true");

    //         const res = await fetch(`https://api.hh.ru/vacancies?${params.toString()}`);
    //         if (!res.ok) throw new Error("Ошибка загрузки вакансий hh.ru");

    //         const data = await res.json();

    //         const hhData: Vacancy[] = data.items
    //             .filter((v: HHVacancy) => {
    //                 if (!v.salary || v.salary.currency !== "RUR" || !v.salary.from || v.salary.from === 0) {
    //                     return false;
    //                 }
    //                 const minSalaryNum = searchMinSalary.trim() ? Number(searchMinSalary) : 0;
    //                 if (minSalaryNum > 0 && v.salary.from < minSalaryNum) return false;
    //                 if (company.trim()) {
    //                     const companyName = v.employer?.name?.toLowerCase() || "";
    //                     if (!companyName.includes(company.toLowerCase().trim())) return false;
    //                 }
    //                 if (searchTitle.trim()) {
    //                     const vacancyTitle = v.name.toLowerCase();
    //                     if (!vacancyTitle.includes(searchTitle.toLowerCase().trim())) return false;
    //                 }
    //                 return true;
    //             })
    //             .map((v: HHVacancy) => ({
    //                 id: Number(v.id),
    //                 title: v.name,
    //                 company: v.employer?.name || "Не указано",
    //                 salary: v.salary?.from ?? 0,
    //                 salaryTo: v.salary?.to || null,
    //                 currency: v.salary?.currency,
    //                 url: v.alternate_url,
    //             }));

    //         setVacancies(hhData);
    //     } catch (err) {
    //         console.error(err);
    //         alert("Ошибка получения вакансий");
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    // useEffect(() => {
    //     if (isAuthenticated) {
    //         const timeoutId = setTimeout(() => {
    //             fetchHHVacancies();
    //         }, 800);
    //         return () => clearTimeout(timeoutId);
    //     }
    // }, [title, company, minSalary, isAuthenticated]);

    const handleLogout = async () => {
        await logout();
        // logout из контекста уже очищает пользователя
    };

    // Загрузка списка пользователей для админа
    const fetchUsersList = async () => {
        if (!isAdmin) return;
        try {
            const res = await fetch(`${API_URL}/auth/users`, {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setUsersList(data);
            } else if (res.status === 403) {
                alert("Доступ запрещен. Требуются права администратора.");
            }
        } catch (error) {
            console.error("Ошибка загрузки пользователей:", error);
        }
    };

    // Изменение роли пользователя (только админ)
    const changeUserRole = async (userId: number, newRole: string) => {
        try {
            const res = await fetch(`${API_URL}/auth/users/${userId}/role`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ new_role: newRole }),
            });

            if (res.ok) {
                alert("Роль пользователя изменена");
                fetchUsersList();
            } else if (res.status === 403) {
                alert("Доступ запрещен. Требуются права администратора.");
            } else {
                alert("Ошибка при изменении роли");
            }
        } catch (error) {
            console.error("Ошибка:", error);
        }
    };

    // Компонент формы профиля
    const ProfileForm = () => {
        const [formData, setFormData] = useState({
            full_name: user?.full_name || "",
            phone: user?.phone || "",
            city: user?.city || "",
            position: user?.position || "",
            experience_years: user?.experience_years?.toString() || "",
            skills: user?.skills || "",
            desired_salary: user?.desired_salary?.toString() || "",
            work_format: user?.work_format || "office",
            employment_type: user?.employment_type || "full",
            about: user?.about || "",
        });

        useEffect(() => {
            if (user) {
                setFormData({
                    full_name: user.full_name || "",
                    phone: user.phone || "",
                    city: user.city || "",
                    position: user.position || "",
                    experience_years: user.experience_years?.toString() || "",
                    skills: user.skills || "",
                    desired_salary: user.desired_salary?.toString() || "",
                    work_format: user.work_format || "office",
                    employment_type: user.employment_type || "full",
                    about: user.about || "",
                });
            }
        }, [user]);

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();

            const dataToSend: Record<string, string | number | null> = {};
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

            Object.entries(formFields).forEach(([key, value]) => {
                if (key === 'experience_years' || key === 'desired_salary') {
                    dataToSend[key] = value === '' ? null : (value ? parseInt(value as string) || null : null);
                } else {
                    dataToSend[key] = value === '' ? null : value;
                }
            });

            const success = await updateProfile(dataToSend as Partial<UserProfile>);
            if (success) {
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
                            style={{ background: "none", border: "none", color: "#fff", fontSize: "24px", cursor: "pointer" }}
                        >
                            ×
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: "grid", gap: "15px" }}>
                            <div>
                                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>ФИО *</label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
                                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>Телефон</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>Город</label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
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
                                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>Должность *</label>
                                <input
                                    type="text"
                                    value={formData.position}
                                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
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
                                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>Опыт работы (лет)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    value={formData.experience_years}
                                    onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
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
                                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>Желаемая зарплата (руб)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.desired_salary}
                                    onChange={(e) => setFormData({ ...formData, desired_salary: e.target.value })}
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
                                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>Формат работы</label>
                                <select
                                    value={formData.work_format}
                                    onChange={(e) => setFormData({ ...formData, work_format: e.target.value })}
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
                                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>Тип занятости</label>
                                <select
                                    value={formData.employment_type}
                                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
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
                                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>Навыки (через запятую)</label>
                                <textarea
                                    value={formData.skills}
                                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
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
                                <label style={{ color: "#fff", display: "block", marginBottom: "5px" }}>О себе</label>
                                <textarea
                                    value={formData.about}
                                    onChange={(e) => setFormData({ ...formData, about: e.target.value })}
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

    // Админ-панель
    const AdminPanel = () => (
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
                maxWidth: "800px",
                maxHeight: "90vh",
                overflowY: "auto",
                border: "2px solid #ead410ff",
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h2 style={{ color: "#ead410ff", margin: 0 }}>Управление пользователями</h2>
                    <button
                        onClick={() => setShowAdminPanel(false)}
                        style={{ background: "none", border: "none", color: "#fff", fontSize: "24px", cursor: "pointer" }}
                    >
                        ×
                    </button>
                </div>

                <table style={{ width: "100%", color: "#fff", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid #666" }}>
                            <th style={{ padding: "10px", textAlign: "left" }}>ID</th>
                            <th style={{ padding: "10px", textAlign: "left" }}>Email</th>
                            <th style={{ padding: "10px", textAlign: "left" }}>Имя</th>
                            <th style={{ padding: "10px", textAlign: "left" }}>Роль</th>
                            <th style={{ padding: "10px", textAlign: "left" }}>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usersList.map((u) => (
                            <tr key={u.id} style={{ borderBottom: "1px solid #444" }}>
                                <td style={{ padding: "10px" }}>{u.id}</td>
                                <td style={{ padding: "10px" }}>{u.email}</td>
                                <td style={{ padding: "10px" }}>{u.full_name || "-"}</td>
                                <td style={{ padding: "10px" }}>{u.role}</td>
                                <td style={{ padding: "10px" }}>
                                    <select
                                        value={u.role}
                                        onChange={(e) => changeUserRole(u.id, e.target.value)}
                                        style={{
                                            padding: "5px 10px",
                                            borderRadius: "4px",
                                            background: "#222",
                                            color: "#fff",
                                            border: "1px solid #666",
                                        }}
                                    >
                                        <option value="user">user</option>
                                        <option value="admin">admin</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    if (authLoading) {
        return <div style={{ color: "white", textAlign: "center", padding: "50px" }}>Загрузка...</div>;
    }

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        fontFamily: "Arial, sans-serif",
        background: "#1f1f1f",
      }}
    >
      {authLoading ? (
        <div style={{ color: "white", textAlign: "center", padding: "50px" }}>
          Загрузка...
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<PublicHomePage />} />

          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <LoginPage
                  email={email}
                  password={password}
                  mode={mode}
                  setEmail={setEmail}
                  setPassword={setPassword}
                  setMode={setMode}
                  handleAuth={handleAuth}
                />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />

          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                <main
                  style={{
                    width: "100%",
                    maxWidth: "1200px",
                    margin: "0 auto",
                    padding: "20px",
                    color: "white",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                    <h1>Личный кабинет</h1>

                    <button
                      onClick={handleLogout}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "6px",
                        border: "none",
                        background: "#444",
                        color: "white",
                        cursor: "pointer",
                      }}
                    >
                      Выйти
                    </button>
                  </div>

                  <p>Управление внутренними вакансиями и профилем.</p>

                  <VacanciesManager />
                </main>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      )}

      {showProfile && <ProfileForm />}
      {showAnalysis && (
        <SalaryAnalysis
          vacancies={[]}
          onClose={() => setShowAnalysis(false)}
          API_URL={API_URL}
        />
      )}
      {showAdminPanel && <AdminPanel />}
    </div>
  );
}

export default App;