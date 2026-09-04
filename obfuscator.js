// ============================================================
// LuaScator Web v25.0 — Frontend Logic
// ============================================================

const inputCode = document.getElementById("inputCode");
const output = document.getElementById("output");
const obfuscateBtn = document.getElementById("obfuscateBtn");
const clearBtn = document.getElementById("clearBtn");
const loadExampleBtn = document.getElementById("loadExampleBtn");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearOutputBtn = document.getElementById("clearOutputBtn");
const statusText = document.getElementById("statusText");
const statusDot = document.getElementById("statusDot");
const timerDisplay = document.getElementById("timerDisplay");
const outputCount = document.getElementById("outputCount");
const loaderOverlay = document.getElementById("loaderOverlay");
const loaderText = document.getElementById("loaderText");
const progressBar = document.getElementById("progressBar");
const levelSelect = document.getElementById("levelSelect");
const keysSelect = document.getElementById("keysSelect");
const junkSelect = document.getElementById("junkSelect");
const protectionSelect = document.getElementById("protectionSelect");
const vmSelect = document.getElementById("vmSelect");
const antiDebugSelect = document.getElementById("antiDebugSelect");

let startTime = 0, timerInterval = null, isProcessing = false, csrfToken = null;

async function getCSRFToken() {
    try {
        const response = await fetch("/csrf-token");
        const data = await response.json();
        csrfToken = data.token;
        return csrfToken;
    } catch { return null; }
}
getCSRFToken();

const exampleCode = [
    "-- Простой пример",
    "local Players = game:GetService(\"Players\")",
    "local LocalPlayer = Players.LocalPlayer",
    "",
    "print(\"Привет, Roblox!\")",
    "",
    "local function onCharacterAdded(char)",
    "    print(\"Персонаж заспавнился!\")",
    "end",
    "",
    "LocalPlayer.CharacterAdded:Connect(onCharacterAdded)",
    "",
    "while true do",
    "    task.wait(1)",
    "    print(\"Tick!\")",
    "end"
].join("\n");

loadExampleBtn.addEventListener("click", function() {
    inputCode.value = exampleCode;
    setStatus("📂 Пример загружен", "idle");
});

clearBtn.addEventListener("click", function() {
    inputCode.value = "";
    setStatus("🗑 Очищено", "idle");
});

clearOutputBtn.addEventListener("click", function() {
    output.innerHTML = "";
    outputCount.textContent = "0 символов";
    setStatus("🗑 Вывод очищен", "idle");
});

copyBtn.addEventListener("click", function() {
    const text = output.textContent;
    if (!text || text.includes("⬇ Результат")) {
        setStatus("❌ Нет данных для копирования", "error");
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        setStatus("✅ Скопировано!", "success");
        setTimeout(() => setStatus("Готов к работе", "idle"), 2000);
    }).catch(() => {
        const range = document.createRange();
        range.selectNode(output);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand("copy");
        setStatus("✅ Скопировано!", "success");
    });
});

downloadBtn.addEventListener("click", function() {
    const text = output.textContent;
    if (!text || text.includes("⬇ Результат")) {
        setStatus("❌ Нет данных для скачивания", "error");
        return;
    }
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "obfuscated_" + Date.now() + ".lua";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus("💾 Файл скачан!", "success");
});

function setStatus(text, type) {
    statusText.textContent = text;
    statusDot.className = "dot " + type;
}

function setLoading(text) {
    statusText.textContent = text;
    statusDot.className = "dot loading";
}

function startTimer() {
    startTime = performance.now();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        timerDisplay.textContent = "⏱ " + elapsed.toFixed(2) + "с";
    }, 50);
}

function stopTimer() {
    clearInterval(timerInterval);
    const elapsed = (performance.now() - startTime) / 1000;
    timerDisplay.textContent = "⏱ " + elapsed.toFixed(2) + "с";
}

let progressInterval = null;

function startProgress() {
    let progress = 0;
    progressBar.style.width = "0%";
    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        progress += Math.random() * 3 + 1;
        if (progress > 90) progress = 90;
        progressBar.style.width = progress + "%";
    }, 200);
}

function finishProgress() {
    clearInterval(progressInterval);
    progressBar.style.width = "100%";
    setTimeout(() => { progressBar.style.width = "0%"; }, 500);
}

obfuscateBtn.addEventListener("click", async function() {
    const code = inputCode.value.trim();
    if (!code) {
        setStatus("❌ Вставь код!", "error");
        return;
    }
    if (isProcessing) return;
    isProcessing = true;
    obfuscateBtn.disabled = true;
    obfuscateBtn.textContent = "⏳ ОБРАБОТКА...";
    if (!csrfToken) await getCSRFToken();
    loaderOverlay.classList.add("active");
    loaderText.textContent = "🔒 Обфускация кода...";
    startProgress();
    setLoading("⏳ Обфускация...");
    startTimer();

    try {
        const level = parseInt(levelSelect.value);
        const keys = parseInt(keysSelect.value);
        const junk = parseInt(junkSelect.value);
        const protection = parseInt(protectionSelect.value);
        const vm = parseInt(vmSelect.value);
        const antiDebug = parseInt(antiDebugSelect.value);

        const response = await fetch("/obfuscate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken || ""
            },
            body: JSON.stringify({
                code: code,
                options: {
                    level: level,
                    keys: keys,
                    junk: junk,
                    protection: protection,
                    vm: vm === 1,
                    antiDebug: antiDebug === 1
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Ошибка сервера");
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        output.textContent = data.result;
        outputCount.textContent = data.result.length + " символов";
        finishProgress();
        stopTimer();
        setStatus("✅ Обфускация завершена!", "success");
        loaderText.textContent = "✅ Готово!";
        setTimeout(() => { loaderOverlay.classList.remove("active"); }, 600);

    } catch (err) {
        finishProgress();
        stopTimer();
        output.textContent = "❌ Ошибка: " + err.message;
        outputCount.textContent = "0 символов";
        setStatus("❌ " + err.message, "error");
        loaderText.textContent = "❌ Ошибка: " + err.message;
        setTimeout(() => { loaderOverlay.classList.remove("active"); }, 1500);
    }

    isProcessing = false;
    obfuscateBtn.disabled = false;
    obfuscateBtn.textContent = "🔒 OBFUSCATE";
});

document.addEventListener("keydown", function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        obfuscateBtn.click();
    }
});

setInterval(async function() {
    try {
        const response = await fetch("/health");
        const data = await response.json();
        if (data.status === "compromised") {
            document.body.innerHTML = `
                <div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#0a0a12;color:#ff4466;font-family:monospace;font-size:24px;flex-direction:column;gap:20px;">
                    <span>⚠️ SECURITY BREACH DETECTED</span>
                    <span style="font-size:14px;color:#6666aa;">Сайт был скомпрометирован. Доступ заблокирован.</span>
                </div>
            `;
        }
    } catch {}
}, 30000);

console.log("⚡ LuaScator Web v25.0 загружен!");
console.log("🔒 Анти-тампер защита: ВКЛЮЧЕНА");
console.log("📌 Горячая клавиша: Ctrl+Enter для обфускации");
