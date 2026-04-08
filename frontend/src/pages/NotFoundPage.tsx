import { Helmet } from "react-helmet-async";

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>Страница не найдена — Joby</title>
        <meta name="robots" content="noindex,nofollow" />
        <link rel="canonical" href="http://localhost:5173/404" />
      </Helmet>

      <main style={{ color: "white", textAlign: "center", padding: "60px" }}>
        <h1>404</h1>
        <p>Страница не найдена.</p>
      </main>
    </>
  );
}