socket.on("receive-message", (data) => {
    if (isUserBlocked(data.from) || wasMessageSentDuringBlock(data)) {
        return;
    }

    if (data.from !== selectedUser) {
        unreadCounts[data.from] = (unreadCounts[data.from] || 0) + 1;
        updateUsersList();
    } else {
        renderMessage(data);
        socket.emit("message-seen", data.id);
    }

    if (isUserMuted(data.from)) {
        return;
    }

    notificationArea.classList.remove("d-none");
    notificationArea.textContent = `🔔 New message from ${data.from}`;

    if (soundEnabled) {
        notifySound.play().catch(() => {});
    }

    setTimeout(() => notificationArea.classList.add("d-none"), 3000);
});

socket.on("chat-history", (history) => {
    messagesElement.innerHTML = "";
    messageStore.clear();
    history
        .filter((message) => !wasMessageSentDuringBlock(message))
        .forEach((message) => renderMessage(message, { scroll: false }));
    history
        .filter((message) => message.to === username && message.status !== "seen" && !wasMessageSentDuringBlock(message))
        .forEach((message) => socket.emit("message-seen", message.id));
    updatePinnedBar();
    messagesElement.scrollTop = messagesElement.scrollHeight;
});

socket.on("room-history", (history) => {
    messagesElement.innerHTML = "";
    messageStore.clear();
    history
        .filter((message) => !wasMessageSentDuringBlock(message))
        .forEach((message) => renderMessage(message, { scroll: false }));
    updatePinnedBar();
    messagesElement.scrollTop = messagesElement.scrollHeight;
});

socket.on("receive-room-message", (data) => {
    if (isUserBlocked(data.from) || wasMessageSentDuringBlock(data)) {
        return;
    }

    if (data.room === selectedRoom) {
        renderMessage(data);
        return;
    }

    roomUnreadCounts[data.room] = (roomUnreadCounts[data.room] || 0) + 1;
    updateRoomBadges();
    showToast(`#${data.room}: new message from ${data.from}`);
});

socket.on("users-list", (data) => {
    let html = "";

    data.users.forEach((user) => {
        userAvatars.set(user.username, user.avatar);

        if (user.username !== username) {
            html += `
                <button
                    id="user-${escapeHtml(user.username)}"
                    class="user-list-item"
                    type="button"
                    onclick="selectUser('${escapeHtml(user.username)}')"
                >
                    <span
                        class="user-list-avatar-action"
                        role="button"
                        tabindex="0"
                        onclick="event.stopPropagation(); openUserProfile('${escapeHtml(user.username)}')"
                        onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.stopPropagation(); openUserProfile('${escapeHtml(user.username)}'); }"
                        aria-label="View ${escapeHtml(user.username)} profile"
                    >
                        ${renderAvatar(user.avatar, user.username, "user-list-avatar")}
                    </span>
                    <span class="user-list-details">
                        <strong>${escapeHtml(user.username)}</strong>
                        <small data-base-status="Online">Online</small>
                        <span class="badge-area"></span>
                    </span>
                    <span
                        class="user-profile-btn"
                        role="button"
                        tabindex="0"
                        onclick="event.stopPropagation(); openUserProfile('${escapeHtml(user.username)}')"
                        onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.stopPropagation(); openUserProfile('${escapeHtml(user.username)}'); }"
                        aria-label="View ${escapeHtml(user.username)} profile"
                    >ℹ</span>
                </button>
            `;
        }
    });

    Object.entries(data.lastSeen || {}).forEach(([name, seenAt]) => {
        const online = data.users.some((user) => user.username === name);

        if (!online && name !== username) {
            html += `
                <div class="user-list-item offline-user">
                    <button
                        class="user-list-avatar-action"
                        type="button"
                        onclick="openUserProfile('${escapeHtml(name)}')"
                        aria-label="View ${escapeHtml(name)} profile"
                    >
                        ${renderAvatar(userAvatars.get(name), name, "user-list-avatar")}
                    </button>
                    <span class="user-list-details">
                        <strong>${escapeHtml(name)}</strong>
                        <small data-base-status="Last seen ${escapeHtml(seenAt)}">Last seen ${escapeHtml(seenAt)}</small>
                    </span>
                    <button
                        class="user-profile-btn offline-profile-btn"
                        type="button"
                        onclick="openUserProfile('${escapeHtml(name)}')"
                        aria-label="View ${escapeHtml(name)} profile"
                    >ℹ</button>
                </div>
            `;
        }
    });

    document.getElementById("onlineUsers").innerHTML = html || `
        <div class="empty-users">
            <span>👋</span>
            <p>No contacts online yet.</p>
            <small>Open another account to start chatting.</small>
        </div>
    `;
    updateUsersList();
    updateChatHeaderProfile(selectedUser);
});

socket.on("user-typing", (data) => {
    if (isUserBlocked(data.from)) {
        return;
    }

    document.getElementById("typingStatus").textContent = `${data.from} is typing...`;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        document.getElementById("typingStatus").textContent = "";
    }, 1500);
});

socket.on("message-deleted", (id) => {
    document.querySelector(`[data-message-id="${CSS.escape(id)}"]`)?.remove();
    messageStore.delete(id);
});

socket.on("message-edited", (message) => {
    replaceRenderedMessage(message);
});

socket.on("message-reacted", replaceRenderedMessage);
socket.on("message-pinned", replaceRenderedMessage);

socket.on("message-action-denied", (data) => {
    showToast(data?.error || "You are not allowed to perform this action.");
});

socket.on("message-status", (data) => {
    const storedMessage = messageStore.get(data.id);

    if (storedMessage) {
        storedMessage.status = data.status;
    }

    const statusElement = document.getElementById(`status-${data.id}`);

    if (statusElement) {
        const status = normalizeStatus(data.status);
        statusElement.className = `message-status ${status.className}`;
        statusElement.textContent = `${status.icon} ${status.label}`;
        statusElement.title = status.label;
    }
});
