// ============================================================
// CBT GEOGRAFI SMAN 8 KOTA TANGERANG SELATAN
// ============================================================

const GAS_URL =
    'https://script.google.com/macros/s/AKfycbyjrfCbZGCh4NkEel-mpJaFp6DPLXv0JJ1scb_a6428l4qXcXFotLJkmf11kH0bFGtW5A/exec';


// ============================================================
// DATA
// ============================================================

let questions = [];
let currentQuestion = 0;

let answers =
    JSON.parse(
        localStorage.getItem('cbt_answers') || '{}'
    );

let studentData =
    JSON.parse(
        localStorage.getItem('cbt_student') || 'null'
    );

let violationCount =
    Number(
        localStorage.getItem('cbt_violations') || 0
    );

let submissionId =
    localStorage.getItem('cbt_submission_id') || '';

let isExamRunning = false;
let isSubmitting = false;
let cheatDetected = false;

// ============================================================
// TIMER UJIAN: 90 MENIT
// ============================================================

const EXAM_DURATION = 90 * 60; // 90 menit dalam detik

let examEndTime = null;
let timerInterval = null;

const timerElement = document.getElementById('timer');

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
    if (!examEndTime || !timerElement) return;

    const remaining = Math.max(
        0,
        Math.ceil((examEndTime - Date.now()) / 1000)
    );

    timerElement.textContent = '⏱ ' + formatTime(remaining);

    if (remaining <= 300) {
        timerElement.classList.remove(
            'text-blue-600',
            'text-orange-600'
        );
        timerElement.classList.add('text-red-600');
        timerElement.classList.add('animate-pulse');
    } else if (remaining <= 600) {
        timerElement.classList.remove('text-blue-600');
        timerElement.classList.add('text-orange-600');
    }

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

    timerElement.classList.remove(
        'text-red-600',
        'text-orange-600',
        'animate-pulse'
    );
    timerElement.classList.add('text-blue-600');

    updateExamTimer();

    timerInterval = setInterval(updateExamTimer, 250);
}

// ============================================================
// ELEMENT
// ============================================================

const startScreen =
    document.getElementById('start-screen');

const examScreen =
    document.getElementById('exam-screen');

const resultScreen =
    document.getElementById('result-screen');

const btnMulai =
    document.getElementById('btn-mulai');

const btnPrev =
    document.getElementById('btn-prev');

const btnNext =
    document.getElementById('btn-next');

const btnSubmit =
    document.getElementById('btn-submit');

const loading =
    document.getElementById('loading');

const questionContainer =
    document.getElementById('question-container');

const navigation =
    document.getElementById('navigation');

const progressText =
    document.getElementById('progress-text');

const progressBar =
    document.getElementById('progress-bar');

const processingPopup =
    document.getElementById('processing-popup');

const cheatPopup =
    document.getElementById('cheat-popup');


// ============================================================
// ACAK
// ============================================================

function shuffle(array) {

    const result = [...array];

    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [
            result[i],
            result[j]
        ] =
        [
            result[j],
            result[i]
        ];

    }

    return result;
}


// ============================================================
// ESCAPE
// ============================================================

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


// ============================================================
// ID SUBMISSION
// ============================================================

function createSubmissionId() {

    return (
        'CBT-' +
        Date.now() +
        '-' +
        Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase()
    );

}


// ============================================================
// MULAI
// ============================================================

btnMulai.addEventListener(
    'click',
    async function () {

        const nama =
            document
                .getElementById('input-nama')
                .value
                .trim();

        const kelas =
            document
                .getElementById('input-kelas')
                .value;


        if (!nama) {

            alert(
                'Nama lengkap wajib diisi.'
            );

            document
                .getElementById('input-nama')
                .focus();

            return;

        }


        if (!kelas) {

            alert(
                'Silakan pilih kelas terlebih dahulu.'
            );

            return;

        }


        studentData = {
            nama: nama,
            kelas: kelas
        };


        localStorage.setItem(
            'cbt_student',
            JSON.stringify(studentData)
        );


        violationCount = 0;

        cheatDetected = false;

        isSubmitting = false;


        localStorage.setItem(
            'cbt_violations',
            '0'
        );


        submissionId =
            createSubmissionId();


        localStorage.setItem(
            'cbt_submission_id',
            submissionId
        );


        answers = {};

        localStorage.setItem(
            'cbt_answers',
            JSON.stringify(answers)
        );


        try {

            if (
                document.documentElement.requestFullscreen
            ) {

                await document
                    .documentElement
                    .requestFullscreen();

            }

        } catch (error) {

            console.log(
                'Fullscreen tidak tersedia.'
            );

        }


        startExam();

    }
);


