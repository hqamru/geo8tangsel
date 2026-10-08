// ============================================================
// CBT GEOGRAFI SMAN 8 KOTA TANGERANG SELATAN
// ============================================================

// URL Google Apps Script
const GAS_URL =
    'https://script.google.com/macros/s/AKfycbwVdZBp5P1vSfFWKCeLOY8YLwpoDDj5UpiCxdIYBLG5HgIgo-jua-UrGt6i9YkjavDB_Q/exec';


// ============================================================
// DATA UJIAN
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


// ============================================================
// AMBIL ELEMEN HTML
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


// ============================================================
// PENGAMAN
// ============================================================

if (!btnMulai) {

    console.error(
        'ERROR: btn-mulai tidak ditemukan.'
    );

} else {

    console.log(
        'CBT JavaScript berhasil dimuat.'
    );

}


// ============================================================
// FUNGSI ACAK
// ============================================================

function shuffle(array) {

    const result =
        [...array];

    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
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
// ESCAPE HTML
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
// TOMBOL MULAI
// ============================================================

btnMulai.addEventListener(
    'click',
    async function () {

        console.log(
            'Tombol Mulai Ujian diklik.'
        );


        const nama =
            document
                .getElementById('input-nama')
                .value
                .trim();


        const kelas =
            document
                .getElementById('input-kelas')
                .value;


        // Validasi nama
        if (!nama) {

            alert(
                'Nama lengkap wajib diisi.'
            );

            document
                .getElementById('input-nama')
                .focus();

            return;
        }


        // Validasi kelas
        if (!kelas) {

            alert(
                'Silakan pilih kelas terlebih dahulu.'
            );

            document
                .getElementById('input-kelas')
                .focus();

            return;
        }


        // Simpan data siswa
        studentData = {

            nama: nama,

            kelas: kelas

        };


        localStorage.setItem(
            'cbt_student',
            JSON.stringify(studentData)
        );


        // Reset pelanggaran
        violationCount = 0;

        localStorage.setItem(
            'cbt_violations',
            '0'
        );


        // Buat ID ujian baru
        submissionId =
            'CBT-' +
            Date.now() +
            '-' +
            Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();


        localStorage.setItem(
            'cbt_submission_id',
            submissionId
        );


        // Jika jawaban lama tidak cocok,
        // kosongkan jawaban
        answers = {};

        localStorage.setItem(
            'cbt_answers',
            JSON.stringify(answers)
        );


        // Masuk fullscreen
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
                'Fullscreen tidak tersedia:',
                error
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


    startScreen.classList.add(
        'hidden'
    );


    examScreen.classList.remove(
        'hidden'
    );


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

    loading.classList.remove(
        'hidden'
    );


    try {

        console.log(
            'Mengambil soal dari Google Apps Script...'
        );


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


        console.log(
            'Data soal:',
            result
        );


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


        // ====================================================
        // ACAK URUTAN SOAL
        // ====================================================

        questions =
            shuffle(
                result.data
            );


        // ====================================================
        // ACAK PILIHAN JAWABAN
        // ====================================================

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
                                question[key] !==
                                    undefined &&
                                question[key] !==
                                    null &&
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


        loading.classList.add(
            'hidden'
        );


        questionContainer.classList.remove(
            'hidden'
        );


        navigation.classList.remove(
            'hidden'
        );


        btnSubmit.classList.remove(
            'hidden'
        );


        currentQuestion = 0;


        renderQuestion();


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
// TAMPILKAN SOAL
// ============================================================

function renderQuestion() {

    if (
        questions.length === 0
    ) {

        return;

    }


    const question =
        questions[
            currentQuestion
        ];


    const savedAnswer =
        answers[
            String(question.id)
        ];


    let html = `

        <div class="bg-white rounded-xl shadow p-5 md:p-7">

            <div class="flex justify-between items-center mb-5">

                <div class="text-sm font-bold text-blue-600">

                    SOAL
                    ${currentQuestion + 1}
                    /
                    ${questions.length}

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


    // ========================================================
    // EVENT RADIO
    // ========================================================

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


    console.log(
        'Jawaban tersimpan:',
        questionId,
        value
    );

}


// ============================================================
// TOMBOL SEBELUMNYA
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


// ============================================================
// TOMBOL BERIKUTNYA
// ============================================================

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
// NAVIGASI
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

    } else {

        btnNext.classList.remove(
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
// KIRIM JAWABAN
// ============================================================

btnSubmit.addEventListener(
    'click',
    async function () {

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
                    `Apakah Anda yakin ingin mengirim?`
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


        await submitExam();

    }
);


// ============================================================
// SUBMIT KE GOOGLE APPS SCRIPT
// ============================================================

async function submitExam() {

    btnSubmit.disabled =
        true;


    btnSubmit.textContent =
        'Mengirim jawaban...';


    if (!submissionId) {

        submissionId =
            'CBT-' +
            Date.now() +
            '-' +
            Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();


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


        btnSubmit.textContent =
            'Memeriksa penyimpanan...';


        const berhasil =
            await checkSubmission(
                submissionId
            );


        if (!berhasil) {

            throw new Error(
                'Server belum mengonfirmasi.'
            );

        }


        await showResult();

    } catch (error) {

        console.error(
            error
        );


        alert(
            'Jawaban belum dapat dikonfirmasi tersimpan.\n\n' +
            'Jawaban Anda masih tersimpan di perangkat.\n\n' +
            'Jangan tutup halaman. Silakan klik Kirim Ulang.'
        );


        btnSubmit.disabled =
            false;


        btnSubmit.textContent =
            'Kirim Ulang Jawaban';

    }

}


// ============================================================
// CEK SUBMISSION
// ============================================================

async function checkSubmission(
    id
) {

    for (
        let i = 0;
        i < 15;
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


            console.log(
                'Cek submission:',
                result
            );


            if (
                result.status ===
                    'success' &&
                result.found === true
            ) {

                return true;

            }

        } catch (error) {

            console.log(
                'Cek gagal:',
                error
            );

        }


        await sleep(1000);

    }


    return false;

}


// ============================================================
// TAMPILKAN HASIL
// ============================================================

async function showResult() {

    isExamRunning = false;


    const id =
        submissionId;


    try {

        const response =
            await fetch(
                GAS_URL +
                '?action=getResult' +
                '&submission_id=' +
                encodeURIComponent(id) +
                '&_=' +
                Date.now()
            );


        const result =
            await response.json();


        console.log(
            'HASIL:',
            result
        );


        if (
            result.status ===
            'success'
        ) {

            displayResult(
                result.data
            );

        } else {

            throw new Error(
                'Hasil tidak ditemukan.'
            );

        }

    } catch (error) {

        console.error(
            error
        );


        alert(
            'Jawaban sudah tersimpan, tetapi hasil nilai belum dapat ditampilkan. Silakan hubungi guru.'
        );

        return;

    }


    // Keluar fullscreen
    try {

        if (
            document.fullscreenElement &&
            document.exitFullscreen
        ) {

            await document.exitFullscreen();

        }

    } catch (error) {}


    // Hapus data setelah benar-benar sukses
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

}


// ============================================================
// HASIL
// ============================================================

function displayResult(data) {

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
// ANTI CHEAT
// ============================================================

document.addEventListener(
    'contextmenu',
    function (event) {

        if (
            isExamRunning
        ) {

            event.preventDefault();

        }

    }
);


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


        if (
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
            )
        ) {

            event.preventDefault();


            violationCount++;


            localStorage.setItem(
                'cbt_violations',
                violationCount
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

            violationCount++;


            localStorage.setItem(
                'cbt_violations',
                violationCount
            );


            alert(
                'PERINGATAN!\n\n' +
                'Anda terdeteksi meninggalkan halaman ujian.\n\n' +
                'Aktivitas dicatat oleh sistem.'
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

            violationCount++;


            localStorage.setItem(
                'cbt_violations',
                violationCount
            );


            alert(
                'PERINGATAN!\n\n' +
                'Anda keluar dari layar penuh.'
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
