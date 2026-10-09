// ============================================================
// CBT GEOGRAFI SMAN 8 KOTA TANGERANG SELATAN
// ============================================================

// URL GOOGLE APPS SCRIPT
const GAS_URL =
    'https://script.google.com/macros/s/AKfycbyjrfCbZGCh4NkEel-mpJaFp6DPLXv0JJ1scb_a6428l4qXcXFotLJkmf11kH0bFGtW5A/exec';

// ============================================================
// PENGATURAN UJIAN
// ============================================================

// Durasi ujian: 90 menit
const EXAM_DURATION = 90 * 60;

// ============================================================
// DATA UJIAN
// ============================================================

let questions = [];
let currentQuestion = 0;
let answers = {};
let studentData = null;
let violationCount = 0;
let submissionId = '';

let isExamRunning = false;
let isSubmitting = false;
let cheatDetected = false;

let examEndTime = null;
let timerInterval = null;

// ============================================================
// AMBIL ELEMEN HTML
// ============================================================

const startScreen = document.getElementById('start-screen');
const examScreen = document.getElementById('exam-screen');
const resultScreen = document.getElementById('result-screen');

const btnMulai = document.getElementById('btn-mulai');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnSubmit = document.getElementById('btn-submit');

const loading = document.getElementById('loading');
const questionContainer = document.getElementById('question-container');
const navigation = document.getElementById('navigation');

const progressText = document.getElementById('progress-text');
const progressBar = document.getElementById('progress-bar');

const timerElement = document.getElementById('timer');

const processingPopup = document.getElementById('processing-popup');
const cheatPopup = document.getElementById('cheat-popup');

// ============================================================
// UTILITAS
// ============================================================

// Menghindari teks soal diperlakukan sebagai HTML
function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Mengacak urutan array
function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

// Membuat ID pengiriman unik
function createSubmissionId() {
    return (
        'CBT-' +
        Date.now() +
        '-' +
        Math.random().toString(36).substring(2, 8).toUpperCase()
    );
}

// Jeda waktu
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// TIMER UJIAN
// ============================================================

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return (
        String(minutes).padStart(2, '0') +
        ':' +
        String(seconds).padStart(2, '0')
    );
}

function stopExamTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateExamTimer() {
    if (!examEndTime || !timerElement) {
        return;
    }

    const remaining = Math.max(
        0,
        Math.ceil((examEndTime - Date.now()) / 1000)
    );

    timerElement.textContent = '⏱ ' + formatTime(remaining);

    // Lima menit terakhir: merah dan berkedip
    if (remaining <= 300) {
        timerElement.classList.remove(
            'text-blue-600',
            'text-orange-600'
        );

        timerElement.classList.add(
            'text-red-600',
            'animate-pulse'
        );
    } else if (remaining <= 600) {
        // Sepuluh menit terakhir: oranye
        timerElement.classList.remove(
            'text-blue-600',
            'text-red-600',
            'animate-pulse'
        );

        timerElement.classList.add('text-orange-600');
    } else {
        timerElement.classList.remove(
            'text-red-600',
            'text-orange-600',
            'animate-pulse'
        );

        timerElement.classList.add('text-blue-600');
    }

    // Waktu habis: kirim jawaban otomatis
    if (remaining <= 0) {
        stopExamTimer();

        if (isExamRunning && !isSubmitting) {
            submitExam(false, true);
        }
    }
}

function startExamTimer() {
    stopExamTimer();

    examEndTime = Date.now() + EXAM_DURATION * 1000;

    updateExamTimer();

    timerInterval = setInterval(updateExamTimer, 1000);
}

// ============================================================
// MULAI UJIAN
// ============================================================

btnMulai.addEventListener('click', async function () {
    const nama = document
        .getElementById('input-nama')
        .value
        .trim();

    const kelas = document
        .getElementById('input-kelas')
        .value;

    if (!nama) {
        alert('Nama lengkap wajib diisi.');
        document.getElementById('input-nama').focus();
        return;
    }

    if (!kelas) {
        alert('Silakan pilih kelas terlebih dahulu.');
        return;
    }

    // Simpan identitas peserta
    studentData = {
        nama: nama,
        kelas: kelas
    };

    // Reset data untuk sesi ujian baru
    answers = {};
    violationCount = 0;
    cheatDetected = false;
    isSubmitting = false;

    localStorage.setItem(
        'cbt_student',
        JSON.stringify(studentData)
    );

    localStorage.setItem('cbt_answers', '{}');
    localStorage.setItem('cbt_violations', '0');

    submissionId = createSubmissionId();

    localStorage.setItem(
        'cbt_submission_id',
        submissionId
    );

    // Meminta mode layar penuh jika tersedia
    try {
        if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
        }
    } catch (error) {
        console.log('Fullscreen tidak tersedia.');
    }

    startExam();
});