// ============================================================
// MULAI UJIAN
// ============================================================

async function startExam() {

    isExamRunning = true;

    startScreen.classList.add('hidden');

    examScreen.classList.remove('hidden');


    document
        .getElementById('student-info')
        .textContent =
        `${studentData.nama} — Kelas ${studentData.kelas}`;


    await fetchQuestions();

}


// ============================================================
// AMBIL SOAL
// ============================================================

async function fetchQuestions() {

    loading.classList.remove('hidden');


    try {

        const response =
            await fetch(
                GAS_URL +
                '?action=getQuestions&_=' +
                Date.now()
            );


        if (!response.ok) {

            throw new Error(
                'Server tidak merespons.'
            );

        }


        const result =
            await response.json();


        if (
            result.status !==
            'success'
        ) {

            throw new Error(
                result.message ||
                'Soal gagal dimuat.'
            );

        }


        if (
            !result.data ||
            result.data.length === 0
        ) {

            throw new Error(
                'Tidak ada soal pada Google Sheet.'
            );

        }


        // Acak soal
        questions =
            shuffle(
                result.data
            );


        // Acak pilihan
        questions =
            questions.map(
                function (question) {

                    const options = [];

                    [
                        'a',
                        'b',
                        'c',
                        'd',
                        'e'
                    ].forEach(
                        function (letter) {

                            const key =
                                'opsi_' +
                                letter;

                            if (
                                question[key] !== undefined &&
                                question[key] !== null &&
                                String(
                                    question[key]
                                ).trim() !== ''
                            ) {

                                options.push({

                                    text:
                                        String(
                                            question[key]
                                        )

                                });

                            }

                        }
                    );


                    return {

                        ...question,

                        shuffledOptions:
                            shuffle(options)

                    };

                }
            );


        loading.classList.add('hidden');

        questionContainer.classList.remove('hidden');

        navigation.classList.remove('hidden');

        btnSubmit.classList.add('hidden');


        currentQuestion = 0;

            renderQuestion();
            
            // Mulai hitung mundur setelah soal siap ditampilkan
            startExamTimer();

    } catch (error) {

        console.error(
            'ERROR MEMUAT SOAL:',
            error
        );


        loading.innerHTML = `

            <div class="text-red-600 font-bold text-lg mb-3">
                Gagal Memuat Soal
            </div>

            <p class="text-gray-600 text-sm mb-4">
                ${escapeHtml(error.message)}
            </p>

            <button
                onclick="location.reload()"
                class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-lg">

                Muat Ulang

            </button>

        `;

    }

}


// ============================================================
// TAMPIL SOAL
// ============================================================

function renderQuestion() {

    if (
        questions.length === 0
    ) {
        return;
    }


    const question =
        questions[currentQuestion];


    const savedAnswer =
        answers[
            String(question.id)
        ];


    let html = `

        <div class="bg-white rounded-xl shadow p-5 md:p-7">

            <div class="flex justify-between items-center mb-5">

                <div class="text-sm font-bold text-blue-600">
                    SOAL ${currentQuestion + 1} / ${questions.length}
                </div>

                <div class="text-sm text-gray-500">
                    ${
                        savedAnswer
                        ? '✓ Sudah dijawab'
                        : 'Belum dijawab'
                    }
                </div>

            </div>


            <div class="text-lg md:text-xl font-semibold leading-relaxed mb-6">

                ${currentQuestion + 1}.
                ${escapeHtml(question.pertanyaan)}

            </div>


            <div class="space-y-3">

    `;


    question.shuffledOptions.forEach(
        function (option, index) {

            const letter =
                String.fromCharCode(
                    65 + index
                );


            const selected =
                savedAnswer ===
                option.text;


            html += `

                <label
                    class="option-item ${
                        selected
                        ? 'selected'
                        : ''
                    } block border-2 border-gray-200 rounded-xl p-4 cursor-pointer">

                    <div class="flex items-start gap-3">

                        <input
                            type="radio"
                            name="question"
                            value="${escapeHtml(option.text)}"
                            ${
                                selected
                                ? 'checked'
                                : ''
                            }
                            class="mt-1 w-5 h-5">

                        <div class="flex gap-3">

                            <span class="font-bold">
                                ${letter}.
                            </span>

                            <span>
                                ${escapeHtml(option.text)}
                            </span>

                        </div>

                    </div>

                </label>

            `;

        }
    );


    html += `

            </div>

        </div>

    `;


    questionContainer.innerHTML =
        html;


    const radios =
        questionContainer.querySelectorAll(
            'input[type="radio"]'
        );


    radios.forEach(
        function (radio) {

            radio.addEventListener(
                'change',
                function () {

                    saveAnswer(
                        question.id,
                        radio.value
                    );

                    renderQuestion();

                }
            );

        }
    );


    updateNavigation();

    updateProgress();

}


