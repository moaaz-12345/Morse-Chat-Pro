let history =
JSON.parse(
localStorage.getItem("history")
) || [];

let div =
document.getElementById("historyList");

history.forEach(item=>{

div.innerHTML += `
<div class="card bg-dark mb-3">

<div class="card-body">

<p><b>Input:</b>
${item.input}</p>

<p><b>Output:</b>
${item.output}</p>

<p>${item.date}</p>

</div>

</div>
`;
});
function clearHistory(){

    localStorage.removeItem("history");

    location.reload();
}