// --- KONFIGURASI ---
const GAS_READ_URL = 'https://script.google.com/macros/s/AKfycbxOhIR1wQ8_qM_UZEo8yTSHQCLsdRXGZbnJhWR9U6otFdgmcn_vpC-kbOjkmdbhGH0nZg/exec';

// URL POST Google Form
const FORM_POST_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfvuErl_uxGBmYF9FuJSfto1w-H_N2XZZMfr59XQwAk7VTCSQ/formResponse';

// ID Entry Google Form
const ENTRY_NAMA = 'entry.709069894';
const ENTRY_KELAS = 'entry.1573843096';
const ENTRY_PAYLOAD = 'entry.1711895432';

// --- STATE MANAGEMENT ---
let isExamRunning = false;
let questions = [];
let answers = JSON.parse(localStorage.getItem('cbt_answers')) || {};
let studentData = JSON.parse(localStorage.getItem('cbt_student')) || null;

// --- ELEMEN DOM ---
const startScreen = document.getElementById('start-screen');
const examScreen = document.getElementById('exam-screen');
const btnMulai = document.getElementById('btn-mulai');
const btnSubmit = document.getElementById('btn-submit');
const questionContainer = document.getElementById('question-container');
const loading = document.getElementById('loading');

// --- 1. INISIALISASI & FULLSCREEN ---
btnMulai.addEventListener('click', () => {
    const nama = document.getElementById('input-nama').value.trim();
    const kelas = document.getElementById('input-kelas').value.trim();

    if (!nama || !kelas) return alert('Nama dan Kelas wajib diisi!');

    studentData = { nama, kelas };
    localStorage.setItem('cbt_student', JSON.stringify(studentData));

    // Minta Fullscreen
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    }

    startExam();
});

// --- 2. LOGIKA UTAMA UJIAN ---
async function startExam() {
    isExamRunning = true;
    startScreen.classList.add('hidden');
    examScreen.classList.remove('hidden');
    examScreen.classList.add('flex');
    document.getElementById('student-info').textContent = `${studentData.nama} - ${studentData.kelas}`;

    await fetchQuestions();
}

async function fetchQuestions() {
    try {
        const response = await fetch(GAS_READ_URL);
        const result = await response.json();
        
        if (result.status === 'success') {
            questions = result.data;
            renderQuestions();
        } else {
            loading.textContent = "Gagal memuat soal. Silakan muat ulang halaman.";
        }
    } catch (error) {
        loading.textContent = "Terjadi kesalahan jaringan.";
    }
}

function renderQuestions() {
    loading.classList.add('hidden');
    questionContainer.classList.remove('hidden');
    btnSubmit.classList.remove('hidden');

    questionContainer.innerHTML = '';
    
    questions.forEach((q, index) => {
        const qDiv = document.createElement('div');
        qDiv.className = 'bg-white p-5 rounded-lg shadow border border-gray-200';
        
        const qText = `<p class="font-semibold mb-3">${index + 1}. ${q.pertanyaan}</p>`;
        
        // Generate Opsi
        const options = ['a', 'b', 'c', 'd'];
        let optionsHtml = '<div class="space-y-2">';
        options.forEach(opt => {
            const optKey = `opsi_${opt}`;
            if(q[optKey]) {
                const isChecked = answers[q.id] === opt ? 'checked' : '';
                optionsHtml += `
                    <label class="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                        <input type="radio" name="q_${q.id}" value="${opt}" ${isChecked} 
                               class="form-radio h-4 w-4 text-blue-600"
                               onchange="saveAnswer('${q.id}', '${opt}')">
                        <span>${opt.toUpperCase()}. ${q[optKey]}</span>
                    </label>
                `;
            }
        });
        optionsHtml += '</div>';

        qDiv.innerHTML = qText + optionsHtml;
        questionContainer.appendChild(qDiv);
    });
}

// Global scope agar bisa dipanggil dari inline HTML onchange
window.saveAnswer = function(id, value) {
    answers[id] = value;
    localStorage.setItem('cbt_answers', JSON.stringify(answers));
};

// --- 3. PENGIRIMAN DATA (WRITE API JALUR TIKUS) ---
btnSubmit.addEventListener('click', async () => {
    if (Object.keys(answers).length < questions.length) {
        const proceed = confirm('Ada soal yang belum dijawab. Yakin ingin mengumpulkan?');
        if (!proceed) return;
    }

    btnSubmit.textContent = "Mengirim...";
    btnSubmit.disabled = true;

    // Buat form data menggunakan URLSearchParams
    const formData = new URLSearchParams();
    formData.append(ENTRY_NAMA, studentData.nama);
    formData.append(ENTRY_KELAS, studentData.kelas);
    formData.append(ENTRY_PAYLOAD, JSON.stringify(answers));

    try {
        // Kirim via no-cors. Tidak akan mengembalikan status code 200 yang bisa dibaca JS,
        // tapi request POST akan sampai ke server Google.
        await fetch(FORM_POST_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        // Asumsi sukses karena no-cors tidak bisa mendeteksi response spesifik
        isExamRunning = false;
        localStorage.removeItem('cbt_answers');
        localStorage.removeItem('cbt_student');
        
        if (document.exitFullscreen) document.exitFullscreen();
        
        questionContainer.innerHTML = `
            <div class="text-center py-10">
                <h2 class="text-2xl font-bold text-green-600 mb-2">Jawaban Berhasil Dikirim!</h2>
                <p>Terima kasih, Anda bisa menutup halaman ini.</p>
            </div>
        `;
        btnSubmit.classList.add('hidden');

    } catch (error) {
        alert("Gagal mengirim jawaban. Periksa koneksi internet Anda.");
        btnSubmit.textContent = "Kirim Ulang";
        btnSubmit.disabled = false;
    }
});

// --- 4. SISTEM ANTI-CHEAT (CLIENT SIDE) ---

// Blokir Klik Kanan
document.addEventListener('contextmenu', e => e.preventDefault());

// Blokir Shortcut Keyboard (F12, Ctrl+U, Ctrl+C)
document.addEventListener('keydown', e => {
    if (e.key === 'F12' || (e.ctrlKey && ['u', 'c', 'v', 's', 'p'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
    }
});

// Deteksi Ganti Tab (Visibility Change)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isExamRunning) {
        alert("PERINGATAN ANTI-CHEAT: Anda terdeteksi keluar dari tab ujian! Pelanggaran dicatat.");
        // Anda bisa menyimpan jumlah pelanggaran ke localStorage dan mengirimnya bersama payload
    }
});

// Deteksi Keluar Fullscreen
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && isExamRunning) {
        alert("PERINGATAN: Anda keluar dari mode layar penuh. Harap kembali untuk melanjutkan ujian.");
        // Anda bisa memaksa tombol untuk masuk kembali ke fullscreen di sini
    }
});

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js');
    });
}