// ============================================================
// SIMPAN JAWABAN
// ============================================================

function saveAnswer(
    questionId,
    value
) {

    answers[
        String(questionId)
    ] =
        value;


    localStorage.setItem(
        'cbt_answers',
        JSON.stringify(answers)
    );

}


// ============================================================
// NAVIGASI
// ============================================================

btnPrev.addEventListener(
    'click',
    function () {

        if (
            currentQuestion > 0
        ) {

            currentQuestion--;

            renderQuestion();

            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

        }

    }
);


btnNext.addEventListener(
    'click',
    function () {

        if (
            currentQuestion <
            questions.length - 1
        ) {

            currentQuestion++;

            renderQuestion();

            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

        }

    }
);


// ============================================================
// NAVIGASI + TOMBOL SELESAI
// ============================================================

function updateNavigation() {

    btnPrev.disabled =
        currentQuestion === 0;


    btnPrev.style.opacity =
        currentQuestion === 0
            ? '0.5'
            : '1';


    if (
        currentQuestion ===
        questions.length - 1
    ) {

        btnNext.classList.add(
            'hidden'
        );

        // TOMBOL HANYA DI SOAL TERAKHIR
        btnSubmit.classList.remove(
            'hidden'
        );

    } else {

        btnNext.classList.remove(
            'hidden'
        );

        btnSubmit.classList.add(
            'hidden'
        );

    }

}


// ============================================================
// PROGRESS
// ============================================================

function updateProgress() {

    const total =
        questions.length;


    let answered = 0;


    questions.forEach(
        function (question) {

            if (
                answers[
                    String(question.id)
                ]
            ) {

                answered++;

            }

        }
    );


    progressText.textContent =
        `${answered} / ${total}`;


    const percentage =
        total > 0
            ? (
                answered /
                total *
                100
            )
            : 0;


    progressBar.style.width =
        percentage + '%';

}


// ============================================================
// KLIK SELESAI
// ============================================================

btnSubmit.addEventListener(
    'click',
    async function () {

        if (
            isSubmitting ||
            cheatDetected
        ) {

            return;

        }


        let unanswered = 0;


        questions.forEach(
            function (question) {

                if (
                    !answers[
                        String(question.id)
                    ]
                ) {

                    unanswered++;

                }

            }
        );


        if (
            unanswered > 0
        ) {

            const lanjut =
                confirm(
                    `Masih ada ${unanswered} soal yang belum dijawab.\n\n` +
                    `Apakah Anda yakin ingin menyelesaikan ujian?`
                );


            if (!lanjut) {

                return;

            }

        }


        const yakin =
            confirm(
                'Apakah Anda yakin ingin menyelesaikan ujian?\n\n' +
                'Jawaban yang sudah dikirim tidak dapat diubah.'
            );


        if (!yakin) {

            return;

        }


        await submitExam(false);

    }
);


// ============================================================
// SUBMIT
// ============================================================

