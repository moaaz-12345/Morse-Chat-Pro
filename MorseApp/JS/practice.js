let score = 0;
let correct = 0;
let total = 0;

let currentLetter = "";

let timeLeft = 60;
let gameRunning = false;

let timer = null;

function newQuestion() {

    let letters = Object.keys(morseCode);

    currentLetter =
        letters[
            Math.floor(
                Math.random() * letters.length
            )
        ];

    document.getElementById("question").innerText =
        currentLetter;
}

function checkAnswer() {

    if (!gameRunning) return;

    let answer =
        document
            .getElementById("answer")
            .value
            .trim();

    total++;

    if (answer === morseCode[currentLetter]) {

        correct++;
        score += 10;

        document.getElementById("result").innerHTML =
            "✅ Correct";

    } else {

        document.getElementById("result").innerHTML =
            "❌ Wrong : " +
            morseCode[currentLetter];
    }

    let accuracy =
        ((correct / total) * 100)
            .toFixed(1);

    document.getElementById("accuracy")
        .innerText = accuracy;

    document.getElementById("score")
        .innerText = score;

    document.getElementById("answer")
        .value = "";

    newQuestion();
}

function addDot() {

    document
        .getElementById("answer")
        .value += ".";
}

function addDash() {

    document
        .getElementById("answer")
        .value += "-";
}

function clearAnswer() {

    document
        .getElementById("answer")
        .value = "";
}

document.getElementById("question").innerText =
"Press New Game";

function startNewGame(){

    score = 0;
    correct = 0;
    total = 0;

    timeLeft = 60;
    gameRunning = true;

    document.getElementById("score").innerText = 0;
    document.getElementById("accuracy").innerText = 0;
    document.getElementById("timer").innerText = 60;
    document.getElementById("result").innerHTML = "";

    clearInterval(timer);

    timer = setInterval(() => {

        timeLeft--;

        document.getElementById("timer")
        .innerText = timeLeft;

        if(timeLeft <= 0){

            clearInterval(timer);

            gameRunning = false;

            document.getElementById("result")
            .innerHTML =
            `🏁 Game Over<br>Final Score: ${score}`;
        }

    },1000);

    newQuestion();
}