// ============================================================
// TAMPILKAN HALAMAN UJIAN
// ============================================================

async function startExam() {
    isExamRunning = true;

    // Sembunyikan halaman awal dan hasil
    startScreen.classList.add('hidden');
    startScreen.style.display = 'none';

    resultScreen.classList.add('hidden');
    resultScreen.style.display = 'none';

    // Tampilkan halaman ujian
    examScreen.classList.remove('hidden');
    examScreen.style.display = 'block';

    // Tampilkan identitas peserta
    document.getElementById('student-info').textContent =
        `${studentData.nama} — Kelas ${studentData.kelas}`;

    // Pastikan soal dan navigasi belum tampil
    loading.classList.remove('hidden');
    questionContainer.classList.add('hidden');
    navigation.classList.add('hidden');
    btnSubmit.classList.add('hidden');

    // Reset indikator loading
    loading.innerHTML = `
        <div class="loading-spinner mb-4"></div>
        <p class="font-semibold">Memuat soal...</p>
        <p class="text-sm text-gray-500 mt-2">Mohon tunggu.</p>
    `;

    // Mulai mengambil soal
    await fetchQuestions();
}

// ============================================================
// MENGAMBIL SOAL DARI GOOGLE APPS SCRIPT
// ============================================================

async function fetchQuestions() {
    loading.classList.remove('hidden');
    questionContainer.classList.add('hidden');
    navigation.classList.add('hidden');
    btnSubmit.classList.add('hidden');

    try {
        const response = await fetch(
            GAS_URL + '?action=getQuestions&_=' + Date.now()
        );

        if (!response.ok) {
            throw new Error('Server tidak merespons.');
        }

        const result = await response.json();

        if (result.status !== 'success') {
            throw new Error(
                result.message || 'Soal gagal dimuat.'
            );
        }

        if (!result.data || result.data.length === 0) {
            throw new Error(
                'Tidak ada soal pada Google Sheet.'
            );
        }

        // Acak urutan soal
        questions = shuffle(result.data);

        // Acak pilihan jawaban setiap soal
        questions = questions.map(function (question) {
            const options = [];

            ['a', 'b', 'c', 'd', 'e'].forEach(function (letter) {
                const key = 'opsi_' + letter;

                if (
                    question[key] !== undefined &&
                    question[key] !== null &&
                    String(question[key]).trim() !== ''
                ) {
                    options.push({
                        text: String(question[key])
                    });
                }
            });

            return {
                ...question,
                shuffledOptions: shuffle(options)
            };
        });

        currentQuestion = 0;

        // Render soal saat kontainer masih tersembunyi
        renderQuestion();

        // Setelah soal siap, tampilkan kontainer
        loading.classList.add('hidden');
        questionContainer.classList.remove('hidden');
        navigation.classList.remove('hidden');

        // Timer dimulai setelah soal berhasil dimuat
        startExamTimer();

        // Posisi halaman kembali ke bagian atas
        window.scrollTo({
            top: 0,
            behavior: 'auto'
        });

    } catch (error) {
        console.error('ERROR MEMUAT SOAL:', error);

        stopExamTimer();

        loading.classList.remove('hidden');
        questionContainer.classList.add('hidden');
        navigation.classList.add('hidden');
        btnSubmit.classList.add('hidden');

        loading.innerHTML = `
            <div class="text-red-600 font-bold text-lg mb-3">
                Gagal Memuat Soal
            </div>

            <p class="text-gray-600 text-sm mb-4">
                ${escapeHtml(error.message)}
            </p>

            <button
                id="btn-reload-soal"
                class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-lg">
                Coba Muat Ulang
            </button>
        `;

        document
            .getElementById('btn-reload-soal')
            .addEventListener('click', function () {
                fetchQuestions();
            });
    }
}

// ============================================================
// MENAMPILKAN SOAL
// ============================================================

