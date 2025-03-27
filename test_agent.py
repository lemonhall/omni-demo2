import os
import sys
import base64
from pathlib import Path
from audio_agent import audio_agent

def test_process_audio():
    """测试音频处理功能"""
    # 创建一个简单的测试文本文件
    test_content = "这是一段测试文本，模拟音频数据。"
    test_file_path = Path("test_audio.txt")
    
    with open(test_file_path, "w", encoding="utf-8") as f:
        f.write(test_content)
    
    try:
        # 读取测试文件
        with open(test_file_path, "rb") as f:
            audio_data = f.read()
        
        print(f"读取测试文件：{test_file_path}，大小：{len(audio_data)} 字节")
        
        # 调用处理函数
        print("正在处理音频...")
        result = audio_agent.process_audio(audio_data)
        
        # 输出结果
        print("\n--- 处理结果 ---")
        print(f"文本回复: {result['text']}")
        
        if result["audio"]:
            print(f"收到音频回复，大小: {len(result['audio'])} 字节")
            
            # 保存回复音频
            reply_file = Path("reply.wav")
            with open(reply_file, "wb") as f:
                f.write(result["audio"])
            print(f"已将回复音频保存至：{reply_file}")
        
        if result["usage"]:
            print(f"用量统计: {result['usage']}")
            
        print("测试完成")
        
        # 清理测试文件
        test_file_path.unlink(missing_ok=True)
        
        return True
    except Exception as e:
        print(f"测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # 确保设置了API密钥
    if not os.getenv("DASHSCOPE_API_KEY"):
        print("错误: 未设置DASHSCOPE_API_KEY环境变量")
        print("请先设置环境变量后再运行测试")
        print("例如: export DASHSCOPE_API_KEY=your_api_key_here")
        sys.exit(1)
    
    test_process_audio() 