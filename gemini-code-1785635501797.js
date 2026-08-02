const videoInput = document.getElementById('videoInput');
const videoPreview = document.getElementById('videoPreview');
const btnAnalyze = document.getElementById('btnAnalyze');
const statusMessage = document.getElementById('statusMessage');
const promptOutput = document.getElementById('promptOutput');

let selectedFile = null;

videoInput.addEventListener('change', (e) => {
  selectedFile = e.target.files[0];
  if (selectedFile) {
    const videoUrl = URL.createObjectURL(selectedFile);
    videoPreview.src = videoUrl;
    videoPreview.style.display = 'block';
    btnAnalyze.disabled = false;
  }
});

btnAnalyze.addEventListener('click', async () => {
  if (!selectedFile) return;

  btnAnalyze.disabled = true;
  statusMessage.innerText = '⏳ Enviando e analisando o vídeo... Aguarde alguns segundos.';
  promptOutput.style.display = 'none';

  const formData = new FormData();
  formData.append('video', selectedFile);

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (data.prompt) {
      statusMessage.innerText = '✅ Prompt Gerado com Sucesso!';
      promptOutput.innerText = data.prompt;
      promptOutput.style.display = 'block';
    } else {
      statusMessage.innerText = '❌ Erro: ' + (data.error || 'Falha ao analisar o vídeo.');
    }
  } catch (err) {
    statusMessage.innerText = '❌ Erro de conexão com o servidor.';
    console.error(err);
  } finally {
    btnAnalyze.disabled = false;
  }
});