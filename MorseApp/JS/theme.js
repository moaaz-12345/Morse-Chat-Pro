function toggleTheme(){

    let body = document.body;

    body.classList.toggle("light-mode");

    if(body.classList.contains("light-mode")){

        localStorage.setItem(
            "theme",
            "light"
        );

    }else{

        localStorage.setItem(
            "theme",
            "dark"
        );
    }
}

document.addEventListener("DOMContentLoaded", () => {

    let savedTheme =
    localStorage.getItem("theme");

    if(savedTheme === "light"){

        document.body.classList.add(
            "light-mode"
        );
    }

});