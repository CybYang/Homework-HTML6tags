// ai-context-menu.js
class AIContextMenu extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: none;
                    position: absolute;
                    background: white;
                    border: 1px solid #ccc;
                    border-radius: 5px;
                    box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
                    padding: 5px;
                    z-index: 1000;
                }
                .menu-item {
                    padding: 8px 12px;
                    cursor: pointer;
                    font-size: 14px;
                }
                .menu-item:hover {
                    background: #f0f0f0;
                }
            </style>
            <div class="menu-item" data-action="chat">💬 聊天</div>
        `;
        this.selectedText = "";
    }

    connectedCallback() {
        document.addEventListener("mouseup", (event) => this.handleSelection(event));
        document.addEventListener("click", (event) => this.handleOutsideClick(event));
        this.shadowRoot.querySelectorAll(".menu-item").forEach(item => {
            item.addEventListener("click", (event) => this.handleMenuClick(event));
        });
    }

    handleSelection(event) {
        setTimeout(() => {
            const selection = window.getSelection();
            const text = selection.toString().trim();

            if (text) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                this.showMenu(rect.left + window.scrollX, rect.bottom + window.scrollY);
                this.selectedText = text;
            }
        }, 50);
    }

    showMenu(x, y) {
        this.style.display = "block";
        this.style.left = `${x}px`;
        this.style.top = `${y}px`;
    }

    hideMenu() {
        this.style.display = "none";
    }

    handleOutsideClick(event) {
        if (!this.contains(event.target)) {
            this.hideMenu();
        }
    }

    handleMenuClick(event) {
        const action = event.target.getAttribute("data-action");
        if (!this.selectedText) return;

        if (action === "chat") {
            // 获取聊天组件实例
            const chat = document.querySelector("ai-chat");
            if (chat) {
                // 预填充选中文本到输入框
                chat.prefillWithSelection(this.selectedText);
                chat.show(); // 显示聊天框
            }
        } else {
            const element = document.querySelector(`ai-${action}`);
            if (element) element[action](this.selectedText);
        }

        this.hideMenu();
    }
}

class AiChat extends HTMLElement {
    constructor() {
        super();
        // 绑定事件处理器以便后续移除
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundMouseUp = this.handleMouseUp.bind(this);

        this.attachShadow({ mode: "open" });
        this.history = JSON.parse(localStorage.getItem("aiChatHistory")) || [];
        // 新增拖动相关变量
        this.isDragging = false;
        this.offsetX = 0;
        this.offsetY = 0;
        this.render();
    }

    disconnectedCallback() {
        // 清理全局样式
        document.documentElement.style.cssText = '';
        // 移除残留的事件监听器
        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseup', this.boundMouseUp);
    }

    show() {
        const chatBox = this.shadowRoot.getElementById("ai-chat-box");
        chatBox.style.display = "flex"; // 确保与初始样式一致
    }

    prefillWithSelection(text) {
        const input = this.shadowRoot.getElementById("ai-input");
        input.placeholder = `关于 "${text}" 的提问...`; 
        this.dataset.selection = text; // 存储引用
        this.loadRecommendedQuestions(text); 
    }

    async ask(message) { // 仍然使用 message 参数
        const chatBox = this.shadowRoot.getElementById("ai-chat-box");
        const aiQuote = this.shadowRoot.getElementById("ai-quote");
        const aiResponse = this.shadowRoot.getElementById("ai-response");
        let timeoutId;

        // 显示引用但不污染 message
        if (this.dataset.selection) {
            aiQuote.textContent = `引用内容: "${this.dataset.selection}"`; 
            aiQuote.style.display = "block";
        }

        this.addMessage(message, "user");
    
        // 每次提问强制重置状态
        aiResponse.style.display = "block";
        aiResponse.textContent = "AI 正在思考中...";
        aiResponse.style.opacity = "1";
        chatBox.style.display = "block";
    
        try {
            // 设置超时
            timeoutId = setTimeout(() => {
                aiResponse.textContent = "请求超时，请重试";
            }, 5000);
    
            // 发送结构化参数
            const reply = await this.fetchAiResponse({
                question: message,
                reference: this.dataset.selection || ""
            });
    
            // 更新界面
            aiResponse.style.opacity = "0";
            setTimeout(() => {
                aiResponse.style.display = "none";
                this.addMessage(reply, "ai");
            }, 300); // 等待渐隐动画完成

            this.saveToHistory(message, reply);
            this.loadHistory();
    
        } catch (error) {
            clearTimeout(timeoutId);
            aiResponse.textContent = `错误: ${error.message}`;
            setTimeout(() => {
                aiResponse.style.opacity = "0";
                aiResponse.style.display = "none";
            }, 2000);
        } finally {
            clearTimeout(timeoutId);
            delete this.dataset.selection;
        }
    }

    addMessage(text, sender) {
        const messageElement = document.createElement("div");
        messageElement.className = `message ${sender}`;
        messageElement.innerHTML = `
            <div class="message-bubble">${text}</div>
        `;
        
        // 使用专用消息列表容器
        const messageList = this.shadowRoot.getElementById("message-list");
        
        // 安全插入方式（兼容空列表情况）
        if (messageList.children.length > 0) {
            messageList.insertBefore(messageElement, messageList.firstChild);
        } else {
            messageList.appendChild(messageElement);
        }

        setTimeout(() => {
            try {
                const scrollContainer = this.shadowRoot.getElementById("scroll-container");
                // 两种滚动策略确保兼容性
                scrollContainer.scrollTo({
                    top: messageElement.offsetTop,
                    behavior: 'smooth'
                });
                
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            } catch (error) {
                console.error("滚动错误:", error);
            }
        }, 50); // 50ms 延迟足够 DOM 更新

    }

    async fetchAiResponse(params) {
        try 
        {
            // 在 fetch 前添加验证
            console.log("Endpoint URL:", "http://127.0.0.1:5000/api/chat");
            console.log("Request Body:", JSON.stringify(params));
            const response = await fetch("http://127.0.0.1:5000/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(params),
                signal: AbortSignal.timeout(5000)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP错误 ${response.status}`);
            }

            const data = await response.json();
            if (!data.reply) throw new Error("无效的响应格式");

            return data.reply || "AI 无法回答你的问题";
        } 
        catch (error) 
        {
            console.error("API请求失败详情:", {
                message: error.message,
                stack: error.stack,
                type: error.name
            });
            throw error; // 向上传递错误
        }
    }

    handleMouseDown(e) {
        this.isDragging = true;
        const chatBox = this.shadowRoot.getElementById("ai-chat-box");
        const rect = chatBox.getBoundingClientRect();
        
        // 转换定位方式为 left/top
        chatBox.style.left = `${rect.left}px`;
        chatBox.style.top = `${rect.top}px`;
        chatBox.style.right = 'auto';
        chatBox.style.bottom = 'auto';
        
        this.offsetX = e.clientX - rect.left;
        this.offsetY = e.clientY - rect.top;

        document.addEventListener('mousemove', this.boundMouseMove);
        document.addEventListener('mouseup', this.boundMouseUp);
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            document.documentElement.style.userSelect = 'none'; // 防止拖动时选中文字
            document.documentElement.style.cursor = 'move';     // 统一光标样式
        } 
        if (!this.isDragging) return;
        const chatBox = this.shadowRoot.getElementById("ai-chat-box");
        
        if (e.buttons !== 1) {
            this.handleMouseUp();
            return;
        }

        // 计算边界限制
        const newX = e.clientX - this.offsetX;
        const newY = e.clientY - this.offsetY;
        const maxX = window.innerWidth - chatBox.offsetWidth;
        const maxY = window.innerHeight - chatBox.offsetHeight;
        
        chatBox.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
        chatBox.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
    }

    handleMouseUp() {
        this.isDragging = false;
        //恢复鼠标样式
        document.documentElement.style.cursor = ''; 
        document.documentElement.style.userSelect = '';


        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseup', this.boundMouseUp);
    }

    render() {
        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="./style.css">
            <div id="ai-chat-box">
                <div class="drag-handle"></div>
                <div id="ai-header">
                    <div style="position: relative; z-index: 22;">
                        AI 助手
                        <button class="history-toggle">📜历史记录</button>
                    </div>
                    <button id="close-btn">×</button>
                </div>
                <!-- 新增历史面板 -->
                <div class="history-panel">
                    <div id="ai-history"></div>
                    <div class="history-header">
                        <h4>对话历史</h4>
                        <input id="search-input" placeholder="🔍搜索历史记录">
                        <button class="clear-history">清空</button>
                    </div>
                    <div id="history-content"></div>
                </div>
                <div id="scroll-container">
                
                    <div id="ai-content">
                        <div id="ai-quote" class="ai-quote"></div>
                        <div id="ai-recommend"></div>
                        <p id="ai-response"></p>
                    </div>

                    <!-- 新增消息容器 -->
                    <div id="message-container">
                        <div id="message-list"></div>
                    </div>

                    <div id="ai-input-container">
                        <input type="text" id="ai-input" placeholder="输入问题...">
                        <button id="ai-send-btn">发送</button>
                    </div>
                </div>

                <!-- 调整手柄 -->
                ${['left', 'right', 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right']
                    .map(dir => `<div class="resize-handle" data-direction="${dir}"></div>`)
                    .join('')}
            </div>
        `;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const chatBox = this.shadowRoot.getElementById("ai-chat-box");
        const closeBtn = this.shadowRoot.getElementById("close-btn");
        const sendBtn = this.shadowRoot.getElementById("ai-send-btn");
        const inputField = this.shadowRoot.getElementById("ai-input");
        const dragHandle = this.shadowRoot.querySelector('.drag-handle');


        // 历史记录切换按钮
        const historyToggle = this.shadowRoot.querySelector('.history-toggle');
        const historyPanel = this.shadowRoot.querySelector('.history-panel');

        historyToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            historyPanel.classList.toggle('active');
        });

         // 点击外部关闭历史面板
        document.addEventListener('click', (e) => {
            if (!historyPanel.contains(e.target)) {
                historyPanel.classList.remove('active');
            }
        });

        // 新增拖动事件监听
        dragHandle.addEventListener('mousedown', this.handleMouseDown.bind(this));

        // 关闭功能
        closeBtn.onclick = () => chatBox.style.display = "none";

        // 发送消息
        sendBtn.onclick = () => {
            const message = inputField.value.trim();
            if (message) {
                this.ask(message); // 传递纯净问题
                inputField.value = "";
            }
        };

        // 回车发送
        inputField.addEventListener("keypress", (e) => {
            if (e.key === "Enter") sendBtn.click();
        });

        // 在历史面板添加搜索框
        const historyHeader = this.shadowRoot.querySelector('.history-header');
        const searchInput = this.shadowRoot.getElementById('search-input');
        
        // 插入到清空按钮前
        const clearBtn = historyHeader.querySelector('.clear-history');
        
        if (clearBtn) {
            historyHeader.insertBefore(searchInput, clearBtn);
        } else {
            historyHeader.appendChild(searchInput);
        }

        // 阻止搜索框点击事件冒泡
        searchInput.addEventListener('click', (e) => {
            e.stopPropagation(); 
        });

        // 搜索功能
        searchInput.addEventListener('input', (e) => {
            this.filterHistory(e.target.value);
        });

        // 清空历史按钮
        clearBtn.addEventListener('click', () => {
            if (confirm('确定要清空所有历史记录吗？')) {
                localStorage.removeItem("aiChatHistory");
                this.history = [];
                this.loadHistory();
                this.showToast('已清空历史记录');
            }
        });

        // 调整大小逻辑
        this.shadowRoot.querySelectorAll(".resize-handle").forEach(handle => {
            handle.addEventListener("mousedown", (e) => {
                e.preventDefault();
                const direction = e.target.dataset.direction;
                const startX = e.clientX;
                const startY = e.clientY;
                const startWidth = chatBox.offsetWidth;
                const startHeight = chatBox.offsetHeight;
                const startLeft = chatBox.offsetLeft;
                const startTop = chatBox.offsetTop;

                const mouseMoveHandler = (e) => {
                    const deltaX = e.clientX - startX;
                    const deltaY = e.clientY - startY;

                    let newWidth = startWidth;
                    let newHeight = startHeight;
                    let newLeft = startLeft;
                    let newTop = startTop;

                    switch (direction) {
                        case "left":
                            newWidth = Math.max(300, startWidth - deltaX);
                            newLeft = startLeft + deltaX;
                            break;
                        case "right":
                            newWidth = Math.max(300, startWidth + deltaX);
                            break;
                        case "top":
                            newHeight = Math.max(200, startHeight - deltaY);
                            newTop = startTop + deltaY;
                            break;
                        case "bottom":
                            newHeight = Math.max(200, startHeight + deltaY);
                            break;
                        case "top-left":
                            newWidth = Math.max(300, startWidth - deltaX);
                            newLeft = startLeft + deltaX;
                            newHeight = Math.max(200, startHeight - deltaY);
                            newTop = startTop + deltaY;
                            break;
                        case "top-right":
                            newWidth = Math.max(300, startWidth + deltaX);
                            newHeight = Math.max(200, startHeight - deltaY);
                            newTop = startTop + deltaY;
                            break;
                        case "bottom-left":
                            newWidth = Math.max(300, startWidth - deltaX);
                            newLeft = startLeft + deltaX;
                            newHeight = Math.max(200, startHeight + deltaY);
                            break;
                        case "bottom-right":
                            newWidth = Math.max(300, startWidth + deltaX);
                            newHeight = Math.max(200, startHeight + deltaY);
                            break;
                    }

                    chatBox.style.width = `${newWidth}px`;
                    chatBox.style.height = `${newHeight}px`;
                    chatBox.style.left = `${newLeft}px`;
                    chatBox.style.top = `${newTop}px`;
                };

                const mouseUpHandler = () => {
                    document.removeEventListener("mousemove", mouseMoveHandler);
                    document.removeEventListener("mouseup", mouseUpHandler);
                };

                document.addEventListener("mousemove", mouseMoveHandler);
                document.addEventListener("mouseup", mouseUpHandler);
            });
        });
    }


    // 渲染方法修改
    renderHistory(items) {
        const container = this.shadowRoot.getElementById('history-content');
        if (!container) {
            console.error('错误: 找不到 #history-content 容器');
            return;
        }
    
        container.innerHTML = items.map(entry => `
            <div class="history-item">
                <div class="question" title="点击重新提问">${entry.question}</div>
                <div class="answer">${entry.answer}</div>
            </div>
        `).join('');
        // 在历史项渲染后添加事件监听
        container.querySelectorAll('.question').forEach(questionElem => {
            questionElem.addEventListener('click', () => {
                const input = this.shadowRoot.getElementById('ai-input');
                input.value = questionElem.textContent;
                input.focus();
            });
        });
    }

    // 筛选过滤
    filterHistory(keyword = '') {
        const searchTerm = keyword.trim().toLowerCase();
    
        // 空搜索时显示全部
        if (!searchTerm) {
            this.renderHistory(this.history);
            return;
        }
    
        // 同时搜索问题和回答
        const filtered = this.history.filter(entry => {
            return entry.question.toLowerCase().includes(searchTerm) ||
                   entry.answer.toLowerCase().includes(searchTerm);
        });
        
        this.renderHistory(filtered);
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            z-index: 9999; /* 确保在最上层显示 */
        `;
        document.body.appendChild(toast); // 添加到页面
        setTimeout(() => toast.remove(), 2000); // 2秒后移除
    }

    saveToHistory(question, answer) {
        this.history.push({
            question,
            answer,
            context: this.dataset.selection // 保存引用上下文
        });
        localStorage.setItem("aiChatHistory", JSON.stringify(this.history));
        this.loadHistory();
    }

    loadHistory() {
        // 历史记录加载方法
        const historyPanel = this.shadowRoot.querySelector('.history-panel');
        const historyContent = this.shadowRoot.getElementById('ai-history');
        
        // 清空旧内容
        historyContent.innerHTML = '';

        this.history.slice(-10).forEach(entry => { // 10条
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-question">${entry.question}</div>
                <div class="history-answer">${entry.answer}</div>
            `;
            historyContent.appendChild(item);
        });

        // 自动滚动到底部
        historyPanel.scrollTop = historyPanel.scrollHeight;
    }

    loadRecommendedQuestions(selectedText) {
        const aiRecommend = this.shadowRoot.getElementById("ai-recommend");
        aiRecommend.innerHTML = "<div style='color: #666; margin-bottom: 8px;'>相关问题</div>";
        [
            `解释：『${selectedText}』`,
            `『${selectedText}』的应用场景`,
            `如何实现『${selectedText}』？`,
            `『${selectedText}』的最佳实践`
        ].forEach(question => {
            const elem = document.createElement("div");
            elem.className = "recommend-question";
            elem.textContent = question;
            elem.onclick = () => this.ask(question);
            aiRecommend.appendChild(elem);
        });
    }
}

// 注册组件
customElements.define("ai-context-menu", AIContextMenu);
customElements.define("ai-chat", AiChat);