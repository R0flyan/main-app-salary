import { Helmet } from "react-helmet-async";

interface LoginPageProps {
  email: string;
  password: string;
  mode: "login" | "register";
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setMode: (value: "login" | "register") => void;
  handleAuth: () => void;
}

export default function LoginPage({
  email,
  password,
  mode,
  setEmail,
  setPassword,
  setMode,
  handleAuth,
}: LoginPageProps) {
  return (
    <>
      <Helmet>
        <title>{mode === "login" ? "Вход — Joby" : "Регистрация — Joby"}</title>
        <meta
          name="description"
          content={mode === "login" ? "Вход в личный кабинет Joby." : "Регистрация в Joby."}
        />
        <meta name="robots" content="noindex,nofollow" />
        <link rel="canonical" href={`http://localhost:5173/login`} />
      </Helmet>
    <div style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, rgb(57, 57, 57), rgb(134, 134, 133))"
      }}>
        <main style={{
            width: "60vw",
            minHeight: "75vh",
            background: "linear-gradient(135deg, rgb(173, 173, 172), rgb(82, 82, 81))",
            borderRadius: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            alignItems: "center",
            justifyContent: "center",
            padding: "30px"
        }}>
            <header style={{ textAlign: "center", marginBottom: "30px" }}>
            <h1 style={{ marginBottom: "8px" }}>Joby</h1>
            <p>Найди работу мечты</p>
            </header>

            <section aria-labelledby="auth-title" style={{ width: "100%", maxWidth: "500px" }}>
            <h2 style={{ textAlign: "center" }} id="auth-title">{mode === "login" ? "Вход" : "Регистрация"}</h2>

            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", justifyContent: "center" }}>
                <button onClick={() => setMode("login")}>Вход</button>
                <button onClick={() => setMode("register")}>Регистрация</button>
            </div>

            <div style={{ display: "grid", gap: "12px", justifyContent: "center"}}>
                <label>
                <span>Email</span>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                </label>

                <label>
                <span>Пароль</span>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                </label>

                <button onClick={handleAuth}>
                {mode === "login" ? "Войти" : "Создать аккаунт"}
                </button>
            </div>
            </section>
        </main>
      </div>
    </>
  );
}