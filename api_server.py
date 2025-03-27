import os
import base64
import uvicorn
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Optional
from pydantic import BaseModel
import logging

from audio_agent import audio_agent

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="音频处理API", description="处理音频并通过大模型获取回复的API服务")

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该限制为特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件
app.mount("/static", StaticFiles(directory="static"), name="static")

class AudioRequest(BaseModel):
    audio_data: str
    text_prompt: str = "这段音频在说什么"

@app.post("/process_audio")
async def process_audio(request: AudioRequest):
    try:
        # 解码base64音频数据
        audio_bytes = base64.b64decode(request.audio_data)
        logger.info(f"收到音频数据，大小: {len(audio_bytes)} 字节")
        
        # 处理音频
        result = audio_agent.process_audio(audio_bytes, request.text_prompt)
        logger.info(f"处理结果: 文本长度={len(result['text'])}, 音频数据={'存在' if result.get('audio') else '不存在'}")
        
        # 构建响应
        response = {
            "text": result["text"],
            "audio": result.get("audio"),  # 直接使用agent返回的base64音频数据
            "usage": result.get("usage")
        }
        
        # 记录响应信息
        if response["audio"]:
            audio_size = len(response["audio"])
            logger.info(f"返回音频数据，base64大小: {audio_size} 字节")
        else:
            logger.info("没有音频数据返回")
            
        return response
        
    except Exception as e:
        logger.error(f"处理音频时出错: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy"}

@app.get("/")
async def redirect_to_index():
    """重定向到前端页面"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/static/index.html")

if __name__ == "__main__":
    # 获取端口，默认为8000
    port = int(os.environ.get("PORT", 8000))
    
    # 启动服务器
    uvicorn.run(app, host="0.0.0.0", port=port) 