async function submitExam(isCheat, isTimeout = false) {

    if (isSubmitting) {
        return;
    }


    isSubmitting = true;

    isExamRunning = false;

    // Hentikan timer saat ujian dikirim
        stopExamTimer();

    cheatDetected =
        isCheat;


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

        submissionId =
            createSubmissionId();

        localStorage.setItem(
            'cbt_submission_id',
            submissionId
        );

    }


    const payload = {

        submission_id:
            submissionId,

        nama:
            studentData.nama,

        kelas:
            studentData.kelas,

        answers:
            answers,

        violations:
            violationCount,

        cheat:
            isCheat,

        submit_time:
            new Date().toISOString()

    };


    try {

        await fetch(
            GAS_URL,
            {

                method: 'POST',

                mode: 'no-cors',

                headers: {

                    'Content-Type':
                        'application/x-www-form-urlencoded;charset=UTF-8'

                },

                body:
                    'payload=' +
                    encodeURIComponent(
                        JSON.stringify(payload)
                    )

            }
        );


        if (isCheat) {

            document
                .getElementById('cheat-popup')
                .querySelector('.mt-5')
                .textContent =
                'Hasil sedang diproses...';

        } else {

            document
                .getElementById('processing-message')
                .textContent =
                'Data diterima. Sistem sedang menghitung nilai...';

        }


        const berhasil =
            await checkSubmission(
                submissionId
            );


        if (!berhasil) {

            throw new Error(
                'Server belum mengonfirmasi penyimpanan.'
            );

        }


        if (isCheat) {

            document
                .getElementById('cheat-popup')
                .querySelector('.mt-5')
                .textContent =
                'Hasil berhasil disimpan.';

            await sleep(800);

        }


        await showResult();


    } catch (error) {

        console.error(
            error
        );


        isSubmitting = false;


        if (isCheat) {

            cheatPopup.classList.add(
                'hidden'
            );

            isExamRunning = false;

            alert(
                'Sistem belum dapat mengonfirmasi penyimpanan hasil.\n\n' +
                'Jangan tutup halaman. Hubungi guru/pengawas.'
            );

        } else {

            hideProcessing();

            isExamRunning = true;

            btnSubmit.disabled = false;

            btnPrev.disabled = false;

            btnNext.disabled = false;

            alert(
                'Jawaban belum dapat dikonfirmasi tersimpan.\n\n' +
                'Jawaban Anda masih tersimpan di perangkat.\n\n' +
                'Silakan coba kirim kembali.'
            );

        }

    }

}


// ============================================================
// CEK SUBMISSION
// ============================================================

async function checkSubmission(id) {

    for (
        let i = 0;
        i < 20;
        i++
    ) {

        try {

            const response =
                await fetch(
                    GAS_URL +
                    '?action=checkSubmission' +
                    '&submission_id=' +
                    encodeURIComponent(id) +
                    '&_=' +
                    Date.now()
                );


            const result =
                await response.json();


            if (
                result.status === 'success' &&
                result.found === true
            ) {

                return true;

            }

        } catch (error) {

            console.log(
                'Cek submission gagal:',
                error
            );

        }


        await sleep(1000);

    }


    return false;

}


// ============================================================
// HASIL
// ============================================================

async function showResult() {

    try {

        const response =
            await fetch(
                GAS_URL +
                '?action=getResult' +
                '&submission_id=' +
                encodeURIComponent(
                    submissionId
                ) +
                '&_=' +
                Date.now()
            );


        const result =
            await response.json();


        if (
            result.status !==
            'success'
        ) {

            throw new Error(
                'Hasil tidak ditemukan.'
            );

        }


        displayResult(
            result.data
        );


        // keluar fullscreen
        try {

            if (
                document.fullscreenElement &&
                document.exitFullscreen
            ) {

                await document.exitFullscreen();

            }

        } catch (error) {}


        // hapus data setelah hasil tampil
        localStorage.removeItem(
            'cbt_answers'
        );

        localStorage.removeItem(
            'cbt_student'
        );

        localStorage.removeItem(
            'cbt_submission_id'
        );

        localStorage.removeItem(
            'cbt_violations'
        );


    } catch (error) {

        console.error(
            error
        );


        hideProcessing();

        cheatPopup.classList.add(
            'hidden'
        );


        alert(
            'Jawaban sudah tersimpan, tetapi hasil belum dapat ditampilkan.\n\n' +
            'Silakan hubungi guru/pengawas.'
        );

    }

}


// ============================================================
// TAMPILKAN HASIL
// ============================================================