function renderQuestion() {
    if (questions.length === 0) {
        return;
    }

    const question = questions[currentQuestion];

    const savedAnswer = answers[String(question.id)];

    let html = `
        <div class="question-appear bg-white rounded-xl shadow p-4 sm:p-5 md:p-7">

            <div class="flex justify-between items-center gap-3 mb-5">
                <div class="text-sm font-bold text-blue-600">
                    SOAL ${currentQuestion + 1} / ${questions.length}
                </div>

                <div class="text-sm text-gray-500 text-right">
                    ${savedAnswer ? '✓ Sudah dijawab' : 'Belum dijawab'}
                </div>
            </div>

            <div class="text-lg md:text-xl font-semibold leading-relaxed mb-6">
                ${currentQuestion + 1}.
                ${escapeHtml(question.pertanyaan)}
            </div>

            <div class="space-y-3">
    `;

    question.shuffledOptions.forEach(function (option, index) {
        const letter = String.fromCharCode(65 + index);
        const selected = savedAnswer === option.text;

        html += `
            <label
                class="option-item ${
                    selected ? 'selected' : ''
                } block border-2 border-gray-200 rounded-xl p-4 cursor-pointer">

                <div class="flex items-start gap-3">
                    <input
                        type="radio"
                        name="question"
                        value="${escapeHtml(option.text)}"
                        ${selected ? 'checked' : ''}
                        class="mt-1 w-5 h-5 flex-shrink-0">

                    <div class="flex gap-3 min-w-0">
                        <span class="font-bold">${letter}.</span>
                        <span class="break-words">${escapeHtml(option.text)}</span>
                    </div>
                </div>
            </label>
        `;
    });

    html += `
            </div>
        </div>
    `;

    questionContainer.innerHTML = html;

    // Simpan jawaban saat pilihan diklik
    const radios = questionContainer.querySelectorAll(
        'input[type="radio"]'
    );

    radios.forEach(function (radio) {
        radio.addEventListener('change', function () {
            saveAnswer(question.id, radio.value);
            renderQuestion();
        });
    });

    updateNavigation();
    updateProgress();
}

// ============================================================
// SIMPAN JAWABAN
// ============================================================

function saveAnswer(questionId, value) {
    answers[String(questionId)] = value;

    localStorage.setItem(
        'cbt_answers',
        JSON.stringify(answers)
    );
}

// ============================================================
// NAVIGASI SOAL
// ============================================================

function scrollToQuestion() {
    // Scroll langsung agar tidak terasa melompat di HP
    window.scrollTo({
        top: 0,
        behavior: 'auto'
    });
}

btnPrev.addEventListener('click', function () {
    if (currentQuestion > 0) {
        currentQuestion--;
        renderQuestion();
        scrollToQuestion();
    }
});

btnNext.addEventListener('click', function () {
    if (currentQuestion < questions.length - 1) {
        currentQuestion++;
        renderQuestion();
        scrollToQuestion();
    }
});

// ============================================================
// TOMBOL NAVIGASI DAN SELESAI
// ============================================================

function updateNavigation() {
    btnPrev.disabled = currentQuestion === 0;

    btnPrev.style.opacity =
        currentQuestion === 0 ? '0.5' : '1';

    if (currentQuestion === questions.length - 1) {
        btnNext.classList.add('hidden');
        btnSubmit.classList.remove('hidden');
    } else {
        btnNext.classList.remove('hidden');
        btnSubmit.classList.add('hidden');
    }
}

// ============================================================
// PROGRESS JAWABAN
// ============================================================

function updateProgress() {
    const total = questions.length;

    let answered = 0;

    questions.forEach(function (question) {
        if (answers[String(question.id)]) {
            answered++;
        }
    });

    progressText.textContent = `${answered} / ${total}`;

    const percentage = total > 0
        ? (answered / total) * 100
        : 0;

    progressBar.style.width = percentage + '%';
}

// ============================================================
// TOMBOL SELESAI UJIAN
// ============================================================

btnSubmit.addEventListener('click', async function () {
    if (isSubmitting || cheatDetected) {
        return;
    }

    let unanswered = 0;

    questions.forEach(function (question) {
        if (!answers[String(question.id)]) {
            unanswered++;
        }
    });

    if (unanswered > 0) {
        const lanjut = confirm(
            `Masih ada ${unanswered} soal yang belum dijawab.\n\n` +
            'Apakah Anda yakin ingin menyelesaikan ujian?'
        );

        if (!lanjut) {
            return;
        }
    }

    const yakin = confirm(
        'Apakah Anda yakin ingin menyelesaikan ujian?\n\n' +
        'Jawaban yang sudah dikirim tidak dapat diubah.'
    );

    if (!yakin) {
        return;
    }

    await submitExam(false);
});

// ============================================================
// KIRIM HASIL UJIAN
// ============================================================

