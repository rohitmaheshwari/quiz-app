document.addEventListener('DOMContentLoaded', function () {
    const quizContainer = document.getElementById('quizContainer');
    const resultContainer = document.getElementById('resultContainer');
    const subjectSelect = document.getElementById('subjectSelect');
    const submitButton = document.getElementById('submitButton');
    const startButton = document.getElementById('startButton');
    const timerElement = document.getElementById('timer');
    const welcomeContainer = document.getElementById('welcomeContainer');
    const quizApp = document.getElementById('quizApp');
    const timeLimit = 210 * 60;
    let timeRemaining = localStorage.getItem('timeRemaining') !== null ? parseInt(localStorage.getItem('timeRemaining'), 10) : timeLimit;
    let selectedAnswers = JSON.parse(localStorage.getItem('selectedAnswers')) || {};
    let submitted = JSON.parse(localStorage.getItem('submitted')) || false;
    let quizData = {};
    const quizDataHashKey = 'quizDataHash';

    function saveState() {
        localStorage.setItem('selectedAnswers', JSON.stringify(selectedAnswers));
        localStorage.setItem('timeRemaining', timeRemaining);
        localStorage.setItem('submitted', JSON.stringify(submitted));
    }

    function loadQuestions(subject) {
        quizContainer.innerHTML = '';
        const questions = quizData[subject];

        questions.forEach((questionData, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.classList.add('question');
            questionDiv.innerHTML = `
                <h4>Q${index + 1}: ${questionData.question}</h4>
                ${Object.keys(questionData.options).map(key => `
                    <label>
                        <input type="radio" name="question${index}" value="${key}" ${selectedAnswers[subject] && selectedAnswers[subject][index] === key ? 'checked' : ''}>
                        ${key}. ${questionData.options[key]}
                    </label>
                `).join('')}
            `;
            quizContainer.appendChild(questionDiv);
        });

        const radioButtons = quizContainer.querySelectorAll('input[type="radio"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (event) => {
                const [questionIndex, optionValue] = [event.target.name.replace('question', ''), event.target.value];
                if (!selectedAnswers[subject]) {
                    selectedAnswers[subject] = [];
                }
                selectedAnswers[subject][questionIndex] = optionValue;
                saveState();
            });
        });
    }

    function updateTimer() {
        if (submitted) return;
        const mins = Math.floor(timeRemaining / 60);
        const secs = timeRemaining % 60;
        timerElement.textContent = `Time Remaining: ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        if (timeRemaining > 0) {
            timeRemaining--;
            saveState();
            setTimeout(updateTimer, 1000);
        } else {
            submitTest();
        }
    }

    function submitTest() {
        if (submitted) {
            showResults();
            return;
        }
        const allSubjectsAnswered = Object.keys(quizData).every(subject => {
            const questions = quizData[subject];
            return questions.every((question, index) => selectedAnswers[subject] && selectedAnswers[subject][index] !== undefined);
        });
        if (!allSubjectsAnswered) {
            alert("Please answer all questions in all sections before submitting.");
            return;
        }
        submitted = true;
        saveState();
        showResults();
        exitFullScreen();
    }

    function showResults() {
        quizContainer.innerHTML = '';
        resultContainer.innerHTML = '';
        let totalScore = 0;
        let totalQuestions = 0;

        for (const subject in quizData) {
            const questions = quizData[subject];
            let subjectScore = 0;
            const subjectResultDiv = document.createElement('div');
            subjectResultDiv.classList.add('subject-result');
            const subjectHeader = document.createElement('h3');
            subjectHeader.innerHTML = `${subject} <span class="score">(${subjectScore}/${questions.length})</span>`;
            subjectHeader.classList.add('collapsible');
            subjectResultDiv.appendChild(subjectHeader);

            const subjectContentDiv = document.createElement('div');
            subjectContentDiv.classList.add('content');
            questions.forEach((question, index) => {
                const userAnswer = selectedAnswers[subject] ? selectedAnswers[subject][index] : null;
                const correctAnswer = question.answer;
                const isCorrect = userAnswer === correctAnswer;
                const resultText = isCorrect ? 'Correct' : `Incorrect (Correct answer: ${correctAnswer}. ${question.options[correctAnswer]})`;

                const questionResultDiv = document.createElement('div');
                questionResultDiv.classList.add('question-result');
                questionResultDiv.innerHTML = `
                    <p>Q${index + 1}: ${question.question}</p>
                    <p>Your Answer: ${userAnswer ? `${userAnswer}. ${question.options[userAnswer]}` : 'No answer'}</p>
                    <p>${resultText}</p>
                `;
                subjectContentDiv.appendChild(questionResultDiv);
                if (isCorrect) subjectScore++;
            });

            totalScore += subjectScore;
            totalQuestions += questions.length;
            subjectHeader.innerHTML = `${subject} <span class="score">(${subjectScore}/${questions.length})</span>`;
            subjectResultDiv.appendChild(subjectContentDiv);
            resultContainer.appendChild(subjectResultDiv);
        }

        const totalResultDiv = document.createElement('div');
        totalResultDiv.innerHTML = `<h3>Total Score: ${totalScore} / ${totalQuestions}</h3>`;
        resultContainer.appendChild(totalResultDiv);

        const downloadButton = document.createElement('button');
        downloadButton.textContent = 'Download Results';
        downloadButton.addEventListener('click', downloadResults);
        resultContainer.appendChild(downloadButton);

        document.querySelectorAll('.collapsible').forEach(collapsible => {
            collapsible.addEventListener('click', function () {
                this.classList.toggle('active');
                const content = this.nextElementSibling;
                if (content.style.display === "block") {
                    content.style.display = "none";
                } else {
                    content.style.display = "block";
                }
            });
        });

        resultContainer.style.display = 'block';
        timeRemaining = 0; // Stop the timer
        saveState();
    }

    function downloadResults() {
        let resultText = "";
        let totalScore = 0;
        let totalQuestions = 0;
        for (const subject in quizData) {
            const questions = quizData[subject];
            let subjectScore = 0;
            resultText += `Subject: ${subject}\n\n`;
            questions.forEach((question, index) => {
                const correct = selectedAnswers[subject] && selectedAnswers[subject][index] === question.answer;
                const answerText = correct ? "Correct" : `Incorrect (Correct: ${question.answer}. ${question.options[question.answer]})`;
                resultText += `Q${index + 1}: ${question.question}\nYour Answer: ${selectedAnswers[subject][index] ? `${selectedAnswers[subject][index]}. ${question.options[selectedAnswers[subject][index]]}` : 'No answer'}\n${answerText}\n\n`;
                if (correct) {
                    subjectScore++;
                }
            });
            totalScore += subjectScore;
            totalQuestions += questions.length;
            resultText += `Score: ${subjectScore} / ${questions.length}\n\n`;
        }
        resultText += `Total Score: ${totalScore} / ${totalQuestions}\n`;

        const blob = new Blob([resultText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'quiz_results.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    async function hashQuizData(data) {
        const jsonStr = JSON.stringify(data);
        const hashBuffer = new TextEncoder().encode(jsonStr);
        const hashArray = await crypto.subtle.digest('SHA-256', hashBuffer);
        const hashHex = Array.from(new Uint8Array(hashArray)).map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    function resetStateIfDataChanged(newDataHash) {
        const storedHash = localStorage.getItem(quizDataHashKey);
        if (storedHash !== newDataHash) {
            localStorage.removeItem('selectedAnswers');
            localStorage.removeItem('timeRemaining');
            localStorage.removeItem('submitted');
            selectedAnswers = {};
            timeRemaining = timeLimit;
            submitted = false;
            localStorage.setItem(quizDataHashKey, newDataHash);
        }
    }

    async function loadQuizData() {
        try {
            const response = await fetch('quiz_data.json');
            const data = await response.json();
            const newDataHash = await hashQuizData(data);
            resetStateIfDataChanged(newDataHash);
            quizData = data;
            for (const subject in quizData) {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                subjectSelect.appendChild(option);
            }
            subjectSelect.addEventListener('change', () => {
                if (!submitted) {
                    loadQuestions(subjectSelect.value);
                }
            });
            subjectSelect.value = Object.keys(quizData)[0];
            if (submitted) {
                showResults();
            } else {
                loadQuestions(subjectSelect.value);
                updateTimer();
            }
        } catch (error) {
            console.error('Error loading quiz data:', error);
        }
    }

    startButton.addEventListener('click', () => {
        welcomeContainer.style.display = 'none';
        quizApp.style.display = 'block';
        requestFullScreen();
        loadQuizData();
        updateTimer();
    });

    submitButton.addEventListener('click', submitTest);

    function requestFullScreen() {
        const docElm = document.documentElement;
        if (docElm.requestFullscreen) {
            docElm.requestFullscreen().catch(err => console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
        } else if (docElm.mozRequestFullScreen) {
            docElm.mozRequestFullScreen().catch(err => console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
        } else if (docElm.webkitRequestFullScreen) {
            docElm.webkitRequestFullScreen().catch(err => console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
        } else if (docElm.msRequestFullscreen) {
            docElm.msRequestFullscreen().catch(err => console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
        }
    }

    function exitFullScreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
});
