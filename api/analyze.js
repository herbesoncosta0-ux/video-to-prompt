import { GoogleGenerativeAI } from '@google/generative-ai';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const form = formidable({});

  try {
    const [fields, files] = await form.parse(req);
    const videoFile = files.video?.[0] || files.video;

    if (!videoFile) {
      return res.status(400).json({ error: 'Nenhum vídeo foi enviado.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave API não configurada na Vercel.' });
    }

    // Lê o arquivo diretamente como Buffer e converte em base64
    const fileBuffer = fs.readFileSync(videoFile.filepath);
    const base64Video = fileBuffer.toString('base64');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Video,
          mimeType: videoFile.mimetype || 'video/mp4',
        },
      },
      {
        text: 'Analise este vídeo e gere um prompt em português altamente detalhado descrevendo a cena, estética, vestuário, iluminação, cores e enquadramento para recriar esta cena.',
      },
    ]);

    return res.status(200).json({ prompt: result.response.text() });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Erro ao processar o vídeo.' });
  }
}
