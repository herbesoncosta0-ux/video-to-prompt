import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import formidable from "formidable";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const form = formidable();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Erro ao processar o upload do arquivo.' });

    const file = files.video?.[0] || files.video;
    if (!file) return res.status(400).json({ error: 'Nenhum vídeo foi enviado.' });

    try {
      const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      const uploadResult = await fileManager.uploadFile(file.filepath, {
        mimeType: file.mimetype,
        displayName: file.originalFilename,
      });

      let remoteFile = await fileManager.getFile(uploadResult.file.name);
      while (remoteFile.state === "PROCESSING") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        remoteFile = await fileManager.getFile(uploadResult.file.name);
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const promptSystem = `
      Você é um especialista em análise de vídeos curtos (TikTok, Reels, Shorts) e engenheiro de prompts de IA.
      Análise o vídeo fornecido e gere um prompt detalhado em formato de ficha técnica:

      1. **Estilo do Vídeo:** Identifique se é POV (primeira pessoa), Hands-on, Narração de Vendas, ASMR ou Vlog.
      2. **Prompt Visual para Recriar:** Descreva enquadramento, movimento de câmera, iluminação, posição das mãos/objetos, cores e cenário.
      3. **Áudio & Roteiro:** Transcreva a fala (se houver) ou descreva os efeitos sonoros/estilo de música ideal (se for silencioso/POV).
      4. **Gancho de Retenção (Hook):** O que acontece nos 3 primeiros segundos que prende o espectador.
      
      Entregue o resultado formatado de forma limpa e organizada.
      `;

      const result = await model.generateContent([
        uploadResult.file,
        { text: promptSystem }
      ]);

      await fileManager.deleteFile(uploadResult.file.name);

      return res.status(200).json({ prompt: result.response.text() });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });
  }
