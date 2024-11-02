import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import {
  GenerateRequest,
  GenerateResponse,
  OllamaGenerateResponse,
} from "./types.js";
import { fetchWithTimeout } from "./utils/fetchWithTimeout.js";
import promBundle from "express-prom-bundle";

const app = express();
const port = process.env.PORT || 3000;
const OLLAMA_HOST = process.env.OLLAMA_HOST || "localhost";
const model = process.env.DEFAULT_MODEL || "mistral-small";

app.use(bodyParser.json());

const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
});

app.use(metricsMiddleware);

async function pullModel(modelName: string): Promise<void> {
  try {
    const response = await fetchWithTimeout(
      `http://${OLLAMA_HOST}:11434/api/pull`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName }),
      }
    );

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      console.log(decoder.decode(value));
    }

    console.log(`Modèle ${modelName} téléchargé avec succès`);
  } catch (error) {
    console.error(`Erreur de téléchargement du modèle ${modelName}:`, error);
  }
}

app.post(
  "/generate",
  async (
    req: Request<{}, {}, GenerateRequest>,
    res: Response<GenerateResponse>
  ) => {
    try {
      const { prompt } = req.body;

      const response = await fetchWithTimeout(
        `http://${OLLAMA_HOST}:11434/api/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt }),
        }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let generatedText = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const parsedLine: OllamaGenerateResponse = JSON.parse(line);
            if (parsedLine.response) {
              generatedText += parsedLine.response;
            }
          } catch (parseError) {
            console.warn("Erreur de parsing:", parseError);
          }
        }
      }

      res.json({ text: generatedText });
    } catch (error) {
      console.error("Erreur de génération:", error);
      res
        .status(500)
        .json({
          text: `Erreur: ${
            error instanceof Error ? error.message : "Erreur inconnue"
          }`,
        });
    }
  }
);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(port, async () => {
  console.log(`Serveur LLM démarré sur http://localhost:${port}`);
});

// Gestion gracieuse de l'arrêt
process.on("SIGTERM", () => {
  console.log("Signal SIGTERM reçu. Fermeture du serveur...");
  server.close(() => {
    console.log("Serveur fermé.");
    process.exit(0);
  });
});
