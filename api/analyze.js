import OpenAI from 'openai';
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave OPENAI_API_KEY não configurada na Vercel.' });
    }

    const fileBuffer = fs.readFileSync(videoFile.filepath);
    const base64Data = fileBuffer.toString('base64');
    const mimeType = videoFile.mimetype || 'video/mp4';

    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analise este conteúdo visual e crie um prompt detalhado em português descrevendo a estética, vestuário, cores, iluminação, cenário e enquadramento para recriar o conteúdo.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    return res.status(200).json({ prompt: response.choices[0].message.content });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Erro ao processar o vídeo.' });
  }
}
