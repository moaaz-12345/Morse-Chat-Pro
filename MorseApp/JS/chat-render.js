function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function isUsableAvatar(value) {
    return Boolean(value && value !== "null" && value !== "undefined");
}

function renderAvatar(source, name, className = "message-avatar") {
    if (isUsableAvatar(source)) {
        return `
            <img
                class="${className}"
                src="${escapeHtml(source)}"
                alt="${escapeHtml(name || "User")} avatar"
                onerror="this.replaceWith(createAvatarFallback('${escapeHtml(name || "?")}'))"
            >
        `;
    }

    return `<span class="${className} avatar-fallback">${escapeHtml((name || "?").charAt(0).toUpperCase())}</span>`;
}

function createAvatarFallback(name) {
    const fallback = document.createElement("span");
    fallback.className = "message-avatar avatar-fallback";
    fallback.textContent = (name || "?").charAt(0).toUpperCase();
    return fallback;
}

function normalizeStatus(status) {
    const value = String(status || "sent").toLowerCase();

    if (value.includes("seen")) {
        return { label: "Seen", icon: "✓✓", className: "seen" };
    }

    if (value.includes("delivered")) {
        return { label: "Delivered", icon: "✓✓", className: "delivered" };
    }

    return { label: "Sent", icon: "✓", className: "sent" };
}

function renderStatus(message) {
    if (message.from !== username) {
        return "";
    }

    const status = normalizeStatus(message.status);
    return `
        <span
            id="status-${escapeHtml(message.id)}"
            class="message-status ${status.className}"
            title="${status.label}"
        >
            ${status.icon} ${status.label}
        </span>
    `;
}

function getMessagePlainText(message) {
    return message.text || convertMorseToText(message.morse || "") || message.morse || "";
}

function showToast(message) {
    notificationArea.classList.remove("d-none");
    notificationArea.textContent = message;
    setTimeout(() => notificationArea.classList.add("d-none"), 2200);
}

