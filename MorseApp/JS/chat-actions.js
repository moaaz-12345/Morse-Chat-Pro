function sendMessage() {
    const text = messageInput.value.trim();

    if (!selectedUser && !selectedRoom) {
        alert("Choose a user or room first");
        return;
    }

    if (!text) {
        return;
    }

    const payload = {
        from: username,
        to: selectedUser,
        room: selectedRoom,
        text,
        morse: convertTextToMorse(text),
        avatar,
        replyTo: replyMessage,
        time: new Date().toLocaleTimeString()
    };

    socket.emit(selectedRoom ? "room-message" : "private-message", payload, (savedMessage) => {
        if (savedMessage) {
            renderMessage(savedMessage);
        }
    });

    messageInput.value = "";
    replyMessage = null;
    document.getElementById("replyBox").innerHTML = "";
    previewMorse();
}

function toggleMessageMenu(event, id) {
    event.stopPropagation();
    const menu = document.getElementById(`menu-${id}`);
    const button = event.currentTarget;
    const willOpen = !menu.classList.contains("show-menu");

    closeMessageMenus();

    if (willOpen) {
        menu.classList.add("show-menu");
        button.setAttribute("aria-expanded", "true");
    }
}

function closeMessageMenus() {
    document.querySelectorAll(".menu-list.show-menu").forEach((menu) => {
        menu.classList.remove("show-menu");
        menu.previousElementSibling?.setAttribute("aria-expanded", "false");
    });
}

async function copyMessage(id) {
    const message = messageStore.get(id);

    if (!message) {
        return;
    }

    const content = getMessagePlainText(message);
    await navigator.clipboard.writeText(content);
    showToast("Message copied");
    closeMessageMenus();
}

function pinMessage(id) {
    socket.emit("pin-message", { id, username });
    closeMessageMenus();
}

function reactToMessage(id, emoji) {
    socket.emit("react-message", { id, emoji, username });
}

function replaceRenderedMessage(message) {
    const oldRow = document.querySelector(`[data-message-id="${CSS.escape(message.id)}"]`);
    const newRow = renderMessage(message, { append: false, scroll: false });

    if (oldRow && newRow) {
        oldRow.replaceWith(newRow);
    }

    updatePinnedBar();
}

function decodeMessage(id) {
    const message = messageStore.get(id);
    const messageBox = document.getElementById(`msg-${id}`);

    if (!message || !messageBox) {
        return;
    }

    const decodedBox = messageBox.querySelector(".decoded");
    decodedBox.innerHTML = `<strong>Text:</strong> ${escapeHtml(convertMorseToText(message.morse || ""))}`;
    closeMessageMenus();
}

function deleteMessage(id) {
    closeMessageMenus();
    socket.emit("delete-message", id);
}

function editMessage(id) {
    const message = messageStore.get(id);
    const newMorse = prompt("Edit Morse", message?.morse || "");

    if (!newMorse) {
        return;
    }

    closeMessageMenus();
    socket.emit("edit-message", { id, morse: newMorse });
}

function replyToMessage(id) {
    const message = messageStore.get(id);

    if (!message) {
        return;
    }

    replyMessage = {
        id,
        text: message.text || convertMorseToText(message.morse || "") || "Attachment",
        morse: message.morse || ""
    };

    document.getElementById("replyBox").innerHTML = `
        <div class="reply-composer">
            <div>
                <strong>Replying to ${escapeHtml(message.from === username ? "yourself" : message.from)}</strong>
                <p>${escapeHtml(replyMessage.text)}</p>
            </div>
            <button type="button" onclick="cancelReply()" aria-label="Cancel reply">×</button>
        </div>
    `;

    closeMessageMenus();
    messageInput.focus();
}

function cancelReply() {
    replyMessage = null;
    document.getElementById("replyBox").innerHTML = "";
}
