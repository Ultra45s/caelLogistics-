import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware para JSON
  app.use(express.json());

  // Exemplo de rota de API (Backend Real)
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "Terminal TransLog Pro Operacional",
      timestamp: new Date().toISOString()
    });
  });

  // Configuração do Vite como Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Servir ficheiros estáticos em produção
    app.use(express.static(path.join(__dirname, "dist")));
    
    // Fallback para SPA em produção
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 [BACKEND] Servidor TransLog Pro em execução: http://localhost:${PORT}`);
    console.log(`📡 [MODO] ${process.env.NODE_ENV || 'development'}\n`);
  });
}

startServer().catch((err) => {
  console.error("Erro ao iniciar o servidor:", err);
  process.exit(1);
});
