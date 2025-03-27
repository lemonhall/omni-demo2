# 语音交互演示项目

这个项目展示了如何使用大型语言模型（LLM）处理音频并生成文本和音频回复。项目使用了以下技术：

- 后端：Python，Agno框架，FastAPI
- 前端：HTML，JavaScript，CSS
- 模型：Qwen-Omni-Turbo（通过DashScope API）

## 项目结构

```
omni-demo2/
├── audio_agent.py       # Agno框架封装的音频处理Agent
├── api_server.py        # FastAPI服务器
├── static/              # 静态文件
│   ├── index.html       # 演示页面
│   └── js/              # JavaScript文件
│       └── audio-client.js  # 前端处理库
└── welcome.mp3          # 测试音频文件
```

## 安装依赖

```bash
# 创建虚拟环境（可选）
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
```

## 启动服务器

```bash
# 启动API服务器
python api_server.py
```

服务器将在 http://localhost:8000 启动，您可以通过浏览器访问前端演示页面：http://localhost:8000/static/index.html

## API接口

### 处理上传的音频文件

**POST /process-audio**

表单参数：
- `audio_file`: 音频文件（必需）
- `prompt`: 发送给模型的文本提示（默认："这段音频在说什么"）
- `return_audio`: 是否返回音频回复（布尔值，默认：true）

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
