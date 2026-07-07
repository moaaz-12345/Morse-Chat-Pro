function textToMorse(){

    let text =
    document.getElementById("inputText")
    .value.toUpperCase();

    let result = "";

    for(let char of text){

        if(morseCode[char]){
            result += morseCode[char] + " ";
        }
    }

    document.getElementById("outputText")
    .value = result.trim();

    saveHistory(text,result.trim());
}

function morseToText(){

    let morse =
    document.getElementById("inputText")
    .value;

    let result = "";

    morse.split(" ").forEach(code=>{

        if(reverseMorse[code]){
            result += reverseMorse[code];
        }
    });

    document.getElementById("outputText")
    .value = result;

    saveHistory(morse,result);
}

function copyResult(){

    navigator.clipboard.writeText(
        document.getElementById("outputText").value
    );

    alert("Copied!");
}

async function playMorse(){

    let code =
    document.getElementById("outputText").value;

    const audio =
    new (window.AudioContext ||
    window.webkitAudioContext)();

    await audio.resume();

    for(let c of code){

        if(c==="." || c==="-"){

            const osc =
            audio.createOscillator();

            osc.connect(audio.destination);

            osc.frequency.value=700;

            osc.start();

            await new Promise(r=>
                setTimeout(
                    r,
                    c==="." ? 100 : 300
                )
            );

            osc.stop();

            await new Promise(r=>
                setTimeout(r,100)
            );
        }
    }
}

function saveHistory(input,output){

    let history =
    JSON.parse(
        localStorage.getItem("history")
    ) || [];

    history.unshift({
        input,
        output,
        date:new Date().toLocaleString()
    });

    history = history.slice(0,20);

    localStorage.setItem(
        "history",
        JSON.stringify(history)
    );
}

function startSpeech(){

    const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

    if(!SpeechRecognition){

        alert(
        "Speech Recognition Not Supported"
        );

        return;
    }

    const recognition =
    new SpeechRecognition();

    recognition.lang =
    document.getElementById(
    "language"
    ).value;

    recognition.interimResults = false;

    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onstart = function(){

        alert("Speak Now...");
    };

    recognition.onresult = function(event){

        let text =
        event.results[0][0].transcript;

        document
        .getElementById("inputText")
        .value = text;

        textToMorse();
    };

    recognition.onerror = function(){

        alert("Microphone Error");
    };
}
async function sendSOS(){

    const audio =
    new(window.AudioContext ||
    window.webkitAudioContext)();

    const sos = "...---...";

    for(let c of sos){

        const osc =
        audio.createOscillator();

        osc.connect(audio.destination);

        osc.frequency.value = 800;

        osc.start();

        await new Promise(r =>
            setTimeout(
                r,
                c==="." ? 100 : 300
            )
        );

        osc.stop();

        await new Promise(r =>
            setTimeout(r,100)
        );
    }
}


function convertTextToMorse(text){

    let result = "";

    for(let char of text.toUpperCase()){

        if(morseCode[char]){

            result += morseCode[char] + " ";
        }
    }

    return result.trim();
}

function convertMorseToText(morse){

    let result = "";

    morse.split(" ").forEach(code=>{

        if(reverseMorse[code]){

            result += reverseMorse[code];
        }
    });

    return result;
}


window.textToMorse = textToMorse;
window.morseToText = morseToText;

