/* =====================================================
   KONFIGURASI
===================================================== */

/*
   URL WEB APP GOOGLE APPS SCRIPT ANDA
*/
const GAS_URL =
    'https://script.google.com/macros/s/AKfycbzGHHZ3FSIaTZW9lEpYAd-bLndtNKynVTBOvDIr4P7O8icMD7ItBd3Vq70cMHRKRYtiqw/exec';


/* =====================================================
   STATE
===================================================== */

let isExamRunning = false;

let questions = [];

let answers =
    JSON.parse(
        localStorage.getItem('cbt_answers') || '{}'
    );

let studentData =
    JSON.parse(
        localStorage.getItem('cbt_student') || 'null'
    );


/* =====================================================
   DOM
===================================================== */

const startScreen =
    document.getElementById('start-screen');

const examScreen =
    document.getElementById('exam-screen');

const btnMulai =
    document.getElementById('btn-mulai');

const btnSubmit =
    document.getElementById('btn-submit');

const questionContainer =
    document.getElementById('question-container');

const loading =
    document.getElementById('loading');

const studentInfo =
    document.getElementById('student-info');

const progressInfo =
    document.getElementById('progress-info');

const statusMessage =
    document.getElementById('status-message');


/* =====================================================
   MULAI UJIAN
===================================================== */

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
                .value
                .trim();


        if (!nama) {

            alert(
                'Nama lengkap wajib diisi.'
            );

            return;
        }


        if (!kelas) {

            alert(
                'Kelas wajib diisi.'
            );

            return;
        }


        /*
           Simpan identitas
        */

        studentData = {
            nama: nama,
            kelas: kelas
        };


        localStorage.setItem(
            'cbt_student',
            JSON.stringify(studentData)
        );


        /*
           Fullscreen
        */

        try {

            if (
                document.documentElement
                    .requestFullscreen
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


/* =====================================================
   START EXAM
===================================================== */

async function startExam() {

    isExamRunning = true;


    startScreen.classList.add(
        'hidden'
    );


    examScreen.classList.remove(
        'hidden'
    );


    examScreen.classList.add(
        'flex'
    );


    studentInfo.textContent =
        studentData.nama +
        ' • ' +
        studentData.kelas;


    await fetchQuestions();

}


/* =====================================================
   AMBIL SOAL DARI GAS
===================================================== */

async function fetchQuestions() {

    try {

        loading.textContent =
            'Memuat soal...';


        const response =
            await fetch(
                GAS_URL + '?action=getQuestions',
                {
                    method: 'GET',
                    cache: 'no-store'
                }
            );


        if (!response.ok) {

            throw new Error(
                'Server mengembalikan HTTP ' +
                response.status
            );

        }


        const result =
            await response.json();


        console.log(
            'DATA SOAL:',
            result
        );


        if (
            result.status !==
            'success'
        ) {

            throw new Error(
                result.message ||
                'Gagal mengambil soal.'
            );

        }


        questions =
            Array.isArray(result.data)
                ? result.data
                : [];


        if (
            questions.length === 0
        ) {

            throw new Error(
                'Tidak ada soal yang ditemukan.'
            );

        }


        renderQuestions();


    } catch (error) {

        console.error(
            'ERROR SOAL:',
            error
        );


        loading.innerHTML = `

            <div class="text-red-600">

                <div class="text-4xl mb-3">
                    ⚠️
                </div>

                <p class="font-bold">
                    Gagal memuat soal
                </p>

                <p class="text-sm mt-2">
                    ${escapeHtml(error.message)}
                </p>

                <button
                    onclick="location.reload()"
                    class="
                        mt-4
                        bg-blue-600
                        text-white
                        px-4
                        py-2
                        rounded
                    "
                >
                    Muat Ulang
                </button>

            </div>

        `;

    }

}


/* =====================================================
   RENDER SOAL
===================================================== */

function renderQuestions() {

    loading.classList.add(
        'hidden'
    );


    questionContainer.classList.remove(
        'hidden'
    );


    btnSubmit.classList.remove(
        'hidden'
    );


    questionContainer.innerHTML =
        '';


    questions.forEach(
        function (q, index) {

            const qDiv =
                document.createElement(
                    'div'
                );


            qDiv.className =
                'bg-white p-5 md:p-6 rounded-xl shadow border border-gray-200';


            const questionText =
                escapeHtml(
                    q.pertanyaan || ''
                );


            let html = `

                <div class="mb-4">

                    <div
                        class="
                            text-xs
                            font-bold
                            text-blue-600
                            mb-2
                        "
                    >
                        SOAL ${index + 1}
                    </div>

                    <p
                        class="
                            font-semibold
                            text-gray-800
                            leading-relaxed
                        "
                    >
                        ${questionText}
                    </p>

                </div>

                <div class="space-y-2">

            `;


            const options =
                ['a', 'b', 'c', 'd'];


            options.forEach(
                function (opt) {

                    const key =
                        'opsi_' + opt;


                    if (
                        q[key] !== undefined &&
                        q[key] !== null &&
                        q[key] !== ''
                    ) {

                        const checked =
                            answers[q.id] === opt
                                ? 'checked'
                                : '';


                        const selected =
                            answers[q.id] === opt
                                ? 'selected'
                                : '';


                        html += `

                            <label
                                class="
                                    option-card
                                    ${selected}
                                    flex
                                    items-start
                                    gap-3
                                    cursor-pointer
                                    p-3
                                    border
                                    rounded-lg
                                "
                            >

                                <input
                                    type="radio"
                                    name="q_${escapeHtml(String(q.id))}"
                                    value="${opt}"
                                    ${checked}
                                    class="
                                        mt-1
                                        h-4
                                        w-4
                                    "
                                >

                                <span>

                                    <strong>
                                        ${opt.toUpperCase()}.
                                    </strong>

                                    ${escapeHtml(
                                        String(q[key])
                                    )}

                                </span>

                            </label>

                        `;

                    }

                }
            );


            html += `
                </div>
            `;


            qDiv.innerHTML =
                html;


            questionContainer.appendChild(
                qDiv
            );


            /*
               Event radio
            */

            const radios =
                qDiv.querySelectorAll(
                    'input[type="radio"]'
                );


            radios.forEach(
                function (radio) {

                    radio.addEventListener(
                        'change',
                        function () {

                            saveAnswer(
                                q.id,
                                radio.value
                            );


                            /*
                               Visual selected
                            */

                            qDiv
                                .querySelectorAll(
                                    '.option-card'
                                )
                                .forEach(
                                    function (
                                        card
                                    ) {

                                        card.classList.remove(
                                            'selected'
                                        );

                                    }
                                );


                            radio
                                .closest(
                                    '.option-card'
                                )
                                .classList.add(
                                    'selected'
                                );

                        }
                    );

                }
            );

        }
    );


    updateProgress();

}


/* =====================================================
   SIMPAN JAWABAN
===================================================== */

function saveAnswer(
    questionId,
    value
) {

    answers[
        String(questionId)
    ] = value;


    localStorage.setItem(
        'cbt_answers',
        JSON.stringify(answers)
    );


    updateProgress();

}


/* =====================================================
   PROGRESS
===================================================== */

function updateProgress() {

    const total =
        questions.length;

    const answered =
        Object.keys(answers).filter(
            function (id) {

                return questions.some(
                    function (q) {

                        return String(q.id) ===
                            String(id);

                    }
                );

            }
        ).length;


    progressInfo.textContent =
        answered +
        ' / ' +
        total +
        ' dijawab';

}


/* =====================================================
   KIRIM JAWABAN
===================================================== */

btnSubmit.addEventListener(
    'click',
    async function () {

        if (
            questions.length === 0
        ) {

            alert(
                'Soal belum tersedia.'
            );

            return;
        }


        const answered =
            Object.keys(answers).length;


        if (
            answered < questions.length
        ) {

            const proceed =
                confirm(
                    'Masih ada soal yang belum dijawab.\n\n' +
                    'Apakah Anda yakin ingin mengirim jawaban?'
                );


            if (!proceed) {

                return;

            }

        }


        const yakin =
            confirm(
                'Apakah Anda yakin ingin mengakhiri ujian dan mengirim jawaban?'
            );


        if (!yakin) {

            return;

        }


        btnSubmit.disabled =
            true;

        btnSubmit.textContent =
            'Mengirim jawaban...';


        statusMessage.textContent =
            'Sedang mengirim data. Jangan tutup halaman.';


        /*
           Data yang dikirim ke Apps Script
        */

        const payload =
            new URLSearchParams();


        payload.append(
            'action',
            'submitAnswers'
        );


        payload.append(
            'nama',
            studentData.nama
        );


        payload.append(
            'kelas',
            studentData.kelas
        );


        payload.append(
            'payload',
            JSON.stringify(answers)
        );


        payload.append(
            'total_soal',
            String(questions.length)
        );


        payload.append(
            'total_dijawab',
            String(answered)
        );


        payload.append(
            'waktu_kirim',
            new Date().toISOString()
        );


        try {

            /*
               Kirim ke Apps Script.
               
               mode no-cors TIDAK digunakan.
               Kita ingin membaca respons server.
            */

            const response =
                await fetch(
                    GAS_URL,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/x-www-form-urlencoded;charset=UTF-8'
                        },

                        body:
                            payload.toString()
                    }
                );


            if (!response.ok) {

                throw new Error(
                    'Server HTTP ' +
                    response.status
                );

            }


            const result =
                await response.json();


            console.log(
                'RESPONS PENGIRIMAN:',
                result
            );


            if (
                result.status !==
                'success'
            ) {

                throw new Error(
                    result.message ||
                    'Server menolak data.'
                );

            }


            /*
               SUKSES
            */

            isExamRunning =
                false;


            localStorage.removeItem(
                'cbt_answers'
            );

            localStorage.removeItem(
                'cbt_student'
            );


            try {

                if (
                    document.fullscreenElement &&
                    document.exitFullscreen
                ) {

                    await document.exitFullscreen();

                }

            } catch (error) {

                console.log(
                    'Gagal keluar fullscreen:',
                    error
                );

            }


            questionContainer.innerHTML = `

                <div
                    class="
                        bg-white
                        rounded-2xl
                        shadow-lg
                        p-8
                        text-center
                    "
                >

                    <div class="text-6xl mb-4">
                        ✅
                    </div>

                    <h2
                        class="
                            text-2xl
                            font-bold
                            text-green-600
                            mb-3
                        "
                    >
                        Jawaban Berhasil Dikirim
                    </h2>

                    <p
                        class="
                            text-gray-600
                            mb-2
                        "
                    >
                        Data jawaban Anda telah diterima oleh sistem.
                    </p>

                    <p
                        class="
                            text-sm
                            text-gray-400
                        "
                    >
                        Anda dapat menutup halaman ini.
                    </p>

                </div>

            `;


            btnSubmit.classList.add(
                'hidden'
            );


            statusMessage.textContent =
                'Pengiriman berhasil.';


        } catch (error) {

            console.error(
                'ERROR PENGIRIMAN:',
                error
            );


            btnSubmit.disabled =
                false;


            btnSubmit.textContent =
                'Kirim Ulang';


            statusMessage.textContent =
                '';


            alert(
                'JAWABAN BELUM TERKIRIM.\n\n' +
                error.message +
                '\n\n' +
                'Jawaban masih tersimpan di browser. Silakan coba Kirim Ulang.'
            );

        }

    }
);


