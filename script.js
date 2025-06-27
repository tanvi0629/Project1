// Combined JavaScript code with:
// - PDF upload & text extraction
// - TTS with language, mood, narration style
// - Play/Pause/Stop controls
// - Speed control
// - Live transcript display
// - Real-time mic-to-text using Web Speech API

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
let utterance;
let recognition;
let recognizing = false;

// ========== PDF Upload and Extraction ==========
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
              extractedText = allText;
              alert("PDF loaded successfully!");
            }
          });
        });
      };
      readPages(1);
    });
  };
  fileReader.readAsArrayBuffer(file);
});

// ========== Speed Display ==========
speedControl.addEventListener('input', () => {
  speedValue.textContent = speedControl.value + 'x';
});

// ========== Transform Text by Mood and Narration ==========
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

// ========== Play TTS ==========
playBtn.addEventListener('click', () => {
  if (!extractedText) {
    alert('Please upload a PDF first.');
    return;
  }

  if (speechSynthesis.speaking && speechSynthesis.paused) {
    speechSynthesis.resume();
    return;
  }

  
  const lang = languageSelect.value;
  const mood = moodSelect.value;
  const narration = narrationSelect.value;
  const rate = parseFloat(speedControl.value);
  const textToSpeak = transformText(extractedText, mood, narration);
  speechSynthesis.cancel();
  
  utterance = new SpeechSynthesisUtterance(textToSpeak);
  utterance.lang = lang;
  utterance.rate = rate;

  utterance.onboundary = (event) => {
    const spokenText = textToSpeak.substring(0, event.charIndex + event.charLength || event.charIndex);
    transcriptBox.textContent = spokenText;
  };
  utterance.onend = () => {
    transcriptBox.textContent += '\n\n[Done speaking]';
  };

  transcriptBox.textContent = '[Speaking begins...]';
  speechSynthesis.speak(utterance);
});

// ========== Pause & Stop ==========
pauseBtn.addEventListener('click', () => {
  if (speechSynthesis.speaking) speechSynthesis.pause();
});
stopBtn.addEventListener('click', () => {
  speechSynthesis.cancel();
  transcriptBox.textContent = '[Speech stopped]';
});

// ========== Real-time Mic-to-Text ==========
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
