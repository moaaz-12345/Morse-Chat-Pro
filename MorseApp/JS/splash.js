(function () {
    const splash = document.getElementById("splashScreen");
    const statusText = document.getElementById("splashStatusText");

    if (!splash) {
        return;
    }

    let hidden = false;

    function setSplashStatus(text) {
        if (statusText) {
            statusText.textContent = text;
        }
    }

    function hideSplash() {
        if (hidden) {
            return;
        }

        hidden = true;
        splash.classList.add("is-hidden");

        window.setTimeout(() => {
            splash.remove();
        }, 650);
    }

    setSplashStatus("Initializing");

    window.setTimeout(() => {
        setSplashStatus("Connecting");
    }, 450);

    window.addEventListener("load", () => {
        window.setTimeout(hideSplash, 850);
    });

    window.addEventListener("morse-app-ready", hideSplash);
    window.setTimeout(hideSplash, 2500);

    window.morseSplash = {
        hide: hideSplash,
        setStatus: setSplashStatus
    };
})();