/* =====================================================
   ANTI-CHEAT
===================================================== */


/*
   Klik kanan
*/

document.addEventListener(
    'contextmenu',
    function (e) {

        if (isExamRunning) {

            e.preventDefault();

        }

    }
);


/*
   Shortcut keyboard
*/

document.addEventListener(
    'keydown',
    function (e) {

        if (!isExamRunning) {

            return;

        }


        const key =
            e.key.toLowerCase();


        if (
            e.key === 'F12' ||
            (
                e.ctrlKey &&
                [
                    'u',
                    'c',
                    'v',
                    's',
                    'p'
                ].includes(key)
            ) ||
            (
                e.ctrlKey &&
                e.shiftKey &&
                ['i', 'j', 'c'].includes(key)
            )
        ) {

            e.preventDefault();

        }

    }
);


/*
   Ganti tab
*/

document.addEventListener(
    'visibilitychange',
    function () {

        if (
            document.hidden &&
            isExamRunning
        ) {

            alert(
                'PERINGATAN ANTI-CHEAT:\n\n' +
                'Anda terdeteksi meninggalkan halaman ujian.'
            );

        }

    }
);


/*
   Keluar fullscreen
*/

document.addEventListener(
    'fullscreenchange',
    function () {

        if (
            !document.fullscreenElement &&
            isExamRunning
        ) {

            alert(
                'PERINGATAN:\n\n' +
                'Anda keluar dari mode layar penuh.'
            );

        }

    }
);


/* =====================================================
   SERVICE WORKER
===================================================== */

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
                    function (registration) {

                        console.log(
                            'Service Worker aktif:',
                            registration.scope
                        );

                    }
                )
                .catch(
                    function (error) {

                        console.error(
                            'Service Worker gagal:',
                            error
                        );

                    }
                );

        }
    );

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value) {

    return String(value)
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        );

}
