import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";

const API_URL = "http://localhost:8000";

interface Vacancy {
  id: number;
  title: string;
  company: string;
  salary: number;
  salaryTo?: number | null;
  currency?: string;
  url?: string;
}

export default function PublicHomePage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canonical = "http://localhost:5173/";
  const pageTitle = title
    ? `Вакансии ${title} — Joby`
    : "Поиск вакансий — Joby";
  const pageDescription = company
    ? `Поиск вакансий по запросу "${title || "разработчик"}" в компании ${company}.`
    : "Поиск вакансий и просмотр предложений работы в Joby.";

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Joby",
      url: canonical,
      potentialAction: {
        "@type": "SearchAction",
        target: `${canonical}?search={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    }),
    []
  );

  const fetchVacancies = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (title.trim()) params.set("title", title.trim());
      if (company.trim()) params.set("company", company.trim());
      if (minSalary.trim()) params.set("min_salary", minSalary.trim());

      const res = await fetch(`${API_URL}/external/hh/vacancies?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Не удалось получить вакансии");
      }

      const data = await res.json();
      setVacancies(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setVacancies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVacancies();
  }, []);

  return (
    <>
      <Seo
        title={pageTitle}
        description={pageDescription}
        canonical={canonical}
        jsonLd={jsonLd}
      />

      <main style={{ width: "100%", maxWidth: "1200px", margin: "0 auto", padding: "20px", color: "white" }}>
        <Link to="/login">Войти</Link>
        <header>
          <h1>Поиск вакансий</h1>
          <p>Найдите подходящие вакансии по названию, компании и зарплате.</p>
        </header>

        <section aria-labelledby="search-filters">
          <h2 id="search-filters">Фильтры поиска</h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
            marginBottom: "20px"
          }}>
            <label>
              <span>Название вакансии</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Python Developer"
              />
            </label>

            <label>
              <span>Компания</span>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Яндекс"
              />
            </label>

            <label>
              <span>Минимальная зарплата</span>
              <input
                type="number"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                placeholder="150000"
              />
            </label>

            <div style={{ display: "flex", alignItems: "end" }}>
              <button onClick={fetchVacancies}>Найти</button>
            </div>
          </div>
        </section>

        <section aria-labelledby="search-results">
          <h2 id="search-results">Результаты поиска</h2>

          {loading && <p>Загрузка вакансий...</p>}
          {error && <p style={{ color: "tomato" }}>{error}</p>}
          {!loading && !error && vacancies.length === 0 && (
            <p>По вашему запросу ничего не найдено.</p>
          )}

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "16px"
          }}>
            {vacancies.map((vacancy) => (
              <article
                key={vacancy.id}
                style={{
                  background: "#333",
                  borderRadius: "10px",
                  padding: "16px"
                }}
              >
                <h3>{vacancy.title}</h3>
                <p>{vacancy.company}</p>
                <p>
                  {vacancy.salary.toLocaleString()} ₽
                  {vacancy.salaryTo ? ` - ${vacancy.salaryTo.toLocaleString()} ₽` : ""}
                </p>
                {vacancy.url && (
                  <a
                    href={vacancy.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Открыть вакансию
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}