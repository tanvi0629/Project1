const fileInput = document.getElementById('pdf-upload');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-btn');
const languageSelect = document.getElementById('language');
const speedControl = document.getElementById('speed');
const speedValue = document.getElementById('speed-value');
const moodSelect = document.getElementById('mood');
const narrationSelect = document.getElementById('narration');
const transcriptBox = document.getElementById('transcript-text');
const micBtn = document.getElementById('mic-btn');
const micTranscript = document.getElementById('mic-transcript-text');

let extractedText = '';
let recognition;
let recognizing = false;

// ====== PDF Upload & Extraction ======
fileInput.addEventListener('change', function () {
  const file = fileInput.files[0];
  if (!file || file.type !== 'application/pdf') {
    alert('Please upload a valid PDF file.');
    return;
  }

  const fileReader = new FileReader();
  fileReader.onload = function () {
    const typedarray = new Uint8Array(this.result);
    pdfjsLib.getDocument(typedarray).promise.then(pdf => {
      let allText = '';
      const readPages = (pageNum) => {
        pdf.getPage(pageNum).then(page => {
          page.getTextContent().then(textContent => {
            const pageText = textContent.items.map(item => item.str).join(' ');
            allText += pageText + ' ';
            if (pageNum < pdf.numPages) {
              readPages(pageNum + 1);
            } else {
              extractedText = allText.trim();
              alert("PDF loaded successfully!");
              console.log("Extracted text:", extractedText);
            }
          });
        });
      };
      readPages(1);
    });
  };
  fileReader.readAsArrayBuffer(file);
});

// ====== Speed Display ======
speedControl.addEventListener('input', () => {
  speedValue.textContent = speedControl.value + 'x';
});

// ====== Mood & Narration Transform ======
function transformText(text, mood, narration) {
  let transformed = text;
  if (narration === 'short') {
    transformed = text.split('. ').slice(0, 3).join('. ') + '.';
  } else if (narration === 'bullet') {
    transformed = text.split('. ').map(line => '• ' + line.trim()).join('\n');
  } else if (narration === 'descriptive') {
    transformed = 'Let me explain this in detail.\n\n' + text;
  }

  if (mood === 'calm') {
    transformed = 'In a calm tone:\n' + transformed;
  } else if (mood === 'jolly') {
    transformed = 'Let\'s enjoy this together! 😄\n' + transformed;
  } else if (mood === 'serious') {
    transformed = 'Please listen carefully:\n' + transformed;
  }
  return transformed;
}

// ====== Murf TTS Integration ======
async function speakWithMurf(text) {
  const apiKey = "ap2_bb0639cd-3735-418a-ae57-d3708cb7a28f"; // Your API key
  const voiceId = "en-US-natalie"; // Your voice ID

  try {
    const response = await fetch("https://api.murf.ai/v1/speech/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify({
        text: text,
        voice_id: voiceId,
        format: "mp3"
      })
    });

    const data = await response.json();
    console.log("Full Murf response:", data);

    if (data.audio_url) {
      const audio = new Audio(data.audio_url);
      transcriptBox.textContent = "Speaking from Murf...";
      audio.play();
      audio.onended = () => {
        transcriptBox.textContent += "\n[Done speaking]";
      };
    } else {
      transcriptBox.textContent = "Error: No audio generated.";
    }
  } catch (err) {
    console.error("Murf API error:", err);
    transcriptBox.textContent = "Error connecting to Murf API.";
  }
}

// ====== Play TTS ======
playBtn.addEventListener('click', () => {
  if (!extractedText) {
    alert('Please upload a PDF first.');
    return;
  }
  const mood = moodSelect.value;
  const narration = narrationSelect.value;
  const processedText = transformText(extractedText, mood, narration);
  speakWithMurf(processedText);
});

// ====== Pause & Stop Notices ======
pauseBtn.addEventListener('click', () => {
  alert('Pause not supported with Murf playback.');
});
stopBtn.addEventListener('click', () => {
  alert('Stop not supported with Murf playback once started.');
});

// ====== Real-Time Mic-to-Text ======
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    recognizing = true;
    micTranscript.textContent = '[Listening...]';
  };

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    micTranscript.textContent = transcript;
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    micTranscript.textContent = '[Error: ' + event.error + ']';
  };

  recognition.onend = () => {
    recognizing = false;
    micTranscript.textContent += '\n\n[Stopped Listening]';
  };
} else {
  micTranscript.textContent = 'Speech Recognition not supported in this browser.';
}

micBtn.addEventListener('click', () => {
  if (!recognition) return;
  if (!recognizing) {
    recognition.start();
  } else {
    recognition.stop();
  }
});