async function submitExam(isCheat, isTimeout = false) {
    if (isSubmitting) {
        return;
    }

    isSubmitting = true;
    isExamRunning = false;

    stopExamTimer();

    cheatDetected = isCheat;

    btnSubmit.disabled = true;
    btnPrev.disabled = true;
    btnNext.disabled = true;

    if (isCheat) {
        cheatPopup.classList.remove('hidden');
    } else {
        showProcessing(
            isTimeout
                ? 'Waktu Ujian Habis'
                : 'Mengirim Hasil Ujian',
            isTimeout
                ? 'Waktu 90 menit telah berakhir. Jawaban Anda sedang dikirim otomatis.'
                : 'Jawaban sedang diperiksa dan disimpan ke sistem.'
        );
    }

    if (!submissionId) {
        submissionId = createSubmissionId();

        localStorage.setItem(
            'cbt_submission_id',
            submissionId
        );
    }

    const payload = {
        submission_id: submissionId,
        nama: studentData.nama,
        kelas: studentData.kelas,
        answers: answers,
        violations: violationCount,
        cheat: isCheat,
        submit_time: new Date().toISOString()
    };

    try {
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type':
                    'application/x-www-form-urlencoded;charset=UTF-8'
            },
            body: 'payload=' + encodeURIComponent(
                JSON.stringify(payload)
            )
        });

        if (isCheat) {
            cheatPopup.querySelector('.mt-5').textContent =
                'Hasil sedang diproses...';
        } else {
            document.getElementById('processing-message').textContent =
                'Data dikirim. Sistem sedang memeriksa penyimpanan dan menghitung nilai...';
        }

        const berhasil = await checkSubmission(submissionId);

        if (!berhasil) {
            throw new Error(
                'Server belum mengonfirmasi penyimpanan.'
            );
        }

        if (isCheat) {
            cheatPopup.querySelector('.mt-5').textContent =
                'Hasil berhasil disimpan.';

            await sleep(800);
        }

        await showResult();

    } catch (error) {
        console.error('Gagal mengirim ujian:', error);

        isSubmitting = false;

        if (isCheat) {
            cheatPopup.classList.add('hidden');

            // Jangan melanjutkan ujian yang sudah terindikasi pelanggaran.
            isExamRunning = false;

            alert(
                'Sistem belum dapat mengonfirmasi penyimpanan hasil.\n\n' +
                'Jangan tutup halaman. Hubungi guru/pengawas.'
            );
        } else {
            hideProcessing();

            // Jika gagal dan waktu belum habis, ujian dapat dicoba lagi.
            if (examEndTime && Date.now() < examEndTime) {
                isExamRunning = true;
                btnSubmit.disabled = false;
                btnPrev.disabled = false;
                btnNext.disabled = false;

                alert(
                    'Jawaban belum dapat dikonfirmasi tersimpan.\n\n' +
                    'Jawaban masih tersimpan di perangkat. Silakan coba kirim kembali.'
                );
            } else {
                // Jika waktu sudah habis, jangan mulai timer baru.
                isExamRunning = true;
                btnSubmit.disabled = false;
                btnPrev.disabled = false;
                btnNext.disabled = false;

                alert(
                    'Pengiriman belum berhasil dikonfirmasi.\n\n' +
                    'Jangan tutup halaman. Hubungi guru/pengawas untuk bantuan pengiriman.'
                );
            }
        }
    }
}

// ============================================================
// CEK PENYIMPANAN SUBMISSION
// ============================================================

async function checkSubmission(id) {
    for (let i = 0; i < 20; i++) {
        try {
            const response = await fetch(
                GAS_URL +
                '?action=checkSubmission' +
                '&submission_id=' +
                encodeURIComponent(id) +
                '&_=' +
                Date.now()
            );

            const result = await response.json();

            if (
                result.status === 'success' &&
                result.found === true
            ) {
                return true;
            }
        } catch (error) {
            console.log('Cek submission gagal:', error);
        }

        await sleep(1000);
    }

    return false;
}

// ============================================================
// AMBIL HASIL UJIAN
// ============================================================