function displayResult(data) {

    processingPopup.classList.add(
        'hidden'
    );

    cheatPopup.classList.add(
        'hidden'
    );


    examScreen.classList.add(
        'hidden'
    );


    resultScreen.classList.remove(
        'hidden'
    );


    document.getElementById(
        'result-name'
    ).textContent =
        data.nama || '-';


    document.getElementById(
        'result-class'
    ).textContent =
        'Kelas ' +
        (data.kelas || '-');


    document.getElementById(
        'result-score'
    ).textContent =
        Number(
            data.nilai || 0
        ).toFixed(2);


    document.getElementById(
        'result-correct'
    ).textContent =
        data.benar || 0;


    document.getElementById(
        'result-wrong'
    ).textContent =
        data.salah || 0;


    document.getElementById(
        'result-empty'
    ).textContent =
        data.kosong || 0;


    document.getElementById(
        'result-total'
    ).textContent =
        data.total || 0;


    document.getElementById(
        'result-violations'
    ).textContent =
        data.pelanggaran || 0;


    const status =
        data.status ||
        'UJIAN NORMAL';


    const statusElement =
        document.getElementById(
            'result-status'
        );


    statusElement.textContent =
        status;


    if (
        status ===
        'TERINDIKASI KECURANGAN'
    ) {

        statusElement.className =
            'font-bold rounded-lg p-3 result-status-cheat';


        document.getElementById(
            'result-header'
        ).className =
            'bg-red-600 text-white text-center p-8';


        document.getElementById(
            'result-icon'
        ).textContent =
            '⚠️';


        document.getElementById(
            'result-header-text'
        ).textContent =
            'Ujian dihentikan karena terindikasi kecurangan.';


    } else {

        statusElement.className =
            'font-bold rounded-lg p-3 result-status-normal';


        document.getElementById(
            'result-header'
        ).className =
            'bg-green-600 text-white text-center p-8';


        document.getElementById(
            'result-icon'
        ).textContent =
            '✓';


        document.getElementById(
            'result-header-text'
        ).textContent =
            'Ujian telah selesai dan hasil berhasil direkam.';

    }

}


// ============================================================
// POPUP PROSES
// ============================================================

function showProcessing(
    title,
    message
) {

    document.getElementById(
        'processing-title'
    ).textContent =
        title;


    document.getElementById(
        'processing-message'
    ).textContent =
        message;


    processingPopup.classList.remove(
        'hidden'
    );

}


function hideProcessing() {

    processingPopup.classList.add(
        'hidden'
    );

}


// ============================================================
// SLEEP
// ============================================================

function sleep(ms) {

    return new Promise(
        function (resolve) {

            setTimeout(
                resolve,
                ms
            );

        }
    );

}


// ============================================================
// DETEKSI KECURANGAN
// ============================================================

function registerViolation(
    reason
) {

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
        String(
            violationCount
        )
    );


    console.warn(
        'PELANGGARAN:',
        reason,
        'Jumlah:',
        violationCount
    );


    // SATU PELANGGARAN = HENTIKAN UJIAN
    cheatDetected = true;


    submitExam(true);

}


// ============================================================
// KLIK KANAN
// ============================================================

document.addEventListener(
    'contextmenu',
    function (event) {

        if (
            isExamRunning
        ) {

            event.preventDefault();

            registerViolation(
                'Klik kanan'
            );

        }

    }
);


// ============================================================
// KEYBOARD
// ============================================================

document.addEventListener(
    'keydown',
    function (event) {

        if (
            !isExamRunning
        ) {

            return;

        }


        const key =
            event.key.toLowerCase();


        const forbidden =
            event.key === 'F12' ||
            (
                event.ctrlKey &&
                [
                    'u',
                    'c',
                    'v',
                    's',
                    'p'
                ].includes(key)
            );


        if (forbidden) {

            event.preventDefault();

            registerViolation(
                'Shortcut terlarang: ' +
                event.key
            );

        }

    }
);


// ============================================================
// PINDAH TAB
// ============================================================

document.addEventListener(
    'visibilitychange',
    function () {

        if (
            document.hidden &&
            isExamRunning
        ) {

            registerViolation(
                'Meninggalkan halaman ujian'
            );

        }

    }
);


// ============================================================
// FULLSCREEN
// ============================================================

document.addEventListener(
    'fullscreenchange',
    function () {

        if (
            !document.fullscreenElement &&
            isExamRunning
        ) {

            registerViolation(
                'Keluar dari fullscreen'
            );

        }

    }
);


// ============================================================
// SERVICE WORKER
// ============================================================

if (
    'serviceWorker' in navigator
) {

    window.addEventListener(
        'load',
        function () {

            navigator.serviceWorker
                .register(
                    './service-worker.js'
                )
                .then(
                    function () {

                        console.log(
                            'Service Worker aktif.'
                        );

                    }
                )
                .catch(
                    function (error) {

                        console.log(
                            'Service Worker error:',
                            error
                        );

                    }
                );

        }
    );

}
