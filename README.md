# HTML6 自定义标签设计大作业

## 项目简介
本项目基于模拟的HTML6标准设计了三个创新型自定义标签，结合后端Flask服务实现AI增强交互功能。由于 `ai-chat` 与  `ai-enhance` 涉及到两个服务器，故分两个文件夹上传。

包含以下核心组件：
- `ai-contextmenu`：上下文AI工具菜单
- `ai-chat`：智能对话系统
- `ai-enhance`：图像增强处理器

## 功能说明

### 🖱️ ai-contextmenu 标签
- 文本选择触发智能菜单
- 提供AI工具链快速访问
- 右键菜单样式深度定制

### 💬 ai-chat 标签
- 上下文感知对话系统
- 功能特性：
  - 可拖拽/缩放的对话窗口
  - 对话历史持久化存储（LocalStorage）
  - 智能内容自适应布局
  - 后端模拟AI响应（Flask）

### 🖼️ ai-enhance 标签
- 图像增强处理系统
- 核心功能：
  - 右键触发图像增强
  - 处理效果实时预览
  - 操作历史堆栈管理
  - 独立后端处理服务

## 环境依赖
- Python 3.8+
- Flask 2.0+
- 现代浏览器（Chrome 90+/Firefox 85+）

## 🚀 快速开始

### 服务端部署
```bash
# 安装依赖
pip install flask

# 启动AI对话服务
cd ai-chat/
python server.py

# 启动图像增强服务（新终端）
cd ../ai-enhance/
python server.py