async function showResult() {
    try {
        const response = await fetch(
            GAS_URL +
            '?action=getResult' +
            '&submission_id=' +
            encodeURIComponent(submissionId) +
            '&_=' +
            Date.now()
        );

        const result = await response.json();

        if (result.status !== 'success') {
            throw new Error('Hasil tidak ditemukan.');
        }

        displayResult(result.data);

        // Keluar dari fullscreen
        try {
            if (
                document.fullscreenElement &&
                document.exitFullscreen
            ) {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.log('Tidak dapat keluar dari fullscreen.');
        }

        // Hapus data lokal setelah hasil berhasil ditampilkan
        localStorage.removeItem('cbt_answers');
        localStorage.removeItem('cbt_student');
        localStorage.removeItem('cbt_submission_id');
        localStorage.removeItem('cbt_violations');

    } catch (error) {
        console.error('Gagal menampilkan hasil:', error);

        hideProcessing();
        cheatPopup.classList.add('hidden');

        alert(
            'Jawaban sudah dikirim, tetapi hasil belum dapat ditampilkan.\n\n' +
            'Silakan hubungi guru/pengawas.'
        );
    }
}

// ============================================================
// TAMPILKAN HASIL
// ============================================================

function displayResult(data) {
    processingPopup.classList.add('hidden');
    cheatPopup.classList.add('hidden');

    examScreen.classList.add('hidden');
    examScreen.style.display = 'none';

    resultScreen.classList.remove('hidden');
    resultScreen.style.display = 'flex';

    document.getElementById('result-name').textContent =
        data.nama || '-';

    document.getElementById('result-class').textContent =
        'Kelas ' + (data.kelas || '-');

    document.getElementById('result-score').textContent =
        Number(data.nilai || 0).toFixed(2);

    document.getElementById('result-correct').textContent =
        data.benar || 0;

    document.getElementById('result-wrong').textContent =
        data.salah || 0;

    document.getElementById('result-empty').textContent =
        data.kosong || 0;

    document.getElementById('result-total').textContent =
        data.total || 0;

    document.getElementById('result-violations').textContent =
        data.pelanggaran || 0;

    const status = data.status || 'UJIAN NORMAL';

    const statusElement = document.getElementById('result-status');

    statusElement.textContent = status;

    if (status === 'TERINDIKASI KECURANGAN') {
        statusElement.className =
            'font-bold rounded-lg p-3 result-status-cheat';

        document.getElementById('result-header').className =
            'bg-red-600 text-white text-center p-8';

        document.getElementById('result-icon').textContent = '⚠️';

        document.getElementById('result-header-text').textContent =
            'Ujian dihentikan karena terindikasi kecurangan.';
    } else {
        statusElement.className =
            'font-bold rounded-lg p-3 result-status-normal';

        document.getElementById('result-header').className =
            'bg-green-600 text-white text-center p-8';

        document.getElementById('result-icon').textContent = '✓';

        document.getElementById('result-header-text').textContent =
            'Ujian telah selesai dan hasil berhasil direkam.';
    }
}

// ============================================================
// POPUP PEMROSESAN
// ============================================================

function showProcessing(title, message) {
    document.getElementById('processing-title').textContent = title;

    document.getElementById('processing-message').textContent = message;

    processingPopup.classList.remove('hidden');
}

function hideProcessing() {
    processingPopup.classList.add('hidden');
}

// ============================================================
// DETEKSI PELANGGARAN
// ============================================================

function registerViolation(reason) {
    if (
        !isExamRunning ||
        isSubmitting ||
        cheatDetected
    ) {
        return;
    }

    violationCount++;

    localStorage.setItem(
        'cbt_violations',
        String(violationCount)
    );

    console.warn(
        'PELANGGARAN:',
        reason,
        'Jumlah:',
        violationCount
    );

    // Pengaturan saat ini: satu pelanggaran menghentikan ujian.
    cheatDetected = true;

    submitExam(true);
}

// ============================================================
// DETEKSI KLIK KANAN
// ============================================================

document.addEventListener('contextmenu', function (event) {
    if (isExamRunning) {
        event.preventDefault();
        registerViolation('Klik kanan');
    }
});

// ============================================================
// DETEKSI SHORTCUT KEYBOARD
// ============================================================

document.addEventListener('keydown', function (event) {
    if (!isExamRunning) {
        return;
    }

    const key = event.key.toLowerCase();

    const forbidden =
        event.key === 'F12' ||
        (
            event.ctrlKey &&
            ['u', 'c', 'v', 's', 'p'].includes(key)
        );

    if (forbidden) {
        event.preventDefault();

        registerViolation(
            'Shortcut terlarang: ' + event.key
        );
    }
});

// ============================================================
// DETEKSI PINDAH TAB / MENINGGALKAN HALAMAN
// ============================================================

document.addEventListener('visibilitychange', function () {
    if (document.hidden && isExamRunning) {
        registerViolation('Meninggalkan halaman ujian');
    }
});

// ============================================================
// DETEKSI KELUAR DARI FULLSCREEN
// ============================================================

document.addEventListener('fullscreenchange', function () {
    if (
        !document.fullscreenElement &&
        isExamRunning
    ) {
        registerViolation('Keluar dari fullscreen');
    }
});

// ============================================================
// SERVICE WORKER / PWA
// ============================================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker
            .register('./service-worker.js')
            .then(function () {
                console.log('Service Worker aktif.');
            })
            .catch(function (error) {
                console.log('Service Worker error:', error);
            });
    });
}
