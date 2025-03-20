// ai-enhance.js
class AIEnhance extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            .enhance-menu {
                position: fixed;
                background: rgba(255, 255, 255, 0.95);
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                padding: 8px;
                z-index: 1000;
                backdrop-filter: blur(4px);
                border: 1px solid rgba(0, 0, 0, 0.1);
            }

            .button-group {
                display: flex;
                gap: 8px;
            }

            .enhance-btn {
                display: inline-flex;
                align-items: center;
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
                gap: 8px;
                font-family: -apple-system, sans-serif;
            }

            .enhance-btn::before {
                font-family: "Font Awesome 5 Free";
                font-weight: 900;
                font-size: 14px;
            }

            /* 增强按钮 */
            .enhance-btn:not(.cancel-btn) {
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                color: white;
            }

            .enhance-btn:not(.cancel-btn):hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(99, 102, 241, 0.3);
            }

            /* 撤销按钮 */
            .cancel-btn {
                background: linear-gradient(135deg, #f43f5e 0%, #ef4444 100%);
                color: white;
            }

            .cancel-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(244, 63, 94, 0.3);
            }

            /* 图标 */
            .enhance-btn:not(.cancel-btn)::before {
                content: "\\f0d0"; 
            }

            .cancel-btn::before {
                content: "\\f2ea"; 
            }

            /* 点击动画 */
            .enhance-btn:active {
                transform: scale(0.98);
            }
        `;
        
        // 创建元素结构
        const slot = document.createElement('slot');
        this.menu = document.createElement('div');
        this.menu.className = 'enhance-menu';
        this.menu.hidden = true;

        // 创建按钮
        const enhanceBtn = document.createElement('button');
        enhanceBtn.className = 'enhance-btn';
        enhanceBtn.textContent = 'AI增强';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'enhance-btn cancel-btn';
        cancelBtn.textContent = '撤销增强';

        // 按钮容器
        this.buttonGroup = document.createElement('div');
        this.buttonGroup.className = 'button-group';
        this.buttonGroup.append(enhanceBtn, cancelBtn);
        this.menu.append(this.buttonGroup);

        // 添加事件监听
        enhanceBtn.onclick = () => this.enhanceImage();
        cancelBtn.onclick = () => this.restoreImage();
        this.handleContextMenu = this.handleContextMenu.bind(this);
        this.hideMenu = this.hideMenu.bind(this);

        // 初始化元素
        this.shadowRoot.append(style,this.menu, slot);
        this.addEventListener('contextmenu', this.handleContextMenu);

        // 初始化原始数据
        this.original = {
            src: null,
            blob: null
        };
    }

    connectedCallback() {
        // 确保图片元素存在
        this.img = this.querySelector('img');
        if (!this.img) {
            console.error('<ai-enhance> 必须包含一个<img>元素');
            return;
        }
        // 保存原始引用
        this.original.src = this.img.src;
    }

    restoreImage() {
        if (!this.img) return;
        
        if (this.original.blob) {
            this.img.src = URL.createObjectURL(this.original.blob);
        } else {
            this.img.src = this.original.src;
        }
        this.hideMenu();
    }

    handleContextMenu(e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            this.showMenu(e.clientX, e.clientY);
            document.addEventListener('click', this.hideMenu, { once: true });
        }
    }

    showMenu(x, y) {
        this.menu.style.left = `${x}px`;
        this.menu.style.top = `${y}px`;
        this.menu.hidden = false;
    }

    hideMenu() {
        this.menu.hidden = true;
    }

    async enhanceImage() {
        if (!this.img) return;
        
        try {
            const processed = await this.processImage();
            this.img.src = processed;
            this.hideMenu();
        } catch (err) {
            console.error('增强失败:', err);
        }
    }

    async processImage() {
        // 获取当前图片的源数据（可能是原始图片或增强后的图片）
        const response = await fetch(this.img.src);
        const currentBlob = await response.blob();

        // 如果是第一次增强，保存原始Blob
        if (!this.original.blob) {
            const originalResponse = await fetch(this.original.src);
            this.original.blob = await originalResponse.blob();
        }

        // 发送到后端处理
        const formData = new FormData();
        formData.append('image', currentBlob, 'image.jpg');
        
        const res = await fetch('http://localhost:5000/enhance', {
            method: 'POST',
            body: formData
        });
        
        return URL.createObjectURL(await res.blob());
    }
}

customElements.define('ai-enhance', AIEnhance);