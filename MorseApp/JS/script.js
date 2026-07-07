const morse = {
A:".-", B:"-...", C:"-.-.", D:"-..",
E:".", F:"..-.", G:"--.", H:"....",
I:"..", J:".---", K:"-.-", L:".-..",
M:"--", N:"-.", O:"---", P:".--.",
Q:"--.-", R:".-.", S:"...", T:"-",
U:"..-", V:"...-", W:".--", X:"-..-",
Y:"-.--", Z:"--..",
1:".----",2:"..---",3:"...--",
4:"....-",5:".....",6:"-....",
7:"--...",8:"---..",9:"----.",
0:"-----"," ":"/"
};

const reverseMorse = {};
for(let key in morse){
    reverseMorse[morse[key]] = key;
}

function textToMorse(){
    let text = document
        .getElementById("inputText")
        .value
        .toUpperCase();

    let result = text.split('')
        .map(ch => morse[ch] || '')
        .join(' ');

    document.getElementById("outputText").value = result;
}

function morseToText(){
    let code = document
        .getElementById("inputText")
        .value;

    let result = code.split(' ')
        .map(c => reverseMorse[c] || '')
        .join('');

    document.getElementById("outputText").value = result;
}

function copyResult(){
    navigator.clipboard.writeText(
        document.getElementById("outputText").value
    );
    alert("Copied!");
}

async function playMorse(){

    let text = document
        .getElementById("outputText")
        .value;

    const ctx = new AudioContext();

    for(let symbol of text){

        if(symbol === '.' || symbol === '-'){

            const osc = ctx.createOscillator();
            osc.connect(ctx.destination);

            osc.frequency.value = 700;

            osc.start();

            await new Promise(r =>
                setTimeout(r, symbol==='.' ? 100 : 300)
            );

            osc.stop();

            await new Promise(r => setTimeout(r,100));
        }
        else{
            await new Promise(r => setTimeout(r,200));
        }
    }
}