function updatePinnedBar() {
    const pinnedMessages = [...messageStore.values()].filter((message) => message.pinned);
    const latestPinned = pinnedMessages.at(-1);

    if (!latestPinned) {
        pinnedBar.hidden = true;
        pinnedBar.textContent = "";
        pinnedBar.onclick = null;
        return;
    }

    const preview = getMessagePlainText(latestPinned) || "Attachment";
    pinnedBar.hidden = false;
    pinnedBar.innerHTML = `
        <span>📌 Pinned</span>
        <strong>${escapeHtml(latestPinned.from === username ? "You" : latestPinned.from || "Unknown")}</strong>
        <em>${escapeHtml(preview.slice(0, 90))}</em>
    `;
    pinnedBar.onclick = () => {
        document
            .querySelector(`[data-message-id="${CSS.escape(latestPinned.id)}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
}

function renderReplyPreview(replyTo) {
    if (!replyTo) {
        return "";
    }

    return `
        <div class="reply-preview">
            <span>Reply</span>
            <p>${escapeHtml(replyTo.text || replyTo.morse || "Message")}</p>
        </div>
    `;
}

function renderAttachments(message) {
    const image = message.image
        ? `<img class="message-image" src="${SERVER_URL}${escapeHtml(message.image)}" alt="Shared image">`
        : "";

    const audio = message.audio
        ? `
            <audio class="message-audio" controls preload="metadata">
                <source src="${SERVER_URL}${escapeHtml(message.audio)}" type="audio/webm">
            </audio>
        `
        : "";

    const file = message.file?.path
        ? renderFileAttachment(message.file)
        : "";

    return image + audio + file;
}

function formatAttachmentSize(bytes = 0) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getFileIcon(mimeType = "") {
    if (mimeType.includes("pdf")) return "📕";
    if (mimeType.includes("word")) return "📘";
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📗";
    if (mimeType.includes("zip")) return "🗜️";
    if (mimeType.startsWith("video/")) return "🎬";
    return "📄";
}

function renderFileAttachment(file) {
    const fileUrl = `${SERVER_URL}${escapeHtml(file.path)}`;
    const fileName = escapeHtml(file.originalName || "Attachment");
    const mimeType = file.mimeType || "";

    if (mimeType.startsWith("video/")) {
        return `
            <video class="message-video" controls preload="metadata">
                <source src="${fileUrl}" type="${escapeHtml(mimeType)}">
            </video>
            <a class="message-download" href="${fileUrl}" download="${fileName}">Download video</a>
        `;
    }

    return `
        <a class="message-file" href="${fileUrl}" download="${fileName}">
            <span>${getFileIcon(mimeType)}</span>
            <div>
                <strong>${fileName}</strong>
                <small>${escapeHtml(mimeType || "file")} · ${formatAttachmentSize(file.size || 0)}</small>
            </div>
            <em>Download</em>
        </a>
    `;
}

function renderActionMenu(message, isOwnMessage) {
    return `
        <div class="message-menu">
            <button
                class="menu-btn"
                type="button"
                aria-label="Message actions"
                aria-expanded="false"
                onclick="toggleMessageMenu(event, '${escapeHtml(message.id)}')"
            >⋮</button>

            <div id="menu-${escapeHtml(message.id)}" class="menu-list" role="menu">
                ${message.morse ? `<button type="button" onclick="decodeMessage('${escapeHtml(message.id)}')">🔓 Decode</button>` : ""}
                <button type="button" onclick="replyToMessage('${escapeHtml(message.id)}')">↩ Reply</button>
                <button type="button" onclick="copyMessage('${escapeHtml(message.id)}')">📋 Copy</button>
                <button type="button" onclick="pinMessage('${escapeHtml(message.id)}')">${message.pinned ? "📌 Unpin" : "📌 Pin"}</button>
                ${isOwnMessage ? `<button type="button" onclick="editMessage('${escapeHtml(message.id)}')">✏ Edit</button>` : ""}
                ${isOwnMessage ? `<button class="danger-action" type="button" onclick="deleteMessage('${escapeHtml(message.id)}')">🗑 Delete</button>` : ""}
            </div>
        </div>
    `;
}

function renderReactions(message) {
    const reactions = message.reactions || {};
    const activeReactions = Object.entries(reactions).filter(([, users]) => users?.length);

    return `
        <div class="reaction-area">
            <div class="reaction-picker" aria-label="React to message">
                ${["❤️", "👍", "😂", "🔥"].map((emoji) => `
                    <button
                        type="button"
                        class="reaction-choice"
                        onclick="reactToMessage('${escapeHtml(message.id)}', '${emoji}')"
                        aria-label="React ${emoji}"
                    >${emoji}</button>
                `).join("")}
            </div>
            ${activeReactions.length ? `
                <div class="reaction-summary">
                    ${activeReactions.map(([emoji, users]) => `
                        <button
                            type="button"
                            class="reaction-pill ${users.includes(username) ? "selected" : ""}"
                            onclick="reactToMessage('${escapeHtml(message.id)}', '${emoji}')"
                            title="${escapeHtml(users.join(", "))}"
                        >
                            ${emoji} <span>${users.length}</span>
                        </button>
                    `).join("")}
                </div>
            ` : ""}
        </div>
    `;
}

function renderMessage(message, options = {}) {
    if (!message || !message.id) {
        return null;
    }

    messageStore.set(message.id, message);

    const isOwnMessage = message.from === username;
    const senderName = isOwnMessage ? "You" : (message.from || "Unknown user");
    const senderAvatar = isOwnMessage
        ? avatar
        : (message.avatar || userAvatars.get(message.from));

    const row = document.createElement("div");
    row.className = `message-row ${isOwnMessage ? "my-message-row" : "other-message-row"}`;
    row.dataset.messageId = message.id;

    row.innerHTML = `
        ${renderAvatar(senderAvatar, message.from || username)}
        <article id="msg-${escapeHtml(message.id)}" class="message ${isOwnMessage ? "my-message" : "other-message"}">
            ${renderActionMenu(message, isOwnMessage)}
            <header class="message-header">
                <span class="message-sender">${escapeHtml(senderName)}</span>
                ${message.pinned ? `<span class="pinned-label" title="Pinned message">📌 Pinned</span>` : ""}
            </header>

            ${renderReplyPreview(message.replyTo)}

            ${message.morse ? `<p id="body-${escapeHtml(message.id)}" class="message-body">${escapeHtml(message.morse)}</p>` : ""}
            ${renderAttachments(message)}

            <div class="decoded" aria-live="polite"></div>

            ${renderReactions(message)}

            <footer class="message-info">
                ${message.edited ? `<span class="edited-label">edited</span>` : ""}
                <time>${escapeHtml(message.time || "")}</time>
                ${renderStatus(message)}
            </footer>
        </article>
    `;

    if (options.append !== false) {
        messagesElement.appendChild(row);
    }

    if (options.scroll !== false) {
        messagesElement.scrollTop = messagesElement.scrollHeight;
    }

    updatePinnedBar();

    return row;
}
