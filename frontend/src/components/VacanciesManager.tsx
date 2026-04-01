import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  Vacancy,
  VacancyFile,
  PaginatedVacancyResponse,
  SortBy,
  SortOrder,
  VacancyStatus,
  EmploymentType,
  WorkFormat,
} from "../types/vacancy";

const API_URL = "http://localhost:8000";

const emptyForm = {
  title: "",
  company: "",
  salary: "",
  description: "",
  status: "draft" as VacancyStatus,
  employment_type: "" as EmploymentType | "",
  work_format: "" as WorkFormat | "",
};

export default function VacanciesManager() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<Vacancy[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [files, setFiles] = useState<VacancyFile[]>([]);
  const [fileUploading, setFileUploading] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const search = searchParams.get("search") ?? "";
  const company = searchParams.get("company") ?? "";
  const minSalary = searchParams.get("min_salary") ?? "";
  const status = searchParams.get("status") ?? "";
  const sortBy = (searchParams.get("sort_by") as SortBy) || "created_at";
  const sortOrder = (searchParams.get("sort_order") as SortOrder) || "desc";
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("page_size") ?? "5");

  const updateQuery = (patch: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });

    if (!next.get("page")) next.set("page", "1");
    if (!next.get("page_size")) next.set("page_size", "5");
    if (!next.get("sort_by")) next.set("sort_by", "created_at");
    if (!next.get("sort_order")) next.set("sort_order", "desc");

    setSearchParams(next, { replace: true });
  };

  const fetchVacancies = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (company) params.set("company", company);
      if (minSalary) params.set("min_salary", minSalary);
      if (status) params.set("status", status);
      params.set("sort_by", sortBy);
      params.set("sort_order", sortOrder);
      params.set("page", String(page));
      params.set("page_size", String(pageSize));

      const res = await fetch(`${API_URL}/vacancies?${params.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Не удалось загрузить вакансии");
      }

      const data: PaginatedVacancyResponse = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVacancies();
  }, [search, company, minSalary, status, sortBy, sortOrder, page, pageSize]);

  const validateForm = () => {
    if (form.title.trim().length < 2) return "Название должно быть не короче 2 символов";
    if (form.company.trim().length < 2) return "Компания должна быть не короче 2 символов";
    if (!form.salary || Number(form.salary) < 0) return "Зарплата должна быть 0 или больше";
    return "";
  };

  const saveVacancy = async () => {
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    const payload = {
      title: form.title.trim(),
      company: form.company.trim(),
      salary: Number(form.salary),
      description: form.description.trim() || null,
      status: form.status,
      employment_type: form.employment_type || null,
      work_format: form.work_format || null,
    };

    const url = editingId ? `${API_URL}/vacancies/${editingId}` : `${API_URL}/vacancies/`;
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      alert(text || "Ошибка сохранения");
      return;
    }

    setForm(emptyForm);
    setEditingId(null);
    fetchVacancies();
  };

  const startEdit = (vacancy: Vacancy) => {
    setEditingId(vacancy.id);
    setForm({
      title: vacancy.title,
      company: vacancy.company,
      salary: String(vacancy.salary),
      description: vacancy.description || "",
      status: vacancy.status,
      employment_type: (vacancy.employment_type || "") as EmploymentType | "",
      work_format: (vacancy.work_format || "") as WorkFormat | "",
    });
  };

  const deleteVacancy = async (id: number) => {
    if (!window.confirm("Удалить вакансию?")) return;

    const res = await fetch(`${API_URL}/vacancies/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text();
      alert(text || "Ошибка удаления");
      return;
    }

    if (selectedVacancy?.id === id) {
      setSelectedVacancy(null);
      setFiles([]);
    }

    fetchVacancies();
  };

  const loadFiles = async (vacancyId: number) => {
    const res = await fetch(`${API_URL}/vacancies/${vacancyId}/files`, {
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text();
      alert(text || "Не удалось загрузить файлы");
      return;
    }

    const data: VacancyFile[] = await res.json();
    setFiles(data);
  };

  const selectVacancy = async (vacancy: Vacancy) => {
    setSelectedVacancy(vacancy);
    await loadFiles(vacancy.id);
  };

  const uploadFile = async (file: File) => {
    if (!selectedVacancy) return;

    const allowed = ["application/pdf", "image/png", "image/jpeg"];
    if (!allowed.includes(file.type)) {
      alert("Разрешены только PDF, PNG, JPEG");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Файл слишком большой. Максимум 5 МБ");
      return;
    }

    const formData = new FormData();
    formData.append("upload", file);

    setFileUploading(true);
    try {
      const res = await fetch(`${API_URL}/vacancies/${selectedVacancy.id}/files`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        alert(text || "Ошибка загрузки файла");
        return;
      }

      await loadFiles(selectedVacancy.id);
    } finally {
      setFileUploading(false);
    }
  };

  const openFile = async (fileId: number) => {
    const res = await fetch(`${API_URL}/vacancies/files/${fileId}/download-url`, {
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text();
      alert(text || "Не удалось получить ссылку");
      return;
    }

    const data = await res.json();
    window.open(data.url, "_blank");
  };

  const deleteFile = async (fileId: number) => {
    const res = await fetch(`${API_URL}/vacancies/files/${fileId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text();
      alert(text || "Не удалось удалить файл");
      return;
    }

    if (selectedVacancy) {
      await loadFiles(selectedVacancy.id);
    }
  };

  const pageInfo = useMemo(() => `${page} / ${pages}`, [page, pages]);

  return (
    <div style={{ width: "100%", maxWidth: "1200px", marginTop: 30, color: "white" }}>
      <h2>Управление вакансиями</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <input
          value={search}
          placeholder="Поиск"
          onChange={(e) => updateQuery({ search: e.target.value, page: 1 })}
        />
        <input
          value={company}
          placeholder="Компания"
          onChange={(e) => updateQuery({ company: e.target.value, page: 1 })}
        />
        <input
          type="number"
          value={minSalary}
          placeholder="Мин. зарплата"
          onChange={(e) => updateQuery({ min_salary: e.target.value, page: 1 })}
        />
        <select value={status} onChange={(e) => updateQuery({ status: e.target.value, page: 1 })}>
          <option value="">Все статусы</option>
          <option value="draft">draft</option>
          <option value="published">published</option>
          <option value="archived">archived</option>
        </select>
        <select value={sortBy} onChange={(e) => updateQuery({ sort_by: e.target.value, page: 1 })}>
          <option value="created_at">Сначала новые</option>
          <option value="salary">Зарплата</option>
          <option value="title">Название</option>
          <option value="company">Компания</option>
        </select>
        <select value={sortOrder} onChange={(e) => updateQuery({ sort_order: e.target.value, page: 1 })}>
          <option value="desc">DESC</option>
          <option value="asc">ASC</option>
        </select>
      </div>

      <div style={{ background: "#2f2f2f", padding: 16, borderRadius: 10, marginBottom: 20 }}>
        <h3>{editingId ? "Редактирование вакансии" : "Новая вакансия"}</h3>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={form.title}
            placeholder="Название"
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            value={form.company}
            placeholder="Компания"
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
          <input
            type="number"
            value={form.salary}
            placeholder="Зарплата"
            onChange={(e) => setForm({ ...form, salary: e.target.value })}
          />
          <textarea
            value={form.description}
            placeholder="Описание"
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as VacancyStatus })}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
          <select
            value={form.employment_type}
            onChange={(e) => setForm({ ...form, employment_type: e.target.value as EmploymentType | "" })}
          >
            <option value="">Тип занятости</option>
            <option value="full">full</option>
            <option value="part">part</option>
            <option value="project">project</option>
            <option value="internship">internship</option>
          </select>
          <select
            value={form.work_format}
            onChange={(e) => setForm({ ...form, work_format: e.target.value as WorkFormat | "" })}
          >
            <option value="">Формат работы</option>
            <option value="office">office</option>
            <option value="remote">remote</option>
            <option value="hybrid">hybrid</option>
          </select>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={saveVacancy}>{editingId ? "Сохранить" : "Создать"}</button>
            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Отмена
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        Всего: {total}
      </div>

      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: "tomato" }}>{error}</p>}

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((vacancy) => (
          <div key={vacancy.id} style={{ background: "#333", padding: 16, borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: "0 0 8px 0" }}>{vacancy.title}</h3>
                <div>{vacancy.company}</div>
                <div>{vacancy.salary.toLocaleString()} ₽</div>
                <div>Статус: {vacancy.status}</div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "start", flexWrap: "wrap" }}>
                <button onClick={() => startEdit(vacancy)}>Редактировать</button>
                <button onClick={() => selectVacancy(vacancy)}>Файлы</button>
                <button onClick={() => deleteVacancy(vacancy.id)}>Удалить</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 20 }}>
        <button disabled={page <= 1} onClick={() => updateQuery({ page: page - 1 })}>
          Назад
        </button>
        <span>{pageInfo}</span>
        <button disabled={page >= pages} onClick={() => updateQuery({ page: page + 1 })}>
          Вперёд
        </button>
      </div>

      {selectedVacancy && (
        <div style={{ marginTop: 30, background: "#2c2c2c", padding: 16, borderRadius: 10 }}>
          <h3>Файлы вакансии: {selectedVacancy.title}</h3>

          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
            }}
          />
          {fileUploading && <p>Файл загружается...</p>}

          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {files.length === 0 && <div>Файлы не прикреплены</div>}
            {files.map((file) => (
              <div
                key={file.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                  background: "#3a3a3a",
                  padding: 10,
                  borderRadius: 8,
                }}
              >
                <div>
                  <div>{file.original_name}</div>
                  <div style={{ fontSize: 12, color: "#bbb" }}>
                    {file.mime_type} · {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => openFile(file.id)}>Открыть</button>
                  <button onClick={() => deleteFile(file.id)}>Удалить</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}