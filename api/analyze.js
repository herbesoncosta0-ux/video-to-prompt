import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import formidable from 'formidable';

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

    const fileManager = new GoogleAIFileManager(apiKey);
    const genAI = new GoogleGenerativeAI(apiKey);

    // Upload do vídeo para os servidores do Gemini
    const uploadResult = await fileManager.uploadFile(videoFile.filepath, {
      mimeType: videoFile.mimetype || 'video/mp4',
      displayName: videoFile.originalFilename || 'video.mp4',
    });

    // Modelo atualizado e garantido
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    // Requisição para a IA
    const result = await model.generateContent([
      {
        fileData: {
          fileUri: uploadResult.file.uri,
          mimeType: uploadResult.file.mimeType,
        },
      },
      {
        text: 'Analise este vídeo detalhadamente e crie um prompt profissional em português para recriar um vídeo ou imagem com a mesma estética, iluminação, cenário, enquadramento e estilo.',
      },
    ]);

    // Apaga o arquivo do servidor temporário do Gemini
    try {
      await fileManager.deleteFile(uploadResult.file.name);
    } catch (e) {}

    return res.status(200).json({ prompt: result.response.text() });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Erro ao processar o vídeo.' });
  }
}
