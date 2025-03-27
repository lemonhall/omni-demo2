# 语音交互演示项目

这个项目展示了如何使用大型语言模型（LLM）处理音频并生成文本和音频回复。项目使用了以下技术：

- 后端：Python，Agno框架，FastAPI
- 前端：HTML，JavaScript，CSS
- 模型：Qwen-Omni-Turbo（通过DashScope API）
- 音频处理：PyAudio，SoundFile

## 项目结构

```
omni-demo2/
├── audio_agent.py       # Agno框架封装的音频处理Agent
├── api_server.py        # FastAPI服务器
├── static/              # 静态文件
│   ├── index.html       # 演示页面
│   └── js/              # JavaScript文件
│       └── audio-client.js  # 前端处理库
├── requirements.txt     # 项目依赖
├── pyproject.toml       # 项目配置
└── welcome.mp3          # 测试音频文件
```

## 开发环境设置

1. 确保已安装 Python 3.8 或更高版本
2. 安装项目依赖：

```bash
# 创建虚拟环境（推荐）
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# 或者
.venv\Scripts\activate     # Windows

# 安装依赖
pip install -e .
```

## 环境变量

您需要设置以下环境变量：

```bash
# DashScope API密钥
export DASHSCOPE_API_KEY=your_api_key_here

# 可选：设置服务器端口（默认8000）
export PORT=8000
```

## 启动服务器

```bash
# 启动API服务器
python api_server.py
```

服务器将在 http://localhost:8000 启动，您可以通过浏览器访问前端演示页面：http://localhost:8000/static/index.html

## API接口

### 处理上传的音频文件

**POST /process_audio**

请求体：
```json
{
    "audio_data": "base64编码的音频数据",
    "text_prompt": "发送给模型的文本提示（可选，默认：'这段音频在说什么'）"
}
```

响应：
```json
{
    "text": "模型生成的文本回复",
    "audio": "base64编码的音频回复（如果请求中包含）",
    "usage": {
        "prompt_tokens": 100,
        "completion_tokens": 50
    }
}
```

### 健康检查

**GET /health**

返回服务器状态信息。

## 前端库使用

```javascript
// 初始化客户端
const audioClient = new AudioClient({
    apiUrl: 'http://localhost:8000',
    debug: true
});

// 开始录音
await audioClient.startRecording();

// 停止录音
const audioBlob = await audioClient.stopRecording();

// 处理音频
const result = await audioClient.processAudio(audioBlob, {
    prompt: '这段音频在说什么',
    returnAudio: true
});

// 播放回复音频
if (result.audio) {
    await audioClient.playAudio(result.audio);
}

// 或者使用一站式API
audioClient.recordAndProcess({
    prompt: '这段音频在说什么',
    returnAudio: true,
    autoPlay: true,
    duration: 5000, // 自动录制5秒
    onStart: () => console.log('开始录音'),
    onStop: () => console.log('停止录音'),
    onProcessing: () => console.log('处理中'),
    onResult: (result) => console.log('结果:', result)
});
```

## 注意事项

1. 浏览器需要支持MediaRecorder API
2. 需要获取麦克风权限
3. 建议使用现代浏览器（Chrome、Firefox、Edge等）
4. 在生产环境中，请确保使用HTTPS
5. 音频文件大小限制：建议不超过10MB
6. 支持的音频格式：WAV、MP3、OGG等常见格式
7. 确保网络连接稳定，因为需要与DashScope API通信

## 调试

1. 查看服务器日志：
```bash
# 设置日志级别
export LOG_LEVEL=DEBUG
python api_server.py
```

2. 使用浏览器开发者工具查看网络请求和响应
3. 检查浏览器控制台是否有错误信息

## 常见问题

1. 如果遇到麦克风权限问题，请确保：
   - 浏览器已获得麦克风访问权限
   - 系统设置中允许浏览器访问麦克风

2. 如果音频处理失败，请检查：
   - 网络连接是否正常
   - API密钥是否正确设置
   - 音频文件格式是否支持
   - 音频文件大小是否在限制范围内
