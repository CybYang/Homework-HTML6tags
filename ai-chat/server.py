from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# AI 回应处理器
def ai_reply(query_data):
    # 解析结构化参数
    main_question = query_data.get("question", "").strip()
    reference = query_data.get("reference", "").strip()

    # 预设问答库（保持原始大小写）
    response_map = {
        "你好": "您好！我是您的AI助手，有什么可以帮您？",
        "你是谁": "我是基于深度学习的智能对话系统",
        "你能做什么": "我可以：\n1. 回答预设问题\n2. 分析引用内容\n3. 提供智能建议",
        "再见": "感谢使用！期待再次为您服务！"
    }
    
    # 优先匹配纯净问题（精确匹配）
    if main_question in response_map:
        return {
            "reply": response_map[main_question],
            "question_type": "preset"
        }
    
    # 处理含上下文的扩展问题
    if reference:
        return {
            "reply": f"您引用了内容『{reference}』，以下是对『{main_question}』的回答：\n ...",
            "question_type": "contextual"
        }
    
    # 降级处理
    return {
        "reply": "能请您再详细描述一下问题吗？",
        "question_type": "fallback"
    }

@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        print("收到请求数据:", data)

        # 校验请求格式
        if not data or "question" not in data:  # 接收 question 字段
            return jsonify({"error": "无效请求格式"}), 400

        # 获取结构化参数
        question = data["question"].strip()
        reference = data.get("reference", "").strip()  # 可选字段
        
        # 处理请求并生成响应
        response = ai_reply({
            "question": question,
            "reference": reference
        })
        
        print("返回响应:", response)
        return jsonify(response)

    except Exception as e:
        print("服务器错误:", str(e))
        return jsonify({
            "error": "服务器处理请求时发生错误",
            "details": str(e)
        }), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)